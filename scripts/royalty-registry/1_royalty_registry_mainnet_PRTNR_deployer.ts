// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721RoyaltyOverridePRTNR__factory } from "../contracts";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";

  // Mainnet only!
  if (networkName !== "mainnet") {
    console.log("This script is only intended to be run on mainnet, aborting!");
    return;
  }

  // Deploy PRTNR override contract.
  const prtnrOverrideFactory = new GenArt721RoyaltyOverridePRTNR__factory(
    deployer
  );
  const prtnrOverride = await prtnrOverrideFactory.deploy();
  await prtnrOverride.deployed();
  console.log(
    `Royalty Registry override contract for PRTNR has been deployed at: ` +
      `${prtnrOverride.address}`
  );
  console.log(`Verify this override deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${prtnrOverride.address}`
  );

  console.log(
    `Please remember to configure your Royalty Registry override contracts by following the instructions here:`
  );
  console.log(
    `https://github.com/ArtBlocks/artblocks-contracts#royalty-registry-overrides`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
