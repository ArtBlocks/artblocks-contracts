// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
import { SRHooks } from "../contracts";
import { SRHooks__factory } from "../contracts/factories/contracts/web3call/augment-hooks/SRHooks.sol/SRHooks__factory";

/**
 * This script deploys the SRHooks contract on Sepolia testnet.
 * It uses the hardhat-upgrades plugin to deploy the contract with a UUPS proxy.
 *
 * SRHooks is a UUPS upgradeable contract that acts as a PMPV0 augment hook,
 * tracking send/receive states and metadata for tokens in a project.
 */

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

/**
 * DEPLOYMENT CONFIGURATION
 * Please update these values before running the deployment script
 */

// Owner address - will have upgrade authority over the contract
// This should be a multisig or trusted address that can authorize upgrades
const OWNER_ADDRESS = "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4"; // Art Blocks Sepolia dev admin ACL

// Core contract address - the GenArt721Core contract this hooks contract will interact with
// Example: GenArt721CoreV3_Engine_Flex or similar
const CORE_CONTRACT_ADDRESS = "0x4a6d2e4a18e194317025d7a995c705aab58d3485"; // DEV Engine Flex

// Project ID - the specific project on the core contract that this hooks contract is for
const CORE_PROJECT_ID = 16; // DEV project

// Expected network
const EXPECTED_NETWORK = "sepolia";

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "unknown" ? "sepolia" : network.name;

  console.log(
    "================================================================================"
  );
  console.log("SRHooks Deployment Script - Sepolia Dev Testnet");
  console.log(
    "================================================================================"
  );
  console.log("");

  //////////////////////////////////////////////////////////////////////////////
  // VALIDATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("--------------------------------------------------");
  console.log("Validating deployment configuration...");
  console.log("--------------------------------------------------");

  // Validate network
  if (networkName !== EXPECTED_NETWORK) {
    throw new Error(
      `[ERROR] This script is intended to be run on ${EXPECTED_NETWORK} only. Current network: ${networkName}`
    );
  }
  console.log(
    `✓ Network validated: ${networkName} (Chain ID: ${network.chainId})`
  );

  // Validate deployer
  console.log(`✓ Deployer address: ${deployer.address}`);
  const deployerBalance = await deployer.getBalance();
  console.log(
    `✓ Deployer balance: ${ethers.utils.formatEther(deployerBalance)} ETH`
  );
  if (deployerBalance.lt(ethers.utils.parseEther("0.05"))) {
    console.warn(
      `[WARNING] Deployer balance is low. Consider adding more ETH for deployment.`
    );
  }

  // Validate configuration addresses
  if (!ethers.utils.isAddress(OWNER_ADDRESS)) {
    throw new Error(`[ERROR] Invalid OWNER_ADDRESS: ${OWNER_ADDRESS}`);
  }
  console.log(`✓ Owner address validated: ${OWNER_ADDRESS}`);

  if (!ethers.utils.isAddress(CORE_CONTRACT_ADDRESS)) {
    throw new Error(
      `[ERROR] Invalid CORE_CONTRACT_ADDRESS: ${CORE_CONTRACT_ADDRESS}`
    );
  }
  console.log(`✓ Core contract address validated: ${CORE_CONTRACT_ADDRESS}`);

  // Validate core contract exists on-chain
  const coreContractCode = await ethers.provider.getCode(CORE_CONTRACT_ADDRESS);
  if (coreContractCode === "0x") {
    throw new Error(
      `[ERROR] No contract found at CORE_CONTRACT_ADDRESS: ${CORE_CONTRACT_ADDRESS}`
    );
  }
  console.log(`✓ Core contract verified on-chain`);

  // Validate project ID
  if (CORE_PROJECT_ID < 0) {
    throw new Error(`[ERROR] Invalid CORE_PROJECT_ID: ${CORE_PROJECT_ID}`);
  }
  console.log(`✓ Project ID validated: ${CORE_PROJECT_ID}`);

  console.log("");
  console.log("--------------------------------------------------");
  console.log("Configuration Summary:");
  console.log("--------------------------------------------------");
  console.log(`Network:              ${networkName}`);
  console.log(`Deployer:             ${deployer.address}`);
  console.log(`Owner:                ${OWNER_ADDRESS}`);
  console.log(`Core Contract:        ${CORE_CONTRACT_ADDRESS}`);
  console.log(`Project ID:           ${CORE_PROJECT_ID}`);
  console.log("");

  //////////////////////////////////////////////////////////////////////////////
  // VALIDATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("--------------------------------------------------");
  console.log("Deploying SRHooks contract...");
  console.log("--------------------------------------------------");

  // Create factory for SRHooks contract
  const srHooksFactory = new SRHooks__factory(deployer);
  console.log("✓ SRHooks factory created");

  // Deploy SRHooks with UUPS proxy
  console.log("Deploying implementation and proxy contracts...");
  console.log("(This may take a minute...)");

  const srHooks: SRHooks = (await upgrades.deployProxy(
    srHooksFactory,
    [OWNER_ADDRESS, CORE_CONTRACT_ADDRESS, CORE_PROJECT_ID],
    {
      kind: "uups",
      initializer: "initialize",
    }
  )) as SRHooks;

  console.log("Waiting for deployment transaction to be mined...");
  await srHooks.deployed();

  const proxyAddress = srHooks.address;
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("");
  console.log("✓ SRHooks implementation deployed at:", implementationAddress);
  console.log("✓ SRHooks proxy deployed at:         ", proxyAddress);
  console.log("");

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // POST-DEPLOYMENT VALIDATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("--------------------------------------------------");
  console.log("Validating deployment...");
  console.log("--------------------------------------------------");

  // Verify the proxy is pointing to the implementation
  const storedImplementation =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);
  if (
    storedImplementation.toLowerCase() !== implementationAddress.toLowerCase()
  ) {
    throw new Error(
      `[ERROR] Implementation address mismatch. Expected: ${implementationAddress}, Got: ${storedImplementation}`
    );
  }
  console.log("✓ Proxy correctly points to implementation");

  // Verify initialization parameters
  const deployedCoreContract = await srHooks.CORE_CONTRACT_ADDRESS();
  const deployedProjectId = await srHooks.CORE_PROJECT_ID();
  const deployedOwner = await srHooks.owner();

  if (
    deployedCoreContract.toLowerCase() !== CORE_CONTRACT_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      `[ERROR] Core contract mismatch. Expected: ${CORE_CONTRACT_ADDRESS}, Got: ${deployedCoreContract}`
    );
  }
  console.log("✓ Core contract address correctly set");

  if (!deployedProjectId.eq(CORE_PROJECT_ID)) {
    throw new Error(
      `[ERROR] Project ID mismatch. Expected: ${CORE_PROJECT_ID}, Got: ${deployedProjectId}`
    );
  }
  console.log("✓ Project ID correctly set");

  if (deployedOwner.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
    throw new Error(
      `[ERROR] Owner mismatch. Expected: ${OWNER_ADDRESS}, Got: ${deployedOwner}`
    );
  }
  console.log("✓ Owner correctly set");

  // Verify the contract supports the correct interface
  const supportsIPMPAugmentHook = await srHooks.supportsInterface("0x74420614"); // IPMPAugmentHook interface ID
  if (!supportsIPMPAugmentHook) {
    console.warn(
      "[WARNING] Contract does not support IPMPAugmentHook interface"
    );
  } else {
    console.log("✓ Contract supports IPMPAugmentHook interface");
  }

  console.log("");

  //////////////////////////////////////////////////////////////////////////////
  // POST-DEPLOYMENT VALIDATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("--------------------------------------------------");
  console.log("Verifying contracts on Etherscan...");
  console.log("--------------------------------------------------");

  // Wait for block confirmations before verification
  console.log("Waiting 30 seconds for Etherscan to index the contracts...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  try {
    console.log("Verifying implementation contract...");
    await hre.run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("✓ Implementation contract verified on Etherscan");
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log("✓ Implementation contract already verified on Etherscan");
    } else {
      console.error(
        "[ERROR] Failed to verify implementation contract:",
        e.message
      );
      console.log("You can verify manually using:");
      console.log(
        `npx hardhat verify --network sepolia ${implementationAddress}`
      );
    }
  }

  console.log("");
  console.log(
    "Note: The proxy contract is automatically verified by the upgrades plugin."
  );
  console.log("");

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SUMMARY
  //////////////////////////////////////////////////////////////////////////////

  console.log(
    "================================================================================"
  );
  console.log("DEPLOYMENT SUMMARY");
  console.log(
    "================================================================================"
  );
  console.log("");
  console.log("Network:                  ", networkName);
  console.log("Deployer:                 ", deployer.address);
  console.log("");
  console.log("SRHooks Implementation:   ", implementationAddress);
  console.log("SRHooks Proxy:            ", proxyAddress);
  console.log("");
  console.log("Configuration:");
  console.log("  Owner:                  ", OWNER_ADDRESS);
  console.log("  Core Contract:          ", CORE_CONTRACT_ADDRESS);
  console.log("  Project ID:             ", CORE_PROJECT_ID);
  console.log("");
  console.log("Etherscan Links:");
  console.log(
    `  Implementation: https://sepolia.etherscan.io/address/${implementationAddress}`
  );
  console.log(
    `  Proxy:          https://sepolia.etherscan.io/address/${proxyAddress}`
  );
  console.log("");
  console.log("Next Steps:");
  console.log("  1. Verify the deployment on Etherscan using the links above");
  console.log(
    "  2. Configure PMPV0 to use this SRHooks contract as an augment hook"
  );
  console.log(
    "     - Call: pmp.configureProjectHooks(coreContract, projectId, address(0), srHooksAddress)"
  );
  console.log(
    "  3. Test the contract functionality on testnet before mainnet deployment"
  );
  console.log("");
  console.log("Upgrade Authority:");
  console.log(
    "  - Only the owner can authorize upgrades via _authorizeUpgrade"
  );
  console.log("  - Current owner:", OWNER_ADDRESS);
  console.log("");
  console.log(
    "================================================================================"
  );
  console.log("DEPLOYMENT COMPLETE");
  console.log(
    "================================================================================"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error(
      "================================================================================"
    );
    console.error("DEPLOYMENT FAILED");
    console.error(
      "================================================================================"
    );
    console.error(error);
    console.error(
      "================================================================================"
    );
    process.exit(1);
  });
