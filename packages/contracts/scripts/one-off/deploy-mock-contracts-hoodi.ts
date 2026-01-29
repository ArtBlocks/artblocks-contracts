// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { getNetworkName } from "../util/utils";

/**
 * This script deploys MockGenArt721V3Core and MockPMP contracts to the Hoodi testnet
 * for e2e integration testing.
 *
 * Usage:
 * 1. Ensure HOODI_JSON_RPC_PROVIDER_URL is set in your .env file
 * 2. Ensure your wallet has Hoodi testnet ETH
 * 3. Run: yarn hardhat run scripts/one-off/deploy-mock-contracts-hoodi.ts --network hoodi
 */
async function main() {
  // Debug: Check if RPC URL is configured
  const rpcUrl = process.env.HOODI_JSON_RPC_PROVIDER_URL;
  if (!rpcUrl) {
    throw new Error(
      "HOODI_JSON_RPC_PROVIDER_URL is not set in your .env file.\n" +
        "Please add: HOODI_JSON_RPC_PROVIDER_URL=https://rpc.hoodi.ethpandaops.io"
    );
  }
  console.log(`RPC URL configured: ${rpcUrl.substring(0, 30)}...`);

  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  console.log("=".repeat(60));
  console.log("Deploying Mock Contracts for E2E Testing");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  if (balance.eq(0)) {
    throw new Error(
      "Deployer has no ETH. Please fund the wallet before deploying."
    );
  }

  console.log("");
  console.log("-".repeat(60));
  console.log("Deploying MockGenArt721V3Core...");
  console.log("-".repeat(60));

  // Deploy MockGenArt721V3Core
  const MockGenArt721V3CoreFactory = await ethers.getContractFactory(
    "MockGenArt721V3Core"
  );
  const mockCore = await MockGenArt721V3CoreFactory.deploy();
  await mockCore.deployed();

  console.log(`MockGenArt721V3Core deployed at: ${mockCore.address}`);
  console.log(`  - Core Type: ${await mockCore.coreType()}`);
  console.log(`  - Core Version: ${await mockCore.coreVersion()}`);

  console.log("");
  console.log("-".repeat(60));
  console.log("Deploying MockPMP...");
  console.log("-".repeat(60));

  // Deploy MockPMP
  const MockPMPFactory = await ethers.getContractFactory("MockPMP");
  const mockPMP = await MockPMPFactory.deploy();
  await mockPMP.deployed();

  console.log(`MockPMP deployed at: ${mockPMP.address}`);

  console.log("");
  console.log("-".repeat(60));
  console.log("Linking contracts...");
  console.log("-".repeat(60));

  // Link the MockPMP contract as an external asset dependency in MockGenArt721V3Core
  // The first external asset dependency (index 0) is already set up with #web3call_contract#
  // We just need to update the bytecode address to point to the MockPMP
  const tx = await mockCore.setExternalAssetDependencyBytecodeAddress(
    0,
    mockPMP.address
  );
  await tx.wait();

  console.log(
    `Linked MockPMP as external asset dependency in MockGenArt721V3Core`
  );

  console.log("");
  console.log("=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("Contract Addresses:");
  console.log(`  MockGenArt721V3Core: ${mockCore.address}`);
  console.log(`  MockPMP:             ${mockPMP.address}`);
  console.log("");
  console.log("Database Configuration:");
  console.log(
    `  contracts_metadata.address = "${mockCore.address}" (for the core contract)`
  );
  console.log(
    `  project_external_asset_dependencies (for ONCHAIN web3call contract):`
  );
  console.log(`    - dependency_type: 'ONCHAIN'`);
  console.log(`    - data: '#web3call_contract#'`);
  console.log(`    - address: "${mockPMP.address}"`);
  console.log("");

  // Wait before verification
  console.log("Waiting 30 seconds before attempting contract verification...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  console.log("");
  console.log("-".repeat(60));
  console.log("Verifying contracts on Etherscan...");
  console.log("-".repeat(60));

  // Verify MockGenArt721V3Core
  try {
    await hre.run("verify:verify", {
      address: mockCore.address,
      constructorArguments: [],
    });
    console.log("MockGenArt721V3Core verified successfully");
  } catch (e) {
    console.error("Failed to verify MockGenArt721V3Core:", e);
  }

  // Verify MockPMP
  try {
    await hre.run("verify:verify", {
      address: mockPMP.address,
      constructorArguments: [],
    });
    console.log("MockPMP verified successfully");
  } catch (e) {
    console.error("Failed to verify MockPMP:", e);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("SCRIPT COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
