// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers, upgrades } from "hardhat";
import { GenArt721GeneratorV0__factory } from "../contracts/factories/contracts/generator/GenArt721GeneratorV0.sol/GenArt721GeneratorV0__factory";
import { getNetworkName } from "../util/utils";
import { tryVerify } from "../util/verification";

const proxyAddress = "0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27"; // This is the proxy address NOT the admin of the proxy.

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  if (networkName != "sepolia") {
    throw new Error("This script is intended to be run on sepolia only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const newImplementationFactory = new GenArt721GeneratorV0__factory(deployer);
  console.log("Preparing upgrade...");
  const newImplementationAddress = await upgrades.prepareUpgrade(
    proxyAddress,
    newImplementationFactory
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
    "GenArt721GeneratorV0",
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
