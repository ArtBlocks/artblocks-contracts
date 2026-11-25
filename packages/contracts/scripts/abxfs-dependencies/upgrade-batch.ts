// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * The step 1 batch: every registry and generator proxy on a network upgraded in one Safe
 * transaction. Shared by 1_upgrade.ts, which writes it for the ProxyAdmin's Safe, and
 * fork-verify.ts, which executes the same calls on a fork.
 *
 * The upgrades must be atomic. The new generator decodes the new registry's
 * `getDependencyDetailsV2` (abxfsFileCid in place of scriptCount) and reads dependency files
 * through FileDataReader, while the deployed generator decodes the old struct and reads script
 * chunks the new registry no longer stores. Either upgrade alone breaks rendering, so they are
 * one batch. The registries and generators share a ProxyAdmin and Safe on every network, which is
 * checked rather than assumed.
 */

import { ethers } from "hardhat";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import {
  SafeTransaction,
  buildProxyAdminUpgradeTx,
} from "../generator-upgrade/safe-tx-builder";
import {
  GENERATOR_CONTRACT_NAME,
  REGISTRY_CONTRACT_NAME,
  RolloutEnvironment,
} from "../registry-driven-rendering/config";
import { requireDeployedImplementation } from "../registry-driven-rendering/implementation";
import {
  ProxyOwnership,
  readProxyOwnership,
  resolveRollout,
} from "../registry-driven-rendering/topology";
import { requireFileDataReader } from "./abxfs";

const PROXY_ADMIN_INTERFACE = new ethers.utils.Interface([
  "function upgrade(address proxy, address implementation) external",
]);

export type PlannedUpgrade = {
  label: string;
  contractName: string;
  proxy: string;
  implementation: string;
  data: string;
  safeTransaction: SafeTransaction;
};

export type UpgradeBatchPlan = {
  proxyAdmin: string;
  owner: ProxyOwnership;
  upgrades: PlannedUpgrade[];
  /** Proxies already running the new implementation. */
  done: string[];
};

/**
 * Plans the atomic upgrade batch for a network. `implementations` defaults to the CREATE2
 * addresses of the local build, which must already be deployed (`yarn create2-deploy`); the
 * fork rehearsal passes freshly deployed ones. Every call is simulated from the Safe.
 */
export async function planUpgradeBatch(
  environment: RolloutEnvironment,
  implementations?: { registry: string; generator: string }
): Promise<UpgradeBatchPlan> {
  const rollout = await resolveRollout(environment);
  const registryImplementation =
    implementations?.registry ??
    (await requireDeployedImplementation(REGISTRY_CONTRACT_NAME));
  const generatorImplementation =
    implementations?.generator ??
    (await requireDeployedImplementation(GENERATOR_CONTRACT_NAME));
  await requireFileDataReader(generatorImplementation);

  const targets = [
    ...rollout.registries.map((r) => ({
      label: `registry (${r.label})`,
      contractName: REGISTRY_CONTRACT_NAME,
      proxy: r.address,
      implementation: registryImplementation,
    })),
    ...rollout.generators.map((g) => ({
      label: `generator (${g.label})`,
      contractName: GENERATOR_CONTRACT_NAME,
      proxy: g.address,
      implementation: generatorImplementation,
    })),
  ];

  const ownerships: ProxyOwnership[] = [];
  for (const target of targets) {
    ownerships.push(await readProxyOwnership(target.proxy));
  }
  const proxyAdmins = new Set(ownerships.map((o) => o.proxyAdmin));
  const owners = new Set(ownerships.map((o) => o.owner));
  if (proxyAdmins.size !== 1 || owners.size !== 1) {
    throw new Error(
      `Registry and generator proxies do not share one ProxyAdmin and owner ` +
        `(admins: ${Array.from(proxyAdmins).join(", ")}; owners: ${Array.from(owners).join(", ")}), ` +
        `so they cannot be upgraded atomically.`
    );
  }
  const owner = ownerships[0];

  const upgrades: PlannedUpgrade[] = [];
  const done: string[] = [];
  targets.forEach((target, i) => {
    if (
      ownerships[i].implementation.toLowerCase() ===
      target.implementation.toLowerCase()
    ) {
      done.push(target.label);
      return;
    }
    upgrades.push({
      ...target,
      data: PROXY_ADMIN_INTERFACE.encodeFunctionData("upgrade", [
        target.proxy,
        target.implementation,
      ]),
      safeTransaction: buildProxyAdminUpgradeTx({
        proxyAdmin: owner.proxyAdmin,
        proxy: target.proxy,
        implementation: target.implementation,
      }),
    });
  });
  if (upgrades.length > 0 && done.length > 0) {
    throw new Error(
      `Only some proxies run the new implementations (${done.join(", ")}); ` +
        `a partial upgrade breaks rendering. Investigate before continuing.`
    );
  }

  for (const upgrade of upgrades) {
    await ethCallOrThrow({
      from: owner.owner,
      to: owner.proxyAdmin,
      data: upgrade.data,
    });
  }
  return { proxyAdmin: owner.proxyAdmin, owner, upgrades, done };
}

/**
 * Dependencies inlined from registry scripts today, and their preferred CDN: what they render
 * from between step 1 and step 2. Read from the registries as currently deployed.
 */
export async function readCdnWindow(
  registries: string[]
): Promise<{ registry: string; dependency: string; preferredCDN: string }[]> {
  const out: { registry: string; dependency: string; preferredCDN: string }[] =
    [];
  for (const registry of registries) {
    const contract = new ethers.Contract(
      registry,
      [
        "function getDependencyNamesAndVersions() view returns (string[])",
        "function getDependencyDetails(bytes32) view returns (string,string,string preferredCDN,uint24,string,uint24,string,bool availableOnChain,uint24 scriptCount)",
      ],
      ethers.provider
    );
    for (const dependency of await contract.getDependencyNamesAndVersions()) {
      const details = await contract.getDependencyDetails(
        ethers.utils.formatBytes32String(dependency)
      );
      if (details.availableOnChain) {
        out.push({ registry, dependency, preferredCDN: details.preferredCDN });
      }
    }
  }
  return out;
}
