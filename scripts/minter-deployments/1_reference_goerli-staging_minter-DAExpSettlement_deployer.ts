// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
// explorations
import { MinterDAExpSettlementV0__factory } from "../contracts/factories/MinterDAExpSettlementV0__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the MinterMerkleV3 contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the MinterMerkleV3 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721V3Core_Flagship = "0xB614C578062a62714c927CD8193F0b8Bfb90055C";
const minterFilter_Flagship = "0x6eA558Bb1A3C5437970AdA80f8c686448A9c31fC";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be ran on mainnet only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Minter contract(s)
  const minterDAExpSettlement = new MinterDAExpSettlementV0__factory(deployer);
  // flagship
  const minterDAExpSettlementFlagship = await minterDAExpSettlement.deploy(
    genArt721V3Core_Flagship,
    minterFilter_Flagship
  );
  await minterDAExpSettlementFlagship.deployed();
  const minterDAExpSettlementFlagshipAddress =
    minterDAExpSettlementFlagship.address;
  console.log(
    `MinterDAExpSettlementV0 (flagship) deployed at ${minterDAExpSettlementFlagshipAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // WARNING - ONLY allowlist the minters on the minter filter here if a new minter type
  // is on the MinterType enum in the subgraph.
  // Otherwise, the subgraph will fail to progress.

  // for this specific deployment, we could allowlist the new minter on the minter filter,
  // but we will just wait until after subgraph is synced before allowlisting to be safe.

  try {
    console.log(
      "Verifying MinterDAExpV0 (flagship) contract deployment on Etherscan..."
    );
    await hre.run("verify:verify", {
      address: minterDAExpSettlementFlagshipAddress,
      constructorArguments: [genArt721V3Core_Flagship, minterFilter_Flagship],
    });
    console.log(
      "[INFO] MinterDAExpV0 (flagship) contract deployment verified on Etherscan!"
    );
  } catch (error) {
    console.log(
      "[WARN] MinterDAExpV0 (flagship) contract deployment NOT verified on Etherscan!"
    );
    console.log(error);
  }

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify MinterDAExpV0 (flagship) contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpSettlementFlagshipAddress} ${genArt721V3Core_Flagship} ${minterFilter_Flagship}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("Next Steps:");
  console.log(
    "1. Deploy new subgraph with new minter added to subgraph's config"
  );
  console.log(
    "2. WAIT for subgraph to sync, and ensure enum with new minter type is added to subgraph"
  );
  console.log("3. AFTER subgraph syncs, run sync script");
  console.log(
    `4a. Call addApprovedMinter on ${minterFilter_Flagship} with arg ${minterDAExpSettlementFlagshipAddress}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
