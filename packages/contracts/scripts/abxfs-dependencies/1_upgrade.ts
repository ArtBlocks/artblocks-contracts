// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 1 — build the Safe batches that upgrade DependencyRegistryV0, then GenArt721GeneratorV0.
 *
 * The registry batch must execute first: the upgraded generator decodes getDependencyDetailsV2
 * with abxfsFileCid appended, which the current registry does not return. The reverse holds, so
 * the registry may land alone — the deployed generator decodes the struct that precedes
 * abxfsFileCid, and ABI decoding ignores the trailing field (see fork-verify.ts, step 3).
 * Neither upgrade changes any output until a CID is set in step 2.
 *
 * Both proxies share a ProxyAdmin and its Safe, so the two batches go to the same signers.
 * Implementations must already be deployed with `yarn create2-deploy` (all-zero salt), exactly as
 * for the registry-driven rendering rollout; every upgrade call is simulated from the Safe.
 *
 *   yarn hardhat run --network mainnet scripts/abxfs-dependencies/1_upgrade.ts
 */

import { getNetworkName } from "../util/utils";
import {
  GENERATOR_CONTRACT_NAME,
  REGISTRY_CONTRACT_NAME,
  getEnvironment,
} from "../registry-driven-rendering/config";
import { resolveRollout } from "../registry-driven-rendering/topology";
import { buildUpgradeBatch } from "../registry-driven-rendering/upgrade-batch";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  console.log(
    `Network:        ${networkName} (chain ${environment.chainId})\n`
  );

  await buildUpgradeBatch({
    networkName,
    chainId: environment.chainId,
    contractName: REGISTRY_CONTRACT_NAME,
    proxies: rollout.registries.map((r) => ({
      label: r.label,
      address: r.address,
    })),
    description:
      "Adds abxfsFileCid to DependencyRegistryV0 dependencies (setter, getter, and a trailing " +
      "getDependencyDetailsV2 field). Execute before the generator upgrade.",
    fileStem: "abxfs-upgrade-registry",
  });

  console.log("");

  await buildUpgradeBatch({
    networkName,
    chainId: environment.chainId,
    contractName: GENERATOR_CONTRACT_NAME,
    proxies: rollout.generators.map((g) => ({
      label: g.label,
      address: g.address,
    })),
    description:
      "GenArt721GeneratorV0 inlines a dependency from its ABX FS file when the registry stores " +
      "no scripts for it. Execute after the registry upgrade.",
    fileStem: "abxfs-upgrade-generator",
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
