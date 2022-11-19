// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { DependencyRegistryV0__factory } from "./contracts/factories/DependencyRegistryV0__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "./util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the AdminACLV1 contract to the Ethereum
 * mainnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the AdminACLV1 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const adminACLContract = "0x94Cc7981227D9e644e153766C386eF47556C3147"; // Art Blocks contract-management multi-sig
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on goerli only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy AdminACL contract
  const dependencyRegistryFactory = new DependencyRegistryV0__factory(deployer);
  const dependencyRegistry = await dependencyRegistryFactory.deploy(adminACLContract);
  await dependencyRegistry.deployed();
  const dependencyRegistryAddress = dependencyRegistry.address;
  console.log(`Dependency Registry V0 deployed at ${dependencyRegistryAddress}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify dependency registry contract deployment with:`);
  console.log(`${standardVerify} --network ${networkName} ${dependencyRegistry.address} ${adminACLContract}`);

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
