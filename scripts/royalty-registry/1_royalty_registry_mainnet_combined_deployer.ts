// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import {
  GenArt721RoyaltyOverride__factory,
  GenArt721RoyaltyOverridePBAB__factory,
} from "../contracts";

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

  // Deploy AB flagship override contract.
  const flagshipOverrideFactory = new GenArt721RoyaltyOverride__factory(
    deployer
  );
  const flagshipOverride = await flagshipOverrideFactory.deploy();
  await flagshipOverride.deployed();
  console.log(
    `Royalty Registry override contract for AB core has been deployed at: ` +
      `${flagshipOverride.address}`
  );
  console.log(`Verify this override deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${flagshipOverride.address}`
  );

  // Deploy PBAB override contract.
  const pbabOverrideFactory = new GenArt721RoyaltyOverridePBAB__factory(
    deployer
  );
  const pbabOverride = await pbabOverrideFactory.deploy();
  await pbabOverride.deployed();
  console.log(
    `Royalty Registry override contract for AB core has been deployed at: ` +
      `${pbabOverride.address}`
  );
  console.log(`Verify this override deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${pbabOverride.address}`
  );

  console.log(
    `Please remember to configure your Royalty Registry override contract by following the instructions here:`
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
