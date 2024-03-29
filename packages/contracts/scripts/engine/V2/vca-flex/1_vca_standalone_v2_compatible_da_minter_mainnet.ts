// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721MinterDAExpPBAB__factory } from "../../../contracts/factories/GenArt721MinterDAExpPBAB__factory";

const hre = require("hardhat");

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

// Replace with core contract address of already deployed core contract.
const coreContractAddress = "0x32D4BE5eE74376e08038d652d4dc26E62C67F436";

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Minter contract.
  const minterFactory = new GenArt721MinterDAExpPBAB__factory(deployer);
  const minter = await minterFactory.deploy(coreContractAddress);

  await minter.deployed();
  console.log(`MinterDAExp deployed at ${minter.address}`);
  console.log(`If automated verification below fails, verify deployment with:`);
  console.log(
    `yarn hardhat verify --network ${networkName} ${minter.address} ${coreContractAddress}`
  );
  console.log(
    `REMINDER: CoreContract controller (likely a partner) must allowlist this new minter and un-allowlist any old minter.`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform automated verification
  await hre.run("verify:verify", {
    address: minter.address,
    constructorArguments: [coreContractAddress],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
