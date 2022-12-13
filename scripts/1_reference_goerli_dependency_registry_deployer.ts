// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers, upgrades } from "hardhat";
import { DependencyRegistryV0 } from "./contracts";
import { DependencyRegistryV0__factory } from "./contracts/factories/DependencyRegistryV0__factory";

/**
 * This script was created to deploy the DependencyRegistryV0 contract on Goerli.
 * It uses the hardhat-upgrades plugin to deploy the contract with a proxy. It assigns
 * the existing dev admin ACL contract as the owner of the DependencyRegistryV0 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const ADMIN_ACL_CONTRACT = "0x94Cc7981227D9e644e153766C386eF47556C3147"; // Art Blocks contract-management multi-sig
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on goerli only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy dependency registry contract and proxy
  const dependencyRegistryFactory = new DependencyRegistryV0__factory(deployer);
  const dependencyRegistry: DependencyRegistryV0 = (await upgrades.deployProxy(
    dependencyRegistryFactory,
    [ADMIN_ACL_CONTRACT]
  )) as DependencyRegistryV0;
  await dependencyRegistry.deployed();
  const dependencyRegistryAddress = dependencyRegistry.address;
  console.log(
    `Dependency Registry V0 deployed at ${dependencyRegistryAddress}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify dependency registry contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${dependencyRegistry.address}`
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
