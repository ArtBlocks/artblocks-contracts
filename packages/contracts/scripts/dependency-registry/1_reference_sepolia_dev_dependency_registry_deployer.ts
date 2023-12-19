// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import { DependencyRegistryV0 } from "../contracts";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";

/**
 * This script was created to deploy the DependencyRegistryV0 contract on Sepolia.
 * It uses the hardhat-upgrades plugin to deploy the contract with a proxy. It assigns
 * the existing dev admin ACL contract as the owner of the DependencyRegistryV0 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const ADMIN_ACL_CONTRACT = "0x2a37fD7c5eAf4149B811796ab00769dE0F6B5569"; // Art Blocks contract-management multi-sig
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy dependency registry contract and proxy
  const dependencyRegistryFactory = new DependencyRegistryV0__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        "0x7497909537cE00fDda93c12d5083D8647C593c67",
    },
    deployer
  );
  const dependencyRegistry: DependencyRegistryV0 = (await upgrades.deployProxy(
    dependencyRegistryFactory,
    [ADMIN_ACL_CONTRACT],
    {
      unsafeAllow: ["external-library-linking"],
    }
  )) as DependencyRegistryV0;
  await dependencyRegistry.deployed();

  const dependencyRegistryAddress = dependencyRegistry.address;
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    dependencyRegistryAddress
  );
  console.log(
    `Dependency Registry V0 implementation deployed at ${implementationAddress}`
  );
  console.log(
    `Dependency Registry V0 deployed at ${dependencyRegistryAddress}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
    });
  } catch (e) {
    console.error("Failed to verify programatically", e);
  }

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
