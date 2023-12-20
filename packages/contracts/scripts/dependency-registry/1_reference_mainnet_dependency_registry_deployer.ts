// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import { AdminACLV0__factory, DependencyRegistryV0 } from "../contracts";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";
import { getNetworkName } from "../util/utils";

/**
 * This script was created to deploy the DependencyRegistryV0 contract on Mainnet.
 * It uses the hardhat-upgrades plugin to deploy the contract with a proxy. It assigns
 * a new admin ACL contract as the owner of the DependencyRegistryV0 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "mainnet") {
    throw new Error("This script is intended to be run on mainnet only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy new admin ACL contract with deployer super admin to use for initial dependency uploads
  const adminACLFactory = new AdminACLV0__factory(deployer);
  const adminACL = await adminACLFactory.deploy();
  await adminACL.deployed();

  // Deploy dependency registry contract and proxy
  const dependencyRegistryFactory = new DependencyRegistryV0__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        "0xf0585dF582A0ad119F1616FB82f3b449a98EeCd5",
    },
    deployer
  );
  const dependencyRegistry: DependencyRegistryV0 = (await upgrades.deployProxy(
    dependencyRegistryFactory,
    [adminACL.address],
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
