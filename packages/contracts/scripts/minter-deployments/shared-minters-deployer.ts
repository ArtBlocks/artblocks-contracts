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
import {
  DELEGATION_REGISTRY_ADDRESSES,
  EXTRA_DELAY_BETWEEN_TX,
} from "../util/constants";

// assumed shared minter filter contract name (used when making global
// allowlisting call only)
const ASSUMED_MINTER_FILTER_NAME = "MinterFilterV2";

const followOnActions: string[] = [];

/**
 * This generic script was created to deploy shared minter contracts.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the contract.
 */
async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/minters/shared-minter-deploy-config.template.ts",
      "shared minter deployment config file"
    );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];
    // require minter name
    if (!deployDetails.minterName) {
      throw new Error(
        `[ERROR] minterName must be defined at index ${index}, but is ${deployDetails.minterName}`
      );
    }
    // check network consistency
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] config file's network ${deployDetails.network} does not match the network you are deploying to ${networkName}`
      );
    }
    // check minter filter address is defined
    if (!ethers.utils.isAddress(deployDetails.minterFilterAddress)) {
      throw new Error(
        `[ERROR] minterFilterAddress must be defined at index ${index}, but is ${deployDetails.minterFilterAddress}`
      );
    }

    // require min fee in ETH be defined if minter type is a min price minter
    if (
      deployDetails?.minterName?.includes("MinPrice") &&
      !deployDetails?.minMintFeeETH
    ) {
      throw new Error(
        `[ERROR] minMintFeeETH must be defined at index ${index} for min price minter, but is ${deployDetails.minMintFeeETH}`
      );
    }
  }
  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following steps for each to-be-deployed contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // deploy new shared minter contract
    const minterName = deployDetails.minterName;
    const minterConstructorArgs = [deployDetails.minterFilterAddress];
    // push delegation registry address on constructor args if needed
    if (
      minterName?.includes("Holder") ||
      minterName?.includes("Merkle") ||
      minterName?.includes("Polyptych")
    ) {
      const delegationRegistryAddress =
        DELEGATION_REGISTRY_ADDRESSES[networkName];
      if (!delegationRegistryAddress) {
        throw new Error(
          `[ERROR] delegationRegistryAddress must be defined on network ${networkName}, but is ${delegationRegistryAddress}`
        );
      }
      minterConstructorArgs.push(DELEGATION_REGISTRY_ADDRESSES[networkName]);
    }
    // push min mint fee on constructor args if a min price minter
    if (minterName?.includes("MinPrice")) {
      // @dev already validated that minMintFeeETH is defined
      minterConstructorArgs.push(
        ethers.utils.parseEther(deployDetails.minMintFeeETH).toString()
      );
    }
    const minterFactory = await ethers.getContractFactory(minterName);
    const minter = await minterFactory.deploy(...minterConstructorArgs);
    await minter.deployed();
    const minterAddress = minter.address;
    console.log(
      `[INFO] ${deployDetails.minterName} deployed at ${minterAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    if (deployDetails.approveMinterGlobally) {
      // approve minter globally
      const minterFilter = await ethers.getContractAt(
        ASSUMED_MINTER_FILTER_NAME,
        deployDetails.minterFilterAddress
      );
      try {
        const tx = await minterFilter.approveMinterGlobally(minterAddress);
        await tx.wait();
        console.log(
          `[INFO] ${deployDetails.minterName} approved globally on minter filter at ${deployDetails.minterFilterAddress}`
        );
        await delay(EXTRA_DELAY_BETWEEN_TX);
      } catch (error) {
        console.log(
          `[ERROR] ${deployDetails.minterName} failed to approve globally on minter filter at ${deployDetails.minterFilterAddress}`
        );
        console.log(error);
        // push action onto follow-on actions
        followOnActions.push(
          `[ACTION] ${deployDetails.minterName}: call approveMinterGlobally(${minterAddress}) on ${deployDetails.minterFilterAddress} from admin wallet`
        );
      }
    }

    //////////////////////////////////////////////////////////////////////////////
    // SETUP ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // VERIFICATION BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // verify shared minter
    await tryVerify(
      deployDetails.minterName,
      minterAddress,
      minterConstructorArgs,
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
# Shared Minter Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.minterName
    }:** https://${etherscanSubdomain}etherscan.io/address/${minterAddress}#code

**Associated Minter Filter:** ${deployDetails.minterFilterAddress}

**Deployment Args:** ${minterConstructorArgs}

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
  // log any follow-on actions
  followOnActions.forEach((action) => console.log(action));

  // @dev delay to ensure logs are fully printed to disk
  await delay(EXTRA_DELAY_BETWEEN_TX);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
