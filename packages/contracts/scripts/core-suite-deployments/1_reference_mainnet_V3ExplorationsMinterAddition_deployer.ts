// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// explorations
import { GenArt721CoreV3Explorations__factory } from "../contracts/factories/GenArt721CoreV3Explorations__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import { BasicRandomizerV2__factory } from "../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../contracts/factories/MinterFilterV1__factory";
import { MinterSetPriceV2__factory } from "../contracts/factories/MinterSetPriceV2__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the V3 core Explorations contracts,
 * including the associated minter suite, to the Ethereum mainnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721CoreAddress = "0x942BC2d3e7a589FE5bd4A5C6eF9727DFd82F5C8a";
const minterFilterAddress = "0x3F4bbde879F9BB0E95AEa08fF12F55E171495C8f";
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

  // Deploy Minter Suite contracts.
  // set price V2
  const minterSetPriceFactory = new MinterSetPriceV2__factory(deployer);
  const minterSetPrice = await minterSetPriceFactory.deploy(
    genArt721CoreAddress,
    minterFilterAddress
  );
  await minterSetPrice.deployed();
  console.log(`MinterSetPrice V2 deployed at ${minterSetPrice.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify MinterSetPriceV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPrice.address} ${genArt721CoreAddress} ${minterFilterAddress}`
  );
  console.log(
    `REMINDER: You must allowlist the MinterSetPriceV2 on the minter filter contract.`
  );

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
