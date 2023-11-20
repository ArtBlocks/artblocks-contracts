// This file can be used to deploy new copies of the shared
// public BytecodeStorageReader library, which is intended to
// be used as an externally linked library.
// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import hre from "hardhat";
import { ethers } from "hardhat";
import { tryVerify } from "../util/verification";
import { getNetworkName } from "../util/utils";

/**
 * This file can be used to deploy new copies of the shared
 * public BytecodeStorageReader library, which is intended to
 * be used as an externally linked library.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const intendedNetwork = "arbitrum-sepolia"; // "goerli" or "mainnet"
const libraryContractName = "BytecodeStorageReader";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////
async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy library
  const libraryFactory = await ethers.getContractFactory(libraryContractName);
  const library = await libraryFactory.deploy();
  await library.deployed();
  const libraryAddress = library.address;
  console.log(
    `[INFO] ${intendedNetwork} ${libraryContractName} deployed at: ${libraryAddress}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  await tryVerify(libraryContractName, libraryAddress, [], networkName);

  console.log(
    `[INFO] Deployment complete! Please record deployment details in the top-level README of this repo.`
  );

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
