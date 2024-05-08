// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import EngineFactory from "../../../../artifacts/contracts/engine/V3/EngineFactoryV0.sol/EngineFactoryV0.json";
import MinterFilterFactory from "../../../../artifacts/contracts/minter-suite/MinterFilter/MinterFilterV2.sol/MinterFilterV2.json";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getAppPath, getNetworkName } from "../../../util/utils";
import {
  EXTRA_DELAY_BETWEEN_TX,
  getActiveSharedMinterFilter,
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
    engineImplementationAddress: "",
    engineFlexImplementationAddress: "",
    coreRegistryAddress: "",
    engineFactoryAddress: "",
    environment: "",
  };

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // UPDATE BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // VALIDATE
  if (!config.coreRegistryAddress.length) {
    throw new Error(`[ERROR] Valid Core Registry address is required`);
  }

  if (!config.engineFactoryAddress.length) {
    throw new Error(`[ERROR] Valid Engine Factory address is required`);
  }

  // Transfer ownership of Core Registry to EngineFactoryV0
  const engineFactory = new ethers.Contract(
    config.engineFactoryAddress,
    EngineFactory.abi,
    deployer
  );

  const tx = await engineFactory.transferCoreRegistryOwnership(
    config.engineFactoryAddress
  );

  await tx.wait();

  // Update shared minter filter core registry to the new Core Registry
  const activeMinterFilterAddress = getActiveSharedMinterFilter(
    networkName,
    config.environment
  );

  const minterFilterFactory = new ethers.Contract(
    activeMinterFilterAddress,
    MinterFilterFactory.abi,
    deployer
  );

  const tx2 = await minterFilterFactory.updateCoreRegistry(
    config.coreRegistryAddress
  );

  await tx2.wait();

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

**Engine Implementation:** https://${etherscanSubdomain}etherscan.io/address/${config.engineImplementationAddress}#code

**Engine Flex Implementation:** https://${etherscanSubdomain}etherscan.io/address/${config.engineFlexImplementationAddress}#code

**Engine Factory:** https://${etherscanSubdomain}etherscan.io/address/${config.engineFactoryAddress}#code

**Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${config.coreRegistryAddress}#code

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