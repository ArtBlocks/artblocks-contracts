// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 2 — build the Safe batch that upgrades DependencyRegistryV0.
 *
 * This must land before the backfill, because the setters it adds do not exist
 * on the current implementation. It is safe to land on its own: the new
 * implementation keeps the legacy getters byte-for-byte, and the generator does
 * not read the new fields until it is upgraded in step 4.
 *
 * Nothing is sent on-chain here. The batch is written to the gitignored
 * `deployments/generator/safe-txs/` and uploaded to the Safe's Transaction
 * Builder app; it is a throwaway artifact, reproducible by re-running this.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/2_upgrade-registry.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/2_upgrade-registry.ts
 */

import { getNetworkName } from "../util/utils";
import { REGISTRY_CONTRACT_NAME, getEnvironment } from "./config";
import { resolveRollout } from "./topology";
import { buildUpgradeBatch } from "./upgrade-batch";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  console.log(`Network:        ${networkName} (chain ${environment.chainId})`);

  await buildUpgradeBatch({
    networkName,
    chainId: environment.chainId,
    contractName: REGISTRY_CONTRACT_NAME,
    proxies: rollout.registries.map((r) => ({
      label: r.label,
      address: r.address,
    })),
    description:
      "Add per-dependency rendering directives (canvas placement, project script " +
      "tag type, ES module loading) to the dependency registry. Legacy getters are " +
      "unchanged, and no consumer reads the new fields until the on-chain generator " +
      "is upgraded.",
    fileStem: "upgrade-registry",
  });

  console.log(`\nNext: apply the backfill with 3_backfill.ts.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
