// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import {
  BytecodeStorageV1Writer__factory,
  GenArt721GeneratorV0,
} from "../contracts";
import { GenArt721GeneratorV0__factory } from "../contracts/factories/generator/GenArt721GeneratorV0__factory";
import { getNetworkName } from "../util/utils";
import { StorageContractCreatedEvent } from "../contracts/BytecodeStorageV1Writer";
import { GUNZIP_SCRIPT_BASE64 } from "../util/constants";

const universalBytecodeStorageReaderAddress =
  "0x000000000000A791ABed33872C44a3D215a3743B";
const dependencyRegistryAddress = "0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF";
const scriptyBuilderV2Address = "0xD7587F110E08F4D120A231bA97d3B577A81Df022";

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  if (networkName != "hardhat") {
    throw new Error(
      "This script is intended to be run on hardhat local node only"
    );
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // Deploy BytecodeStorageV1Writer contract
  const bytecodeStorageV1WriterFactory = new BytecodeStorageV1Writer__factory(
    deployer
  );
  const bytecodeStorageV1Writer = await bytecodeStorageV1WriterFactory.deploy();
  await bytecodeStorageV1Writer.deployed();
  console.log(
    `BytecodeStorageV1Writer deployed at ${bytecodeStorageV1Writer.address}`
  );

  // Use BytecodeStorageV1Writer to upload gunzip script
  const gunzipUploadTransaction = await bytecodeStorageV1Writer
    .connect(deployer)
    .writeStringToBytecodeStorage(GUNZIP_SCRIPT_BASE64);

  // Get address of gunzip storage contract from StorageContractCreated event
  const gunzipUploadReceipt = await gunzipUploadTransaction.wait();
  const storageContractCreatedEvent = gunzipUploadReceipt.events?.find(
    (event) => {
      if (event.event === "StorageContractCreated") {
        return true;
      }
    }
  );
  if (!storageContractCreatedEvent) {
    throw new Error("Failed to find StorageContractCreated event");
  }
  const gunzipStorageContractAddress = (
    storageContractCreatedEvent as StorageContractCreatedEvent
  ).args.storageContract;

  // Deploy generator contract
  const genArt721GeneratorFactory = new GenArt721GeneratorV0__factory(deployer);

  const genArt721Generator: GenArt721GeneratorV0 = (await upgrades.deployProxy(
    genArt721GeneratorFactory,
    [
      dependencyRegistryAddress,
      scriptyBuilderV2Address,
      gunzipStorageContractAddress,
      universalBytecodeStorageReaderAddress,
    ]
  )) as GenArt721GeneratorV0;
  await genArt721Generator.deployed();

  const genArt721GeneratorAddress = genArt721Generator.address;
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    genArt721GeneratorAddress
  );
  console.log(
    `GenArt721GeneratorV0 implementation deployed at ${implementationAddress}`
  );
  console.log(`GenArt721GeneratorV0 deployed at ${genArt721GeneratorAddress}`);

  // Wait for 10 seconds to make sure etherscan has indexed the contracts
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // //////////////////////////////////////////////////////////////////////////////
  // // DEPLOYMENT ENDS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // //////////////////////////////////////////////////////////////////////////////
  // // SETUP BEGINS HERE
  // //////////////////////////////////////////////////////////////////////////////

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
