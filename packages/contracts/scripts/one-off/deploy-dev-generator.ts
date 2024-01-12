// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { ETHFSFileStorage__factory, GenArt721GeneratorV0 } from "../contracts";
import { GenArt721GeneratorV0__factory } from "../contracts/factories/GenArt721GeneratorV0__factory";
import { getNetworkName } from "../util/utils";
import { BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES } from "../util/constants";

const dependencyRegistryAddress = "0x5Fcc415BCFb164C5F826B5305274749BeB684e9b";
const ethFSAddress = "0xFe1411d6864592549AdE050215482e4385dFa0FB";
const scriptyBuilderV2Address = "0xb205DFfE32259E2F1c3C0cba855250134147C083";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // Deploy scripty builder compatible ethFS wrapper. This is only really necessary
  // because scripty/ethFS wasn't already deployed on sepolia.
  const ethFSFileStorageFactory = new ETHFSFileStorage__factory(deployer);
  const ethFSFileStorage = await ethFSFileStorageFactory.deploy(ethFSAddress);
  await ethFSFileStorage.deployed();
  console.log(`ETHFSFileStorage deployed at ${ethFSFileStorage.address}`);

  // // Deploy generator contract
  const bytecodeStorageLibraryAddress =
    BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];
  const genArt721GeneratorFactory = (await ethers.getContractFactory(
    "GenArt721GeneratorV0",
    {
      libraries: {
        BytecodeStorageReader: bytecodeStorageLibraryAddress,
      },
    }
  )) as GenArt721GeneratorV0__factory;
  const genArt721Generator: GenArt721GeneratorV0 =
    await genArt721GeneratorFactory.deploy(
      dependencyRegistryAddress,
      scriptyBuilderV2Address,
      ethFSFileStorage.address
    );

  await genArt721Generator.deployed();
  console.log(`GenArt721GeneratorV0 deployed at ${genArt721Generator.address}`);

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
      address: ethFSFileStorage.address,
      constructorArguments: [ethFSAddress],
    });
  } catch (e) {
    console.error("Failed to verify ETHFSFileStorage programatically", e);
  }

  try {
    await hre.run("verify:verify", {
      address: genArt721Generator.address,
      constructorArguments: [
        dependencyRegistryAddress,
        scriptyBuilderV2Address,
        ethFSFileStorage.address,
      ],
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
