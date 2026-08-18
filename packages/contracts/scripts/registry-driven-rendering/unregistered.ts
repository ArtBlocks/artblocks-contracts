// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Finds projects whose declared script type is not a registered dependency.
 *
 * A core contract stores whatever string a project was configured with, and
 * engine partners set that field themselves, so it is not guaranteed to name a
 * dependency the registry knows about. Mainnet has `js@undefined`, `js@n/a` and
 * `js@` alongside the `js@na` they all mean.
 *
 * This matters because rendering is registry-driven: a string with no record
 * behind it gets the defaults. The pre-upgrade generator matched on the name
 * before the `@`, so those projects received a canvas; the upgraded generator has
 * nothing to read and would not. The fix is data — see `deriveDependencyOverride`
 * — but it can only be applied to projects that have first been found.
 *
 * The scan walks every project on every supported core, which is slow enough to
 * cache. Set `REFRESH_SCAN=true` to discard the cache.
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

const CONCURRENCY = 50;
/** Engine cores number their projects from a large offset, so walks are bounded. */
const MAX_PROJECTS_PER_CORE = 3000;

const REGISTRY_ABI = [
  "function getDependencyNamesAndVersions() view returns (string[])",
  "function getSupportedCoreContracts() view returns (address[])",
  "function getDependencyNameAndVersionForProject(address, uint256) view returns (string)",
];

const CORE_ABI = [
  "function nextProjectId() view returns (uint256)",
  "function startingProjectId() view returns (uint256)",
];

export type UnregisteredProject = {
  /** The string the project declares, which no dependency record matches. */
  declared: string;
  core: string;
  projectId: number;
};

function cachePath(networkName: string): string {
  return path.join(CACHE_DIR, `${networkName}-unregistered.json`);
}

/**
 * Within one process the answer cannot change, and a script may ask more than
 * once — the plan needs it and so does the report. Without this, `REFRESH_SCAN`
 * would repeat a three-minute walk for every caller.
 */
const memo = new Map<string, Promise<UnregisteredProject[]>>();

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

export function findUnregisteredProjects(
  networkName: string,
  registryAddress: string
): Promise<UnregisteredProject[]> {
  const key = `${networkName}:${registryAddress}`;
  const inFlight = memo.get(key);
  if (inFlight) return inFlight;

  const scan = scanUnregisteredProjects(networkName, registryAddress);
  memo.set(key, scan);
  return scan;
}

async function scanUnregisteredProjects(
  networkName: string,
  registryAddress: string
): Promise<UnregisteredProject[]> {
  const file = cachePath(networkName);
  if (fs.existsSync(file) && process.env.REFRESH_SCAN !== "true") {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  const registry = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    ethers.provider
  );
  const registered = new Set<string>(
    await registry.getDependencyNamesAndVersions()
  );
  const cores: string[] = await registry.getSupportedCoreContracts();
  console.log(
    `Scanning ${cores.length} supported core(s) for unregistered script types...`
  );

  const found: UnregisteredProject[] = [];

  for (const core of cores) {
    const coreContract = new ethers.Contract(core, CORE_ABI, ethers.provider);
    let next: number;
    try {
      next = (await coreContract.nextProjectId()).toNumber();
    } catch {
      continue; // core without the getter
    }
    let start = 0;
    try {
      start = (await coreContract.startingProjectId()).toNumber();
    } catch {
      start = 0; // flagship cores number from zero
    }

    const count = Math.min(Math.max(0, next - start), MAX_PROJECTS_PER_CORE);
    const declared = await inBatches(
      Array.from({ length: count }, (_, i) => start + i),
      async (projectId) => {
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
      }
    );

    for (const entry of declared) {
      if (!entry.dependency || registered.has(entry.dependency)) continue;
      found.push({
        declared: entry.dependency,
        core: ethers.utils.getAddress(core),
        projectId: entry.projectId,
      });
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(found, null, 2) + "\n");
  console.log(
    `Found ${found.length} project(s) declaring an unregistered script type; ` +
      `cached in ${path.relative(process.cwd(), file)}`
  );
  return found;
}

/** Groups a scan by the declared string, for reporting. */
export function groupByDeclared(
  projects: UnregisteredProject[]
): Map<string, UnregisteredProject[]> {
  const grouped = new Map<string, UnregisteredProject[]>();
  for (const project of projects) {
    const list = grouped.get(project.declared) ?? [];
    list.push(project);
    grouped.set(project.declared, list);
  }
  return grouped;
}
