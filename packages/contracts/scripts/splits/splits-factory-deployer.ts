// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../util/verification";
import fs from "fs";
import path from "path";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs, getNetworkName } from "../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../util/constants";

/**
 * This generic script was created to deploy split factory contracts.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the an implementation and factory.
 */
async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/splits/splits-deploy-config.template.ts",
      "splits deployment config file"
    );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed randomizer contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];
    // check network consistency
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] config file's network ${deployDetails.network} does not match the network you are deploying to ${networkName}`
      );
    }
    // ensure the required contracts are defined
    if (!deployDetails.implementationName) {
      throw new Error(
        `[ERROR] config file's implementationName is invalid/not defined`
      );
    }
    if (!deployDetails.factoryName) {
      throw new Error(
        `[ERROR] config file's factoryName is invalid/not defined`
      );
    }
    const requiredSplitAddress = ethers.utils.getAddress(
      deployDetails.requiredSplitAddress
    );
    if (!requiredSplitAddress) {
      throw new Error(
        `[ERROR] config file's requiredSplitAddress is invalid/not defined`
      );
    }
    const requiredSplitBPS = deployDetails.requiredSplitBPS;
    if (!requiredSplitBPS) {
      throw new Error(
        `[ERROR] config file's requiredSplitBPS is invalid/not defined`
      );
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following steps for each to-be-deployed randomizer contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////
    // Deploy new implementation
    const implementationFactory = await ethers.getContractFactory(
      deployDetails.implementationName
    );
    const implementation = await implementationFactory.deploy([]);
    await implementation.deployed();
    const implementationAddress = implementation.address;
    console.log(
      `[INFO] ${deployDetails.implementationName} deployed at ${implementationAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy new factory
    const factoryFactory = await ethers.getContractFactory(
      deployDetails.factoryName
    );
    const factoryConstructorArgs = [
      implementationAddress,
      ethers.utils.getAddress(deployDetails.requiredSplitAddress), // required split address
      deployDetails.requiredSplitBPS, // required split bps
    ];
    const factory = await factoryFactory.deploy(...factoryConstructorArgs);
    await factory.deployed();
    const factoryAddress = factory.address;
    console.log(
      `[INFO] ${deployDetails.factoryName} deployed at ${factoryAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // VERIFICATION BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // verify implementation
    await tryVerify(
      deployDetails.implementationName,
      implementationAddress,
      [],
      networkName
    );
    // verify factory
    await tryVerify(
      deployDetails.factoryName,
      factoryAddress,
      factoryConstructorArgs,
      networkName
    );

    //////////////////////////////////////////////////////////////////////////////
    // VERIFICATION ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    const outputSummaryFile = path.join(inputFileDirectory, "DEPLOYMENTS.md");
    const etherscanSubdomain =
      networkName === "mainnet" ? "" : `${networkName}.`;
    const outputMd = `
# Splitter Factory Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.implementationName
    }:** https://${etherscanSubdomain}etherscan.io/address/${implementationAddress}#code

**${
      deployDetails.factoryName
    }:** https://${etherscanSubdomain}etherscan.io/address/${factoryAddress}#code

**Factory Deployment Args:** ${factoryConstructorArgs}

Required Split Address: ${deployDetails.requiredSplitAddress}

Required Split BPS: ${deployDetails.requiredSplitBPS}

---

`;

    fs.writeFileSync(outputSummaryFile, outputMd, { flag: "as+" });
    console.log(
      `[INFO] Deployment details written/appended to ${outputSummaryFile}`
    );

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md ENDS HERE
    //////////////////////////////////////////////////////////////////////////////
  }

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
