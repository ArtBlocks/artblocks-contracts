// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Picks one live token per dependency to verify the rollout against.
 *
 * The set is discovered on chain rather than hand-listed, so coverage follows
 * whatever dependencies a network actually has — which is what makes the same
 * verification meaningful on sepolia, where the interesting projects are not
 * known in advance.
 *
 * Discovery is slow enough to be worth caching, and the cache is keyed by
 * network. Delete the file to re-discover.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "deployments",
  "generator",
  "rollout-baselines"
);

/** Bounds discovery on networks with thousands of projects. */
const MAX_PROJECT_LOOKUPS = 40000;
/**
 * Per-core bound. Engine cores number their projects from a large offset — one
 * mainnet core reports a `nextProjectId` of 2,024,001 — so an unbounded walk of a
 * single core can consume the whole budget on IDs that do not exist.
 */
const MAX_LOOKUPS_PER_CORE = 700;
const CONCURRENCY = 25;

/**
 * Projects to include regardless of what discovery finds. Discovery walks cores
 * largest-first, which surfaces the older dependencies quickly, but a dependency
 * used by a single project on a single core can still be missed — and `custom@na`
 * is one of the behaviors most worth checking.
 */
const SEED_PROJECTS: Record<
  string,
  { core: string; projectId: number; tokenId: string }[]
> = {
  mainnet: [
    // Quine — a complete HTML document, injected verbatim.
    {
      core: "0xab00000000002ade39f58f9d8278a31574ffbe77",
      projectId: 506,
      tokenId: "506000239",
    },
    // Gas Wars — the ES module project this rollout exists to fix.
    {
      core: "0xab00000000002ade39f58f9d8278a31574ffbe77",
      projectId: 505,
      tokenId: "505000000",
    },
  ],
};

const REGISTRY_ABI = [
  "function getDependencyNamesAndVersions() view returns (string[])",
  "function getSupportedCoreContracts() view returns (address[])",
  "function getDependencyNameAndVersionForProject(address, uint256) view returns (string)",
];

const CORE_ABI = [
  "function nextProjectId() view returns (uint256)",
  "function startingProjectId() view returns (uint256)",
  // @dev ownerOf rather than a project-state getter: it is the one way to prove a
  // token exists that works across every core version, and the pre-V3 cores are
  // where the oldest dependencies live.
  "function ownerOf(uint256) view returns (address)",
];

export type CheckProject = {
  dependency: string;
  core: string;
  projectId: number;
  tokenId: string;
};

function cachePath(networkName: string): string {
  return path.join(CACHE_DIR, `${networkName}-checks.json`);
}

async function inBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    results.push(
      ...(await Promise.all(items.slice(i, i + CONCURRENCY).map(worker)))
    );
  }
  return results;
}

export async function loadCheckProjects(
  networkName: string,
  registryAddress: string
): Promise<CheckProject[]> {
  const file = cachePath(networkName);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  const registry = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    ethers.provider
  );
  const dependencies: string[] =
    await registry.getDependencyNamesAndVersions();
  const cores: string[] = await registry.getSupportedCoreContracts();

  console.log(
    `Discovering one token per dependency across ${cores.length} core contract(s)...`
  );

  const found = new Map<string, CheckProject>();

  for (const seed of SEED_PROJECTS[networkName] ?? []) {
    try {
      const dependency = await registry.getDependencyNameAndVersionForProject(
        seed.core,
        seed.projectId
      );
      found.set(dependency, {
        dependency,
        core: ethers.utils.getAddress(seed.core),
        projectId: seed.projectId,
        tokenId: seed.tokenId,
      });
    } catch {
      console.log(
        `Seed project ${seed.core} #${seed.projectId} has no registry dependency; skipped.`
      );
    }
  }

  // Largest cores first: the flagship contracts carry the oldest dependencies,
  // which are otherwise the last to be found and the first to run out of budget.
  const coreSizes = await inBatches(cores, async (core) => {
    const contract = new ethers.Contract(core, CORE_ABI, ethers.provider);
    let nextProjectId = 0;
    let startingProjectId = 0;
    try {
      nextProjectId = (await contract.nextProjectId()).toNumber();
    } catch {
      return { core, startingProjectId, count: 0 }; // core without this getter
    }
    try {
      startingProjectId = (await contract.startingProjectId()).toNumber();
    } catch {
      startingProjectId = 0; // flagship cores number from zero
    }
    return {
      core,
      startingProjectId,
      count: Math.max(0, nextProjectId - startingProjectId),
    };
  });
  coreSizes.sort((a, b) => b.count - a.count);
  console.log(
    `${coreSizes.filter((c) => c.count > 0).length} core(s) report projects; ` +
      `largest: ${coreSizes
        .slice(0, 3)
        .map((c) => `${c.core.slice(0, 10)}=${c.count}`)
        .join(", ")}`
  );

  let lookups = 0;
  for (const { core, startingProjectId, count } of coreSizes) {
    if (found.size === dependencies.length || lookups >= MAX_PROJECT_LOOKUPS) {
      break;
    }

    const coreContract = new ethers.Contract(core, CORE_ABI, ethers.provider);
    const budget = Math.min(
      count,
      MAX_LOOKUPS_PER_CORE,
      Math.max(0, MAX_PROJECT_LOOKUPS - lookups)
    );
    const slice = Array.from(
      { length: budget },
      (_, i) => startingProjectId + i
    );
    lookups += slice.length;

    const dependencyPerProject = await inBatches(slice, async (projectId) => {
      try {
        return {
          projectId,
          dependency: await registry.getDependencyNameAndVersionForProject(
            core,
            projectId
          ),
        };
      } catch {
        return { projectId, dependency: "" };
      }
    });

    for (const { projectId, dependency } of dependencyPerProject) {
      if (!dependency || found.has(dependency)) continue;

      // A project with no invocations has no token to render.
      const tokenId = ethers.BigNumber.from(projectId).mul(1_000_000);
      try {
        await coreContract.ownerOf(tokenId);
      } catch {
        continue;
      }

      found.set(dependency, {
        dependency,
        core: ethers.utils.getAddress(core),
        projectId,
        tokenId: tokenId.toString(),
      });
    }
  }

  const checks = Array.from(found.values()).sort((a, b) =>
    a.dependency.localeCompare(b.dependency)
  );
  const missing = dependencies.filter((dependency) => !found.has(dependency));
  if (missing.length > 0) {
    console.log(
      `No live token found for: ${missing.join(", ")} — not verified.`
    );
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(checks, null, 2) + "\n");
  console.log(
    `Discovered ${checks.length} check project(s); cached in ` +
      `${path.relative(process.cwd(), file)}`
  );
  return checks;
}
