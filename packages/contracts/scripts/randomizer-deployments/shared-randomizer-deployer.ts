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
import { delay, getConfigInputs } from "../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../util/constants";

/**
 * This script was created to deploy a shared randomizer contract.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the shared randomizer contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const randomizerName = "SharedRandomizerV0";
// if the following is undefined, a new pseudorandomAtomicContract will be deployed
// if the following is defined, the existing pseudorandomAtomicContract will be used
let pseudorandomAtomicContractAddress = undefined;
// the following can be undefined if pseudorandomAtomicContractAddress is defined
const pseudorandomAtomicContractName = "PseudorandomAtomic";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/randomizer/shared-randomizer-deploy-config.template.ts",
      "shared randomizer deployment config file"
    );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed minter contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    // ensure mainnet uses pre-deployed pseudorandomAtomicContract
    if (networkName != "goerli" && networkName != "arbitrum-goerli") {
      // deploying on a mainnet
      if (!pseudorandomAtomicContractAddress) {
        throw new Error(
          "[ERROR] pseudorandomAtomicContractAddress must be defined when deploying to mainnet, because it should already have been deployed"
        );
      }
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following steps for each to-be-deployed minter contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // if pseudorandomAtomicContractAddress is undefined, deploy a new one
    let pseudorandomAtomicContract;
    if (pseudorandomAtomicContractAddress) {
      // if pseudorandomAtomicContractAddress is defined, use the existing one
      console.log(
        `[INFO] Using existing pseudorandomAtomicContract at ${pseudorandomAtomicContractAddress}`
      );
    } else {
      // deploy new contract and record new address
      const pseudorandomAtomicContractFactory = await ethers.getContractFactory(
        pseudorandomAtomicContractName
      );
      pseudorandomAtomicContract =
        await pseudorandomAtomicContractFactory.deploy();
      await pseudorandomAtomicContract.deployed();
      // update pseudorandomAtomicContractAddress for use in the rest of the script
      pseudorandomAtomicContractAddress = pseudorandomAtomicContract.address;
      console.log(
        `[INFO] pseudorandom atomic contract ${pseudorandomAtomicContractName} deployed at ${pseudorandomAtomicContractAddress}`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    // Deploy new shared randomizer contract
    const randomizerConstructorArgs = [pseudorandomAtomicContractAddress];
    const randomizerFactory = await ethers.getContractFactory(randomizerName);
    const randomizer = await randomizerFactory.deploy(
      ...randomizerConstructorArgs
    );
    await randomizer.deployed();
    const randomizerAddress = randomizer.address;
    console.log(`[INFO] ${randomizerName} deployed at ${randomizerAddress}`);
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

    // verify shared randomizer (not pseudorandom atomic contract at this time)
    await tryVerify(
      randomizerName,
      randomizerAddress,
      randomizerConstructorArgs,
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
# Shared Randomizer Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.randomizerName
    }:** https://${etherscanSubdomain}etherscan.io/address/${randomizerAddress}#code

**Associated pseudorandom atomic contract:** ${pseudorandomAtomicContractAddress}

**Deployment Args:** ${randomizerConstructorArgs}

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
  console.log(
    `[INFO] No contracts were migrated to use the new shared randomizers. Each contract must be migrated individually.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
