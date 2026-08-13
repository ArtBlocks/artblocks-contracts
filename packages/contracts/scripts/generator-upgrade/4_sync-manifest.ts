// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 4 — re-import the proxies so `.openzeppelin/<network>.json` records the
 * implementation that is actually live.
 *
 * The upgrade executes through the Safe rather than `hardhat-upgrades`, so the
 * manifest would otherwise still describe the previous implementation and the next
 * upgrade's storage-layout validation would compare against the wrong layout.
 * Commit the manifest change this produces.
 *
 *   yarn hardhat run --network sepolia scripts/generator-upgrade/4_sync-manifest.ts
 *   yarn hardhat run --network mainnet scripts/generator-upgrade/4_sync-manifest.ts
 */

import { ethers, upgrades } from "hardhat";
import { getNetworkName } from "../util/utils";
import { CONTRACT_NAME, getEnvironment } from "./config";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const factory = await ethers.getContractFactory(CONTRACT_NAME);

  for (const proxy of environment.proxies) {
    await upgrades.forceImport(proxy.address, factory, { kind: "transparent" });
    const implementation = await upgrades.erc1967.getImplementationAddress(
      proxy.address
    );
    console.log(
      `  ${proxy.label.padEnd(8)} ${proxy.address}  ->  ${implementation}`
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
