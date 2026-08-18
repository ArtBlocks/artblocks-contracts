// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 6 — re-import both proxies so `.openzeppelin/<network>.json` records the
 * implementations that are actually live.
 *
 * The upgrades execute through Safes rather than `hardhat-upgrades`, so the
 * manifest would otherwise still describe the previous implementations and the
 * next upgrade's storage-layout validation would compare against the wrong
 * layout. Commit the manifest change this produces.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/6_sync-manifest.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/6_sync-manifest.ts
 */

import { ethers, upgrades } from "hardhat";
import { getNetworkName } from "../util/utils";
import {
  GENERATOR_CONTRACT_NAME,
  REGISTRY_CONTRACT_NAME,
  getEnvironment,
} from "./config";
import { resolveRollout } from "./topology";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  const proxies = [
    ...rollout.registries.map((r) => ({
      label: r.label,
      address: r.address,
      contractName: REGISTRY_CONTRACT_NAME,
    })),
    ...rollout.generators.map((g) => ({
      label: g.label,
      address: g.address,
      contractName: GENERATOR_CONTRACT_NAME,
    })),
  ];

  for (const proxy of proxies) {
    const factory = await ethers.getContractFactory(proxy.contractName);
    await upgrades.forceImport(proxy.address, factory, { kind: "transparent" });
    const implementation = await upgrades.erc1967.getImplementationAddress(
      proxy.address
    );
    console.log(
      `  ${proxy.contractName.padEnd(21)} ${proxy.label.padEnd(8)} ${proxy.address}  ->  ${implementation}`
    );
  }

  console.log(
    `\nManifest for ${networkName} synced. Commit the change to .openzeppelin/.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
