// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../util/verification";
import fs from "fs";
import path from "path";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs, getNetworkName } from "../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../util/constants";

/**
 * This generic script was created to deploy shared minter filter contracts.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the contract.
 */
async function main() {
  // no config inputs required

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // deploy Core Registry contract
  // deploy new contract and record new address
  const coreRegistryName = "CoreRegistryV1";
  const coreRegistryContractFactory =
    await ethers.getContractFactory(coreRegistryName);
  const coreRegistryContract = await coreRegistryContractFactory.deploy();
  await coreRegistryContract.deployed();
  // update existing Core Registry for use in the rest of the script
  const coreRegistryAddress = coreRegistryContract.address;
  console.log(
    `[INFO] Core Registry contract ${coreRegistryName} deployed at ${coreRegistryAddress}`
  );
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

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // verify new core registry contract
  await tryVerify(coreRegistryName, coreRegistryAddress, [], networkName);

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log(`[INFO] Done!`);
  console.log(
    `[ACTION] Ensure you update scripts/utils/constants with the new Core Registry address`
  );

  // @dev delay to ensure logs are fully printed to disk
  await delay(EXTRA_DELAY_BETWEEN_TX);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
