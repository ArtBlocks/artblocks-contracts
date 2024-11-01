// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import { GenArt721GeneratorV0 } from "../contracts";
import { GenArt721GeneratorV0__factory } from "../contracts/factories/generator/GenArt721GeneratorV0__factory";
import { getNetworkName } from "../util/utils";

const universalBytecodeStorageReaderAddress =
  "0x000000069EbaecF0d656897bA5527f2145560086";
const generatorProxyAddress = "0x705E55FCD5CB00eB727213aa777C914B814817Be";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const genArt721GeneratorFactory = new GenArt721GeneratorV0__factory(deployer);
  const genArt721Generator: GenArt721GeneratorV0 = (await upgrades.upgradeProxy(
    generatorProxyAddress,
    genArt721GeneratorFactory
  )) as GenArt721GeneratorV0;
  await genArt721Generator.deployed();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    generatorProxyAddress
  );
  console.log(
    `GenArt721GeneratorV0 implementation deployed at ${implementationAddress}`
  );

  const updateUniversalBytecodeStorageReaderTx =
    await genArt721Generator.updateUniversalBytecodeStorageReader(
      universalBytecodeStorageReaderAddress
    );
  await updateUniversalBytecodeStorageReaderTx.wait();

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
    console.error("Failed to verify GenArt721GeneratorV0 programatically", e);
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
