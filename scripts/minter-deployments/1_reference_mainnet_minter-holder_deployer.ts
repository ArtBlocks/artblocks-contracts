// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// explorations
import { MinterHolderV2__factory } from "../contracts/factories/MinterHolderV2__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the MinterHolderV2 contract to the Ethereum
 * mainnet. It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the MinterHolderV2 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721V3Core_Flagship = "0x99a9B7c1116f9ceEB1652de04d5969CcE509B069";
const minterFilter_Flagship = "0x092B8F64e713d66b38522978BCf4649db14b931E";
const genArt721V3Core_Explorations =
  "0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a";
const minterFilter_Explorations = "0x3F4bbde879F9BB0E95AEa08fF12F55E171495C8f";
const delegationRegistryAddress = "0x00000000000076A84feF008CDAbe6409d2FE638B";
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

  // Deploy Minter contract(s)
  const minterHolderFactory = new MinterHolderV2__factory(deployer);
  // flagship
  const minterHolderFlagship = await minterHolderFactory.deploy(
    genArt721V3Core_Flagship,
    minterFilter_Flagship,
    delegationRegistryAddress
  );
  await minterHolderFlagship.deployed();
  const minterHolderFlagshipAddress = minterHolderFlagship.address;
  console.log(
    `MinterHolderV2 (flagship) deployed at ${minterHolderFlagshipAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);
  // explorations
  const minterHolderExplorations = await minterHolderFactory.deploy(
    genArt721V3Core_Explorations,
    minterFilter_Explorations,
    delegationRegistryAddress
  );
  await minterHolderExplorations.deployed();
  const minterHolderExplorationsAddress = minterHolderExplorations.address;
  console.log(
    `MinterHolderV2 (explorations) deployed at ${minterHolderExplorationsAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // DO NOT allowlist the minters on the minter filter here. If a new minter type
  // is added to the minter filter, it will need to be added to the minter filter
  // enum in the subgraph first. Otherwise, the subgraph will fail to progress.

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify MinterHolderV2 (flagship) contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterHolderFlagshipAddress} ${genArt721V3Core_Flagship} ${minterFilter_Flagship} ${delegationRegistryAddress}`
  );
  console.log(`Verify MinterHolderV2 (explorations) contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterHolderExplorationsAddress} ${genArt721V3Core_Explorations} ${minterFilter_Explorations} ${delegationRegistryAddress}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("Next Steps:");
  console.log(
    "1. Verify MinterHolderV2 contract deployment on Etherscan (see above)"
  );
  console.log(
    "2. WAIT for subgraph to sync, and ensure enum with new minter type is added to subgraph"
  );
  console.log(
    "3. AFTER subgraph syncs with type MinterHolderV2 included in MinterType enum, allowlist the new minters type on their corresponding minter filters"
  );
  console.log(
    `3a. e.g. Call addApprovedMinter on ${minterFilter_Flagship} with arg ${minterHolderFlagshipAddress}`
  );
  console.log(
    `3b. e.g. Call addApprovedMinter on ${minterFilter_Explorations} with arg ${minterHolderExplorationsAddress}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
