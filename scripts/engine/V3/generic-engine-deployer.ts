// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import hre from "hardhat";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import path from "path";
import fs from "fs";
var util = require("util");
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);
import prompt from "prompt";

import { syncContractBucketAndType } from "../../util/graphql-utils";

import {
  DELEGATION_REGISTRY_ADDRESSES,
  KNOWN_ENGINE_REGISTRIES,
} from "../../util/constants";
import { tryVerify } from "../../util/verification";
// image bucket creation
import { createPBABBucket } from "../../util/aws_s3";
// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 1000; // ms
const MANUAL_GAS_LIMIT = 500000; // gas
var log_stdout = process.stdout;

// These are the core contracts that may be deployed by this script.
const SUPPORTED_CORE_CONTRACTS = ["GenArt721CoreV3_Engine"];

/**
 * This script was created to deploy the V3 core Engine contracts,
 * including the associated minter suite, to the Ethereum goerli testnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
async function main() {
  prompt.start();
  const deplomentConfigFile = (
    await prompt.get<{ from: string }>(["deployment config file"])
  )["deployment config file"];
  // dynamically import input deployment configuration details
  let deployDetailsArray;
  const fullImportPath = path.join("../../../", deplomentConfigFile);
  const inputFileDirectory = path.dirname(fullImportPath);
  try {
    ({ deployDetailsArray } = await import(fullImportPath));
  } catch (error) {
    throw new Error(
      `[ERROR] Unable to import deployment configuration file: ${deplomentConfigFile}
      Please ensure the file exists (e.g. deployments/engine/V3/partners/dev-example/deployment-config.dev.ts)`
    );
  }
  // record all deployment logs to a file, monkey-patching stdout
  const pathToMyLogFile = path.join(
    __dirname,
    inputFileDirectory,
    "DEPLOYMENT_LOGS.log"
  );
  var myLogFileStream = fs.createWriteStream(pathToMyLogFile, { flags: "a+" });
  var log_stdout = process.stdout;
  console.log = function (d) {
    myLogFileStream.write(util.format(d) + "\n");
    log_stdout.write(util.format(d) + "\n");
  };
  // record relevant deployment information in logs
  console.log(`----------------------------------------`);
  console.log(`[INFO] Datetime of deployment: ${new Date().toISOString()}`);
  console.log(`[INFO] Deployment configuration file: ${deplomentConfigFile}`);

  const [deployer] = await ethers.getSigners();
  // Perform the following deploy steps for each to-be-deployed contract
  for (let index = 0; index < deployDetailsArray.length; index++) {
    const deployDetails = deployDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // INPUT VALIDATION BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // verify intended network
    const network = await ethers.provider.getNetwork();
    const networkName = network.name == "homestead" ? "mainnet" : network.name;
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] This script is intended to be run on network ${deployDetails.network} only, but is being run on ${networkName}`
      );
    }
    console.log(`[INFO] Deploying to network: ${networkName}`);
    // verify deployer wallet is the same as the one used to deploy the engine registry
    const targetDeployerAddress =
      KNOWN_ENGINE_REGISTRIES[networkName][deployDetails.engineRegistryAddress];
    if (targetDeployerAddress == undefined) {
      throw new Error(
        `[ERROR] Engine registry address ${deployDetails.engineRegistryAddress} is not configured for deployment on network ${networkName}, please update KNOWN_ENGINE_REGISTRIES`
      );
    }
    if (deployer.address !== targetDeployerAddress) {
      throw new Error(
        `[ERROR] This script is intended to be run only by the deployer wallet: ${targetDeployerAddress}, due to engine registry ownership requirements on engine registry ${deployDetails.engineRegistryAddress}`
      );
    }
    // only allow supported core contract names to be deployed with this script
    if (
      !SUPPORTED_CORE_CONTRACTS.includes(
        deployDetails.genArt721CoreContractName
      )
    ) {
      throw new Error(
        `[ERROR] This script only supports deployment of the following core contracts: ${SUPPORTED_CORE_CONTRACTS.join(
          ", "
        )}`
      );
    }
    //////////////////////////////////////////////////////////////////////////////
    // INPUT VALIDATION ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (SHARED) BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Deploy AdminACL contract
    let adminACLAddress: string;
    if (deployDetails.existingAdminACL) {
      adminACLAddress = deployDetails.existingAdminACL;
      console.log(
        `[INFO] Using existing Admin ACL at address: ${deployDetails.existingAdminACL}`
      );
    } else {
      if (deployDetails.adminACLContractName == undefined) {
        throw new Error(
          `[ERROR] adminACLContractName must be defined if existingAdminACL is not defined`
        );
      }
      const adminACLFactory = await ethers.getContractFactory(
        deployDetails.adminACLContractName
      );
      const adminACL = await adminACLFactory.deploy();
      await adminACL.deployed();
      adminACLAddress = adminACL.address;
      console.log(
        `[INFO] New Admin ACL ${deployDetails.adminACLContractName} deployed at address: ${adminACLAddress}`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (SHARED) ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (PER-CONTRACT) BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Deploy randomizer contract
    const randomizerFactory = await ethers.getContractFactory(
      deployDetails.randomizerContractName
    );
    const randomizer = await randomizerFactory.deploy();
    await randomizer.deployed();
    const randomizerAddress = randomizer.address;
    console.log(
      `[INFO] Randomizer ${deployDetails.randomizerContractName} deployed at ${randomizerAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy Core contract
    const genArt721CoreFactory = await ethers.getContractFactory(
      deployDetails.genArt721CoreContractName
    );
    const tokenName = deployDetails.tokenName;
    const tokenTicker = deployDetails.tokenTicker;
    const renderProviderAddress =
      deployDetails.renderProviderAddress.toLowerCase() == "deployer"
        ? deployer.address
        : deployDetails.renderProviderAddress;
    const platformProviderAddress =
      deployDetails.platformProviderAddress.toLowerCase() == "deployer"
        ? deployer.address
        : deployDetails.platformProviderAddress;
    const startingProjectId = deployDetails.startingProjectId;
    const autoApproveArtistSplitProposals =
      deployDetails.autoApproveArtistSplitProposals;
    const genArt721Core = await genArt721CoreFactory.deploy(
      tokenName,
      tokenTicker,
      renderProviderAddress,
      platformProviderAddress,
      randomizerAddress,
      adminACLAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      deployDetails.engineRegistryAddress
    );

    await genArt721Core.deployed();
    console.log(
      `[INFO] Core ${deployDetails.genArt721CoreContractName} deployed at ${genArt721Core.address}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy Minter Filter contract.
    const minterFilterFactory = await ethers.getContractFactory(
      deployDetails.minterFilterContractName
    );
    const minterFilter = await minterFilterFactory.deploy(
      genArt721Core.address
    );
    await minterFilter.deployed();
    console.log(
      `[INFO] Minter Filter ${deployDetails.minterFilterContractName} deployed at ${minterFilter.address}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Deploy Minter contracts
    const deployedMinterAddresses: string[] = [];
    const deployedMinters: Contract[] = [];
    const deployedMinterNames: string[] = [];
    const deployedMinterConstructorArgs: any[] = [];
    for (let j = 0; j < deployDetails.minters.length; j++) {
      const minterName = deployDetails.minters[j];

      const minterFactory = await ethers.getContractFactory(minterName);
      const minterConstructorArgs = [
        genArt721Core.address,
        minterFilter.address,
      ];
      // add delegation registry address to constructor args if needed
      if (
        minterName.startsWith("MinterHolder") ||
        minterName.startsWith("MinterMerkle") ||
        minterName.startsWith("MinterPolyptych")
      ) {
        minterConstructorArgs.push(DELEGATION_REGISTRY_ADDRESSES[networkName]);
      }
      const minter = await minterFactory.deploy(...minterConstructorArgs);
      await minter.deployed();
      console.log(`[INFO] ${minterName} deployed at ${minter.address}`);
      deployedMinterAddresses.push(minter.address);
      deployedMinters.push(minter);
      deployedMinterNames.push(minterName);
      deployedMinterConstructorArgs.push(minterConstructorArgs);
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (PER-CONTRACT) ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Assign randomizer to core and renounce ownership on randomizer
    await randomizer.assignCoreAndRenounce(genArt721Core.address);
    console.log(
      `[INFO] Assigned randomizer to core and renounced ownership of randomizer`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Set the Minter to MinterFilter on the Core contract.
    await genArt721Core
      .connect(deployer)
      .updateMinterContract(minterFilter.address);
    console.log(
      `[INFO] Updated the Minter Filter on the Core contract to ${minterFilter.address}.`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Allowlist new Minters on MinterFilter.
    for (let j = 0; j < deployDetails.minters.length; j++) {
      const minterName = deployDetails.minters[j];
      const minterAddress = deployedMinterAddresses[j];
      await minterFilter.connect(deployer).addApprovedMinter(minterAddress);
      console.log(
        `[INFO] Allowlisted minter ${minterName} at ${minterAddress} on minter filter.`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    }

    if (deployDetails.addInitialProject) {
      // Create a project 0, and a token 0, on that empty project.
      await genArt721Core.connect(deployer).addProject(
        tokenName, // Use `tokenName` as placeholder for project 0 name
        deployer.address // Use `deployer.address` as placeholder for project 0 owner
      );
      console.log(
        `[INFO] Added ${tokenName} project ${startingProjectId} placeholder on ${tokenName} contract, artist is ${deployer.address}.`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    } else {
      console.log(`[INFO] Skipping adding placeholder initial project.`);
    }

    if (deployDetails.addInitialProject && deployDetails.addInitialToken) {
      // ensure we have a set price minter
      let minterName: string;
      let minterAddress: string;
      let minter: Contract;
      for (let j = 0; j < deployDetails.minters.length; j++) {
        const currentMinterName = deployDetails.minters[j];
        if (
          currentMinterName.startsWith("MinterSetPrice") &&
          !currentMinterName.startsWith("MinterSetPriceERC20")
        ) {
          // found a set price minter that is not an ERC20 minter
          minterName = currentMinterName;
          minterAddress = deployedMinterAddresses[j];
          minter = deployedMinters[j];
          break;
        }
      }
      if (!minterName) {
        console.warn(
          "[WARN] No set price minter found, skipping initial token creation."
        );
      } else {
        await minterFilter
          .connect(deployer)
          .setMinterForProject(startingProjectId, minterAddress, {
            gasLimit: MANUAL_GAS_LIMIT,
          }); // provide manual gas limit
        console.log(
          `[INFO] Configured set price minter (${minterAddress}) for project ${startingProjectId}.`
        );
        await delay(EXTRA_DELAY_BETWEEN_TX);
        await minter
          .connect(deployer)
          .updatePricePerTokenInWei(startingProjectId, 0, {
            gasLimit: MANUAL_GAS_LIMIT,
          }); // provide manual gas limit
        console.log(
          `[INFO] Configured minter price project ${startingProjectId}.`
        );
        await delay(EXTRA_DELAY_BETWEEN_TX);
        await minter
          .connect(deployer)
          .purchase(startingProjectId, { gasLimit: MANUAL_GAS_LIMIT }); // provide manual gas limit
        console.log(`[INFO] Minted token 0 for project ${startingProjectId}.`);
        `[INFO] Minted token 0 for project ${startingProjectId} placeholder on ${tokenName} contract, artist is ${deployer.address}.`;
        await delay(EXTRA_DELAY_BETWEEN_TX);
      }
    } else {
      console.log(`[INFO] Skipping adding placeholder initial token.`);
    }

    // Note reminders about config addresses that have been left as the deployer for now.
    console.log(
      `[INFO] provider primary and secondary sales payment addresses remain as deployer addresses: ${deployer.address}.`
    );
    console.log(
      `[INFO] AdminACL's superAdmin address likely remains as deployer address (unless using shared AdminACL, in which case existing AdminACL's superAdmin is unchanged): ${deployer.address}.`
    );
    console.log(`[ACTION] Don't forget to update these later as needed!`);

    //////////////////////////////////////////////////////////////////////////////
    // SETUP ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // VERIFICATION BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Output instructions for manual Etherscan verification.
    const standardVerify = "yarn hardhat verify";
    // CORE CONTRACT
    // @dev do not use helper tryVerify here due to complex constructor args
    try {
      console.log(`[INFO] Verifying core contract contract deployment...`);
      await hre.run("verify:verify", {
        address: genArt721Core.address,
        constructorArguments: [
          tokenName, // name
          tokenTicker, // ticker
          renderProviderAddress, // render provider
          platformProviderAddress, // platform provider
          randomizerAddress, // randomizer
          adminACLAddress, // admin acl
          startingProjectId, // starting project id
          autoApproveArtistSplitProposals, // auto approve artist split proposals
          deployDetails.engineRegistryAddress, // engine registry],
        ],
      });
      console.log(
        `[INFO] Core contract verified on Etherscan at ${genArt721Core.address}}`
      );
    } catch (error) {
      console.error(
        `[ERROR] Failed to verify core contract deployment, please verify manually!`
      );
      console.error(error);
      console.log(
        `[ACTION] Save the following constructor args config file to a constructor-args.js file, then verify core contract deployment with:`
      );
      console.log(
        `module.exports = [
        "${tokenName}", // name
        "${tokenTicker}", // ticker
        "${renderProviderAddress}", // render provider
        "${platformProviderAddress}", // platform provider
        "${randomizerAddress}", // randomizer
        "${adminACLAddress}", // admin acl
        ${startingProjectId}, // starting project id
        ${autoApproveArtistSplitProposals}, // auto approve artist split proposals
        "${deployDetails.engineRegistryAddress}" // engine registry
      ];`
      );
      console.log(
        `${standardVerify} --network ${networkName} --constructor-args constructor-args.js ${genArt721Core.address}`
      );
    }
    // ADMIN ACL CONTRACT
    if (deployDetails.existingAdminACL !== undefined) {
      await tryVerify("AdminACL", adminACLAddress, [], networkName);
    }
    // MINTER FILTER CONTRACT
    await tryVerify(
      "MinterFilter",
      minterFilter.address,
      [genArt721Core.address],
      networkName
    );
    // MINTERS
    for (let i = 0; i < deployedMinters.length; i++) {
      const minterName = deployedMinterNames[i];
      const minterAddress = deployedMinterAddresses[i];
      const minterConstructorArgs = deployedMinterConstructorArgs[i];
      await tryVerify(
        minterName,
        minterAddress,
        minterConstructorArgs,
        networkName
      );
    }

    // create image bucket
    const payload = await createPBABBucket(tokenName, networkName);
    const bucketName = payload["url"];
    console.log(`[INFO] Created image bucket ${bucketName}`);
    console.log(
      `[ACTION] Hasura: Set image bucket for this core contract ${genArt721Core.address} to ${bucketName}`
    );
    // reminder to set core contract type in db
    const coreType = await genArt721Core.coreType();
    console.log(
      `[ACTION] Hasura: Set core contract type for ${genArt721Core.address} to ${coreType}`
    );
    // reminder to add to subgraph config if desire to index minter filter
    console.log(
      `[ACTION] Subgraph: Add Minter Filter and Minter contracts to subgraph config if desire to index minter suite.`
    );

    //////////////////////////////////////////////////////////////////////////////
    // VERIFICATION ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    const outputLogFile = path.join(
      __dirname,
      inputFileDirectory,
      "DEPLOYMENTS.md"
    );
    const outputMd = `
# Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deplomentConfigFile}\`

**${deployDetails.genArt721CoreContractName}:** https://etherscan.io/address/${
      genArt721Core.address
    }#code

**${
      deployDetails.adminACLContractName
    }:** https://etherscan.io/address/${adminACLAddress}#code

**Engine Registry:** https://etherscan.io/address/${
      deployDetails.engineRegistryAddress
    }#code

**${deployDetails.minterFilterContractName}:** https://etherscan.io/address/${
      minterFilter.address
    }#code

**Minters:**

${deployedMinterNames
  .map((minterName, i) => {
    return `**${minterName}:** https://etherscan.io/address/${deployedMinterAddresses[i]}#code

`;
  })
  .join("")}

**Metadata**

- **Starting Project Id:** ${deployDetails.startingProjectId}
- **Token Name:** ${deployDetails.tokenName}
- **Token Ticker:** ${deployDetails.tokenTicker}
- **Auto Approve Artist Split Proposals:** ${autoApproveArtistSplitProposals}
- **Render Provider Address, Primary Sales:** ${
      deployDetails.renderProviderAddress
    }
- **Platform Provider Address, Primary Sales:** ${
      deployDetails.platformProviderAddress
    }

**Other**

- **Add initial project?:** ${deployDetails.addInitialProject}
- **Add initial token?:** ${deployDetails.addInitialToken}
- **Image Bucket:** ${bucketName}

---

`;

    fs.writeFileSync(outputLogFile, outputMd, { flag: "as+" });
    console.log(`[INFO] Deployment details written to ${outputLogFile}`);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT CONFIG FILE BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // await syncContractBucketAndType(
    //   genArt721Core.address,
    //   bucketName,
    //   Contract_Type_Names_Enum.GenArt721CoreV3Engine
    // );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
