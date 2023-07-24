// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../../util/verification";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../../util/constants";

/**
 * This script was created to deploy basic randomizer contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the randomizer contract.
 * NOTE: this script makes calls as both the deployer, and then as the superAdmin of the
 * associated core contract. If the deployer is not the superAdmin, then the script will
 * need to be modified to make the calls as the superAdmin (or calls must be made manually).
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721V3CoreAddress = "0xEa698596b6009A622C3eD00dD5a8b5d1CAE4fC36";
const coreContractType = "GenArt721CoreV3_Engine";
const randomizerName = "BasicRandomizerV2";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "mainnet") {
    throw new Error("This script is intended to be run on mainnet only");
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

  // assign core and renounce ownership
  await randomizer.assignCoreAndRenounce(genArt721V3CoreAddress, {
    gasLimit: 1000000,
  });
  console.log(
    `[INFO] ${randomizerName} updated it's reference to the core contract ${genArt721V3CoreAddress}, and ownership was renounced`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // THE FOLLOWING CALLS MUST BE MADE AS THE SUPERADMIN OF THE CORE CONTRACT
  // IF THE DEPLOYER IS NOT THE SUPERADMIN, THEN THE CALLS MUST BE MADE MANUALLY
  const coreContract = await ethers.getContractAt(
    coreContractType,
    genArt721V3CoreAddress
  );
  await coreContract.updateRandomizerAddress(randomizerAddress);
  console.log(
    `[INFO] Updated randomizer for core at ${genArt721V3CoreAddress} to the Randomizer at at ${randomizerAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

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
