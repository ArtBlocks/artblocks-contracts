// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../util/verification";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the MinterPolyptychV0 contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the MinterPolyptychV0 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721V3CoreAddress = "0x5702797Ff45FCb0a70eB6AE1E4563299dCFa9Dd6";
const minterFilterAddress = "0x72AE7160A580893Fb1049D17Fbd736Ad39Ea7FbD";
const delegationRegistryAddress = "0x00000000000076A84feF008CDAbe6409d2FE638B";
const minterName = "MinterPolyptychV0";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on mainnet only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Minter contract(s)
  const minterPolyptychFactory = await ethers.getContractFactory(minterName);
  const minterPolyptych = await minterPolyptychFactory.deploy(
    genArt721V3CoreAddress,
    minterFilterAddress,
    delegationRegistryAddress
  );
  await minterPolyptych.deployed();
  const minterPolyptychAddress = minterPolyptych.address;
  console.log(`${minterName} deployed at ${minterPolyptychAddress}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // allowlist the new minter on the minter filter
  const minterFilterContract = await ethers.getContractAt(
    "MinterFilterV1",
    minterFilterAddress
  );
  await minterFilterContract.addApprovedMinter(minterPolyptychAddress);

  // Output instructions for manual Etherscan verification.
  await tryVerify(
    minterName,
    minterPolyptychAddress,
    [genArt721V3CoreAddress, minterFilterAddress, delegationRegistryAddress],
    networkName
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log(
    `Done! MinterPolyptychV0 deployed to ${minterPolyptychAddress}, and allowlisted on the minter filter at ${minterFilterAddress}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
