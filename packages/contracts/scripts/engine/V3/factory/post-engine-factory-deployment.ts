// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import CoreRegistryFactory from "../../../../artifacts/contracts/engine-registry/CoreRegistryV1.sol/CoreRegistryV1.json";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getAppPath, getNetworkName } from "../../../util/utils";
import {
  getActiveCoreRegistry,
  EXTRA_DELAY_BETWEEN_TX,
  getActiveEngineFactoryAddress,
  getActiveEngineImplementations,
} from "../../../util/constants";

/**
 * This script was created to run post-deployment steps for the EngineFactoryV0.
 * The Engine implementation, Engine Flex implementation, Core Registry, and Engine Factory
 * should already be deployed following the steps in `EngineFactoryV0.md`.
 * This script: transfers ownership of the Core Registry to the Engine Factory contract,
 * updates the core registry on the shared minter filter, and initiates the DEPLOYMENT
 * log in the deployments directory.
 */
async function main() {
  // manually fill out script details
  const config = {
    environment: "dev",
  };

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // UPDATE BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const coreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    config.environment
  );

  const engineFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    config.environment
  );

  const {
    activeEngineFlexImplementationAddress,
    activeEngineImplementationAddress,
  } = await getActiveEngineImplementations(networkName, config.environment);

  // VALIDATE
  if (!coreRegistryAddress.length) {
    throw new Error(`[ERROR] Valid Core Registry address is required`);
  }

  if (!engineFactoryAddress.length) {
    throw new Error(`[ERROR] Valid Engine Factory address is required`);
  }

  // Transfer ownership of Core Registry to EngineFactoryV0
  const coreRegistry = new ethers.Contract(
    coreRegistryAddress,
    CoreRegistryFactory.abi,
    deployer
  );

  const tx = await coreRegistry.transferOwnership(engineFactoryAddress);

  await tx.wait();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENTS.md BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  const appPath = await getAppPath();
  const outputPath = path.join(
    appPath,
    `deployments/engine/V3/studio/${config.environment}`
  );
  const outputSummaryFile = path.join(outputPath, "DEPLOYMENTS.md");
  const etherscanSubdomain = networkName === "mainnet" ? "" : `${networkName}.`;
  const outputMd = `
# Engine Factory Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${config.environment}

**Engine Implementation:** https://${etherscanSubdomain}etherscan.io/address/${activeEngineImplementationAddress}#code

**Engine Flex Implementation:** https://${etherscanSubdomain}etherscan.io/address/${activeEngineFlexImplementationAddress}#code

**Engine Factory:** https://${etherscanSubdomain}etherscan.io/address/${engineFactoryAddress}#code

**Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${coreRegistryAddress}#code

Ownership on Core Registry transferred to the Engine Factory

---

`;

  fs.writeFileSync(outputSummaryFile, outputMd, { flag: "as+" });
  console.log(
    `[INFO] Deployment details written/appended to ${outputSummaryFile}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENTS.md ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
  console.log(`[INFO] Done!`);

  // @dev delay to ensure logs are fully printed to disk
  await delay(EXTRA_DELAY_BETWEEN_TX);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
