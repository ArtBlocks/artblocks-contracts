// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import { DependencyRegistryV0 } from "../contracts";
import { DependencyRegistryV0__factory } from "../contracts/factories/contracts/DependencyRegistryV0.sol/DependencyRegistryV0__factory";
import { getNetworkName } from "../util/utils";

const bytecodeStorageReaderAddress =
  "0x7497909537cE00fDda93c12d5083D8647C593c67";
const dependencyRegistryProxyAddress =
  "0x5Fcc415BCFb164C5F826B5305274749BeB684e9b";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const dependencyRegistryFactory = new DependencyRegistryV0__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        bytecodeStorageReaderAddress,
    },
    deployer
  );
  const dependencyRegistry: DependencyRegistryV0 = (await upgrades.upgradeProxy(
    dependencyRegistryProxyAddress,
    dependencyRegistryFactory
  )) as DependencyRegistryV0;
  await dependencyRegistry.deployed();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    dependencyRegistryProxyAddress
  );
  console.log(
    `DependencyRegistryV0 implementation deployed at ${implementationAddress}`
  );

  // Wait for 10 seconds to make sure etherscan has indexed the contracts
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // //////////////////////////////////////////////////////////////////////////////
  // // DEPLOYMENT ENDS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // //////////////////////////////////////////////////////////////////////////////
  // // SETUP BEGINS HERE
  // //////////////////////////////////////////////////////////////////////////////

  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
    });
  } catch (e) {
    console.error("Failed to verify DependencyRegistryV0 programatically", e);
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
