// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../../util/verification";
import fs from "fs";
import path from "path";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs, getNetworkName } from "../../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../../util/constants";

/**
 * This generic script was created to deploy Engine factory
 * contracts. It is intended to document the deployment process
 * and provide a reference for the steps required to deploy the an
 * implementation and factory.
 */
async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/engine/V3/factory/engine-factory-deploy-config.template.ts",
      "engine factory deployment config file"
    );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed Engine factory contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];
    // check network consistency
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] config file's network ${deployDetails.network} does not match the network you are deploying to ${networkName}`
      );
    }
    // ensure the required contracts are defined
    if (!deployDetails.engineImplementationName) {
      throw new Error(
        `[ERROR] config file's engineImplementationName is invalid/not defined`
      );
    }
    if (!deployDetails.engineFlexImplementationName) {
      throw new Error(
        `[ERROR] config file's engineFlexImplementationName is invalid/not defined`
      );
    }
    if (!deployDetails.factoryName) {
      throw new Error(
        `[ERROR] config file's factoryName is invalid/not defined`
      );
    }
    if (!deployDetails.coreRegistryContractName) {
      throw new Error(
        `[ERROR] config file's coreRegistryContractName is invalid/not defined`
      );
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following steps for each to-be-deployed Engine factory contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////
    // Deploy new Engine implementation
    const engineImplementationFactory = await ethers.getContractFactory(
      deployDetails.engineImplementationName
    );
    const engineImplementation = await engineImplementationFactory.deploy([]);
    await engineImplementation.deployed();
    const engineImplementationAddress = engineImplementation.address;
    console.log(
      `[INFO] ${deployDetails.engineImplementationName} deployed at ${engineImplementationAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy new Engine Flex implementation
    const engineFlexImplementationFactory = await ethers.getContractFactory(
      deployDetails.engineFlexImplementationName
    );
    const engineFlexImplementation =
      await engineFlexImplementationFactory.deploy([]);
    await engineFlexImplementation.deployed();
    const engineFlexImplementationAddress = engineFlexImplementation.address;
    console.log(
      `[INFO] ${deployDetails.engineFlexImplementationName} deployed at ${engineFlexImplementationAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy new Core Registry V1
    const coreRegistryContractFactory = await ethers.getContractFactory(
      deployDetails.coreRegistryContractName
    );
    const coreRegistryContract = await coreRegistryContractFactory.deploy();
    await coreRegistryContract.deployed();
    const coreRegistryAddress = coreRegistryContract.address;
    console.log(
      `[INFO] ${deployDetails.coreRegistryContractName} deployed at ${coreRegistryAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy new factory
    const factoryFactory = await ethers.getContractFactory(
      deployDetails.factoryName
    );
    const factoryConstructorArgs = [
      engineImplementationAddress,
      engineFlexImplementationAddress,
      coreRegistryAddress,
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

    // verify Engine implementation
    await tryVerify(
      deployDetails.engineImplementationName,
      engineImplementationAddress,
      [],
      networkName
    );
    // verify Engine Flex implementation
    await tryVerify(
      deployDetails.engineFlexImplementationName,
      engineFlexImplementationAddress,
      [],
      networkName
    );
    // verify Core Registry
    await tryVerify(
      deployDetails.coreRegistryContractName,
      coreRegistryAddress,
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
# Engine Factory Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.engineImplementationName
    }:** https://${etherscanSubdomain}etherscan.io/address/${engineImplementationAddress}#code

**${
      deployDetails.engineFlexImplementationName
    }:** https://${etherscanSubdomain}etherscan.io/address/${engineFlexImplementationAddress}#code

**${
      deployDetails.factoryName
    }:** https://${etherscanSubdomain}etherscan.io/address/${factoryAddress}#code

**${
      deployDetails.coreRegistryContractName
    }:** https://${etherscanSubdomain}etherscan.io/address/${coreRegistryAddress}#code

**Factory Deployment Args:** ${factoryConstructorArgs}

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
