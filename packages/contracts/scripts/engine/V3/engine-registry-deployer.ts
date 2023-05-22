// This file can be used to deploy new engine registries, which may be
// needed to support new deployer wallets. It is not intended to be used with
// typical engine deployments, as the engine registry is typically already deployed.
// IMPORTANT: When deploying new engine registries, they must be added to relevant
// subgraph config files, and the subgraph must be redeployed.
// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import hre from "hardhat";
import { ethers } from "hardhat";
import { tryVerify } from "../../util/verification";

/**
 * This script was created to deploy the V3 core Engine contracts,
 * including the associated minter suite, to the Ethereum goerli testnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const intendedNetwork = "arbitrum-goerli"; // "goerli" or "mainnet"
const engineRegistryContractName = "EngineRegistryV0";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != intendedNetwork) {
    throw new Error(
      `[ERROR] This script is intended to be run on ${intendedNetwork} only`
    );
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy engine registry contract
  // @dev - comment out deployment if using existing engine registry
  const engineRegistryFactory = await ethers.getContractFactory(
    engineRegistryContractName
  );
  const engineRegistry = await engineRegistryFactory.deploy();
  await engineRegistry.deployed();
  const engineRegistryAddress = engineRegistry.address;
  console.log(`[INFO] Engine Registry deployed at ${engineRegistryAddress}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  await tryVerify("EngineRegistry", engineRegistry.address, [], networkName);

  console.log(
    `[INFO] Deployment complete! Please record deployment details in the /deployment directory, as appropriate.`
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
