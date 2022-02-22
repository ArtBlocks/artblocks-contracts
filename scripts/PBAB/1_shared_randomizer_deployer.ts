// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { BasicRandomizer__factory } from "../contracts/factories/BasicRandomizer__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Randomizer contract.
  const randomizerFactory = new BasicRandomizer__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);
  console.log(`^ Save this for posterity :)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
