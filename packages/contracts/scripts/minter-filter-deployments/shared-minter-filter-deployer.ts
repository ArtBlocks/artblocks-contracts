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
 * This generic script was created to deploy shared minter filter contracts.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the contract.
 */
async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/minter-filter/shared-minter-filter-deploy-config.template.ts",
      "shared minter-filter deployment config file"
    );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];
    // check network consistency
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] config file's network ${deployDetails.network} does not match the network you are deploying to ${networkName}`
      );
    }
    // verify a sensible AdminACL input config
    if (deployDetails.existingAdminACL) {
      // ensure a valid address
      ethers.utils.isAddress(deployDetails.existingAdminACL);
      // @dev it is acceptable to have an adminACLContractName or
      // not have an adminACLContractName if existingAdminACL is defined
    } else {
      // ensure that the adminACL contract name is defined
      if (deployDetails.adminACLContractName == undefined) {
        throw new Error(
          `[ERROR] adminACLContractName must be defined if existingAdminACL is not defined`
        );
      }
      // ensure that the adminACL contract name is valid (i.e. the following doesn't throw)
      await ethers.getContractFactory(deployDetails.adminACLContractName);
    }
    // check sufficient coreRegistry input
    if (
      !(
        deployDetails.existingCoreRegistry ||
        deployDetails.coreRegistryContractName
      )
    ) {
      throw new Error(
        `[ERROR] existingAdminACL or adminACLContractName must be defined at index ${index}`
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

    // get or deploy admin ACL contract
    let adminACLContractAddress: string | undefined;
    if (deployDetails.existingAdminACL) {
      // use the existing contract
      adminACLContractAddress = deployDetails.existingAdminACL;
      console.log(
        `[INFO] Using existing adminACL at ${adminACLContractAddress}`
      );
    } else {
      // deploy new contract and record new address
      const adminACLContractFactory = await ethers.getContractFactory(
        deployDetails.adminACLContractName
      );
      const adminACLContract = await adminACLContractFactory.deploy();
      await adminACLContract.deployed();
      // update existing AdminACL for use in the rest of the script
      adminACLContractAddress = adminACLContract.address;
      console.log(
        `[INFO] Admin ACL contract ${deployDetails.adminACLContractName} deployed at ${adminACLContractAddress}`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    // get or deploy Core Registry contract
    let coreRegistryAddress: string | undefined;
    if (deployDetails.existingCoreRegistry) {
      // use the existing contract
      coreRegistryAddress = deployDetails.existingCoreRegistry;
      console.log(
        `[INFO] Using existing Core Registry at ${coreRegistryAddress}`
      );
    } else {
      // deploy new contract and record new address
      const coreRegistryContractFactory = await ethers.getContractFactory(
        deployDetails.coreRegistryContractName
      );
      const coreRegistryContract = await coreRegistryContractFactory.deploy();
      await coreRegistryContract.deployed();
      // update existing Core Registry for use in the rest of the script
      coreRegistryAddress = coreRegistryContract.address;
      console.log(
        `[INFO] Core Registry contract ${deployDetails.coreRegistryContractName} deployed at ${coreRegistryAddress}`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    // deploy new shared minter filter contract
    const minterFilterConstructorArgs = [
      adminACLContractAddress,
      coreRegistryAddress,
    ];
    const minterFilterFactory = await ethers.getContractFactory(
      deployDetails.minterFilterName
    );
    const minterFilter = await minterFilterFactory.deploy(
      ...minterFilterConstructorArgs
    );
    await minterFilter.deployed();
    const minterFilterAddress = minterFilter.address;
    console.log(
      `[INFO] ${deployDetails.minterFilterName} deployed at ${minterFilterAddress}`
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

    // verify any new adminACL contract
    if (!deployDetails.existingAdminACL) {
      await tryVerify(
        deployDetails.adminACLContractName,
        adminACLContractAddress,
        [],
        networkName
      );
    }

    // verify any new core registry contract
    if (!deployDetails.existingCoreRegistry) {
      await tryVerify(
        deployDetails.coreRegistryContractName,
        coreRegistryAddress,
        [],
        networkName
      );
    }

    // verify shared minter filter
    await tryVerify(
      deployDetails.minterFilterName,
      minterFilterAddress,
      minterFilterConstructorArgs,
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
# Shared Minter Filter Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.minterFilterName
    }:** https://${etherscanSubdomain}etherscan.io/address/${minterFilterAddress}#code

**Associated AdminACL contract:** ${adminACLContractAddress}

**Associated CoreRegistry contract:** ${coreRegistryAddress}

**Deployment Args:** ${minterFilterConstructorArgs}

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
    `[INFO] Ensure any superAdmin migration actions are performed before proceeding to use the deployed contracts.`
  );

  // @dev delay to ensure logs are fully printed to disk
  await delay(EXTRA_DELAY_BETWEEN_TX);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
