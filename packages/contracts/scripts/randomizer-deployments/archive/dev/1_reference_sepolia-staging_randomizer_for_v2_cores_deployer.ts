// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// THIS WAS RAN, AND DEPLOYED A RANDOMIZER AT: 0xb4CBEE71aA18f28fdD49837e0a1038935F54931a

import { ethers } from "hardhat";
import { tryVerify } from "../../../util/verification";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay } from "../../../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../../../util/constants";

/**
 * This script was created to deploy polyptych randomizer as required for the MinterPolyptychV0 contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the polyptych randomizer contract.
 * NOTE: this script makes calls as both the deployer, and then as the superAdmin of the
 * associated core contract. If the deployer is not the superAdmin, then the script will
 * need to be modified to make the calls as the superAdmin (or calls must be made manually).
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const randomizerName = "BasicRandomizer";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy new randomizer contract(s)
  const randomizerFactory = await ethers.getContractFactory(randomizerName);
  const randomizer = await randomizerFactory.deploy();
  await randomizer.deployed();
  const randomizerAddress = randomizer.address;
  console.log(`[INFO] ${randomizerName} deployed at ${randomizerAddress}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log(`Done!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
