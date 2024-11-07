// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers, upgrades } from "hardhat";
import { DependencyRegistryV0__factory } from "../contracts/factories/contracts/DependencyRegistryV0.sol/DependencyRegistryV0__factory";
import { getNetworkName } from "../util/utils";
import { tryVerify } from "../util/verification";

const bytecodeStorageReaderAddress =
  "0x7497909537cE00fDda93c12d5083D8647C593c67";
const proxyAddress = "0x5Fcc415BCFb164C5F826B5305274749BeB684e9b"; // This is the proxy address NOT the admin of the proxy.

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const newImplementationFactory = new DependencyRegistryV0__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        bytecodeStorageReaderAddress,
    },
    deployer
  );
  console.log("Preparing upgrade...");
  const newImplementationAddress = await upgrades.prepareUpgrade(
    proxyAddress,
    newImplementationFactory,
    { unsafeAllow: ["external-library-linking"] } // must allow external bytecodeStorageReaderAddress library linking
  );
  console.log("Deployed new implementation:", newImplementationAddress);

  // Wait for 10 seconds to make sure etherscan has indexed the contracts
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // //////////////////////////////////////////////////////////////////////////////
  // // DEPLOYMENT ENDS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // //////////////////////////////////////////////////////////////////////////////
  // // SETUP BEGINS HERE
  // //////////////////////////////////////////////////////////////////////////////
  await tryVerify(
    "DependencyRegistryV0",
    newImplementationAddress.toString(),
    [],
    networkName
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // FOLLOW-ON ACTIONS BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  console.log(
    `[ACTION] Upgrade the proxy via multisig call with the new implementation address: ${newImplementationAddress}`
  );
  //////////////////////////////////////////////////////////////////////////////
  // FOLLOW-ON ACTIONS ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
