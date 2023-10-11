// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import hre, { platform } from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import path from "path";
import fs from "fs";
var util = require("util");
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);
import prompt from "prompt";

import {
  syncContractMetadataAfterDeploy,
  syncProjectMetadataAfterDeploy,
} from "../../../util/graphql-utils";

import {
  DELEGATION_REGISTRY_ADDRESSES,
  BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES,
  DEPRECATED_ENGINE_REGISTRIES,
  EXTRA_DELAY_BETWEEN_TX,
} from "../../../util/constants";
import { tryVerify } from "../../../util/verification";
// image bucket creation
import { createEngineBucket } from "../../../util/aws_s3";
// delay to avoid issues with reorgs and tx failures
import { delay, getAppPath } from "../../../util/utils";
const MANUAL_GAS_LIMIT = 500000; // gas
var log_stdout = process.stdout;

const ONE_HUNDRED_PERCENT = BigNumber.from(100);
const TEN_THOUSAND_BASIS_POINTS = BigNumber.from(10000);

// These are the core contracts that may be deployed by this script.
const SUPPORTED_CORE_CONTRACTS = [
  "GenArt721CoreV3_Engine",
  "GenArt721CoreV3_Engine_Flex",
  "GenArt721CoreV3_Engine_Flex_PROOF",
  "GenArt721CoreV3_Engine_Flex_PROHIBITION",
];

/**
 * This script was created to deploy the V3 core Engine contracts,
 * including the associated minter suite, to the Ethereum goerli testnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
async function main() {
  // get repo's root directory absolute path
  const appPath = await getAppPath();
  console.log(appPath);
  console.log(
    `[INFO] example deployment config file is:\n\ndeployments/engine/V3/partners/dev-example/deployment-config.dev.ts\n`
  );
  prompt.start();
  const deploymentConfigFile = (
    await prompt.get<{ from: string }>(["deployment config file"])
  )["deployment config file"];
  // dynamically import input deployment configuration details
  const fullDeploymentConfigPath = path.join(appPath, deploymentConfigFile);
  let deployDetailsArray;
  const fullImportPath = path.join(fullDeploymentConfigPath);
  const inputFileDirectory = path.dirname(fullImportPath);
  try {
    ({ deployDetailsArray } = await import(fullImportPath));
  } catch (error) {
    throw new Error(
      `[ERROR] Unable to import deployment configuration file at: ${fullDeploymentConfigPath}
      Please ensure the file exists (e.g. deployments/engine/V3/partners/dev-example/deployment-config.dev.ts)`
    );
  }
  // record all deployment logs to a file, monkey-patching stdout
  const pathToMyLogFile = path.join(inputFileDirectory, "DEPLOYMENT_LOGS.log");
  var myLogFileStream = fs.createWriteStream(pathToMyLogFile, { flags: "a+" });
  var log_stdout = process.stdout;
  console.log = function (d) {
    myLogFileStream.write(util.format(d) + "\n");
    log_stdout.write(util.format(d) + "\n");
  };
  // record relevant deployment information in logs
  console.log(`----------------------------------------`);
  console.log(`[INFO] Datetime of deployment: ${new Date().toISOString()}`);
  console.log(
    `[INFO] Deployment configuration file: ${fullDeploymentConfigPath}`
  );

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

    // verify intended environment
    if (process.env.NODE_ENV === deployDetails.environment) {
      console.log(
        `[INFO] Deploying to environment: ${deployDetails.environment}`
      );
    } else {
      throw new Error(
        `[ERROR] The deployment config indicates environment ${deployDetails.environment}, but script is being run in environment ${process.env.NODE_ENV}`
      );
    }

    // verify deployer wallet is the same as the one used to deploy the engine registry
    const targetDeployerAddress =
      DEPRECATED_ENGINE_REGISTRIES[networkName][
        deployDetails.engineRegistryAddress
      ];
    if (targetDeployerAddress == undefined) {
      throw new Error(
        `[ERROR] Engine registry address ${deployDetails.engineRegistryAddress} is not configured for deployment on network ${networkName}, please update DEPRECATED_ENGINE_REGISTRIES`
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

    // verify that default vertical is not fullyonchain if using the flex engine
    if (
      deployDetails.defaultVerticalName == "fullyonchain" &&
      deployDetails.genArt721CoreContractName.includes("Flex")
    ) {
      throw new Error(
        `[ERROR] The default vertical cannot be fullyonchain if using the flex engine`
      );
    }
    // verify that the default vertical is not flex if not using a flex engine
    if (
      deployDetails.defaultVerticalName == "flex" &&
      !deployDetails.genArt721CoreContractName.includes("Flex")
    ) {
      throw new Error(
        `[ERROR] The default vertical cannot be flex if not using a flex engine`
      );
    }

    // verify that there is a valid bytecode storage reader library address for the network
    const bytecodeStorageLibraryAddress =
      BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];
    if (!bytecodeStorageLibraryAddress) {
      throw new Error(
        `[ERROR] No bytecode storage reader library address configured for network ${networkName}`
      );
    }

    // verify a sensible AdminACL input config
    if (deployDetails.existingAdminACL) {
      // ensure a valid address
      ethers.utils.isAddress(deployDetails.existingAdminACL);
      // ensure we have a factory for adminACLContractName, because we use it in this script
      const _adminACLContractName = deployDetails.adminACLContractName;
      // @dev getContractFactory throws if no factory is found for _adminACLContractName
      await ethers.getContractFactory(_adminACLContractName);
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
    // Ensure that BytecodeStorageReader library is linked in the process
    const genArt721CoreFactory = await ethers.getContractFactory(
      deployDetails.genArt721CoreContractName,
      {
        libraries: {
          BytecodeStorageReader: bytecodeStorageLibraryAddress,
        },
      }
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
      autoApproveArtistSplitProposals
    );

    await genArt721Core.deployed();
    console.log(
      `[INFO] Core ${deployDetails.genArt721CoreContractName} deployed at ${genArt721Core.address}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // register core contract on engine registry
    let registeredContractOnEngineRegistry = false;
    try {
      // @dev assume EngineRegistryV0 since this is not deploying a shared minter suite
      const engineRegistryFactory =
        await ethers.getContractFactory("EngineRegistryV0");
      const engineRegistry = engineRegistryFactory.attach(
        deployDetails.engineRegistryAddress
      );
      const coreType = await genArt721Core.coreType();
      const coreVersion = await genArt721Core.coreVersion();
      await engineRegistry
        .connect(deployer)
        .registerContract(
          genArt721Core.address,
          ethers.utils.formatBytes32String(coreVersion),
          ethers.utils.formatBytes32String(coreType)
        );
      console.log(
        `[INFO] Registered core contract ${genArt721Core.address} on engine registry ${deployDetails.engineRegistryAddress}`
      );
      registeredContractOnEngineRegistry = true;
    } catch (error) {
      console.error(
        `[ERROR] Failed to register core contract on engine registry, please register manually!`
      );
      console.error(error);
    }
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
        deployer.address // Use `deployer.address` as placeholder for project 0 artist
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

    // update split percentages if something other than the default is provided
    // primary sales
    if (deployDetails.renderProviderSplitPercentagePrimary) {
      // a render provider split percentage override was provided
      // get current platform provider split percentage
      const platformSplitPercentagePrimary =
        await genArt721Core.platformProviderPrimarySalesPercentage();
      if (
        deployDetails.renderProviderSplitPercentagePrimary < 0 ||
        deployDetails.renderProviderSplitPercentagePrimary >
          ONE_HUNDRED_PERCENT.sub(platformSplitPercentagePrimary)
      ) {
        console.log(
          `[ERROR] renderProviderSplitPercentagePrimary must be between 0 and ${ONE_HUNDRED_PERCENT.sub(
            platformSplitPercentagePrimary
          ).toNumber()}, but is ${
            deployDetails.renderProviderSplitPercentagePrimary
          }`
        );
        console.log(
          `[ACTION] Please manually configure the render provider split percentage on the core contract to a valid value.`
        );
      }
      const currentRenderProviderSplitPercentagePrimary =
        await genArt721Core.renderProviderPrimarySalesPercentage();
      if (
        parseInt(deployDetails.renderProviderSplitPercentagePrimary) ==
        currentRenderProviderSplitPercentagePrimary.toNumber()
      ) {
        console.log(
          `[INFO] Skipping update of render provider split percentage primary, since it is already equal to the value of ${currentRenderProviderSplitPercentagePrimary.toNumber()}.`
        );
      } else {
        await genArt721Core
          .connect(deployer)
          .updateProviderPrimarySalesPercentages(
            deployDetails.renderProviderSplitPercentagePrimary,
            platformSplitPercentagePrimary
          );
        console.log(
          `[INFO] Updated render provider split percentage primary to ${
            deployDetails.renderProviderSplitPercentagePrimary
          } percent, maintained platform split as ${platformSplitPercentagePrimary.toNumber()} percent.`
        );
      }
    }
    // secondary sales
    if (deployDetails.renderProviderSplitBPSSecondary) {
      // a render provider split percentage override was provided
      // get current platform provider split percentage
      const platformSplitBPSSecondary =
        await genArt721Core.platformProviderSecondarySalesBPS();
      if (
        deployDetails.renderProviderSplitBPSSecondary < 0 ||
        deployDetails.renderProviderSplitBPSSecondary >
          TEN_THOUSAND_BASIS_POINTS.sub(platformSplitBPSSecondary)
      ) {
        console.log(
          `[ERROR] renderProviderSplitBPSSecondary must be between 0 and ${TEN_THOUSAND_BASIS_POINTS.sub(
            platformSplitBPSSecondary
          ).toNumber()}, but is ${
            deployDetails.renderProviderSplitBPSSecondary
          }`
        );
        console.log(
          `[ACTION] Please manually configure the render provider split percentage on the core contract to a valid value.`
        );
      }
      const currentRenderProviderSplitBPSSecondary =
        await genArt721Core.renderProviderSecondarySalesBPS();
      if (
        parseInt(deployDetails.renderProviderSplitBPSSecondary) ==
        currentRenderProviderSplitBPSSecondary.toNumber()
      ) {
        console.log(
          `[INFO] Skipping update of render provider split percentage secondary, since it is already equal to the value of ${currentRenderProviderSplitBPSSecondary.toNumber()}.`
        );
      } else {
        await genArt721Core
          .connect(deployer)
          .updateProviderSecondarySalesBPS(
            deployDetails.renderProviderSplitBPSSecondary,
            platformSplitBPSSecondary
          );
        console.log(
          `[INFO] Updated render provider split percentage secondary to ${
            deployDetails.renderProviderSplitBPSSecondary
          } BPS, maintained platform split as ${platformSplitBPSSecondary.toNumber()} BPS.`
        );
      }
    }

    // transfer superAdmin role on adminACL
    let adminACL: Contract;
    // @dev - we only use functionality in AdminACLV0, so fine to cast as AdminACLV0 here
    let adminACLContractName = "AdminACLV0";
    if (deployDetails.existingAdminACL) {
      adminACLContractName = deployDetails.adminACLContractName;
    }
    const adminACLFactory = await ethers.getContractFactory(
      adminACLContractName
    );
    adminACL = adminACLFactory.attach(adminACLAddress);
    if (deployDetails.doTransferSuperAdmin) {
      // transfer superAdmin role on adminACL, triggering indexing update on new core contract
      await adminACL
        .connect(deployer)
        .changeSuperAdmin(deployDetails.newSuperAdminAddress, [
          genArt721Core.address,
        ]);
      console.log(
        `[INFO] Transferred superAdmin role on adminACL to ${deployDetails.newSuperAdminAddress}.`
      );
      await delay(EXTRA_DELAY_BETWEEN_TX);
    } else {
      console.log(`[INFO] Skipping transfer of superAdmin role on adminACL.`);
    }

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
      ];`
      );
      console.log(
        `${standardVerify} --network ${networkName} --constructor-args constructor-args.js ${genArt721Core.address}`
      );
    }
    // ADMIN ACL CONTRACT
    if (deployDetails.existingAdminACL == undefined) {
      // only verify if we deployed a new adminACL contract
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
    const { bucketName } = await createEngineBucket(tokenName, networkName);
    console.log(`[INFO] Created image bucket ${bucketName}`);

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
# Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.genArt721CoreContractName
    }:** https://${etherscanSubdomain}etherscan.io/address/${
      genArt721Core.address
    }#code

**${
      deployDetails.adminACLContractName
    }:** https://${etherscanSubdomain}etherscan.io/address/${adminACLAddress}#code

**Engine Registry:** https://${etherscanSubdomain}etherscan.io/address/${
      deployDetails.engineRegistryAddress
    }#code

**${
      deployDetails.minterFilterContractName
    }:** https://${etherscanSubdomain}etherscan.io/address/${
      minterFilter.address
    }#code

**Minters:**

${deployedMinterNames
  .map((minterName, i) => {
    return `**${minterName}:** https://${etherscanSubdomain}etherscan.io/address/${deployedMinterAddresses[i]}#code

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
- **BytecodeStorageReader Library:** ${bytecodeStorageLibraryAddress}

**Other**

- **Add initial project?:** ${deployDetails.addInitialProject}
- **Add initial token?:** ${deployDetails.addInitialToken}
- **Image Bucket:** ${bucketName}

---

`;

    fs.writeFileSync(outputSummaryFile, outputMd, { flag: "as+" });
    console.log(`[INFO] Deployment details written to ${outputSummaryFile}`);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // HASURA METADATA UPSERT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    await syncContractMetadataAfterDeploy(
      genArt721Core.address, // contracts_metadata.address
      deployDetails.tokenName, // contracts_metadata.name
      bucketName, // contracts_metadata.bucket_name
      deployDetails.defaultVerticalName // contracts_metadata.default_vertical_name (optional)
    );

    if (deployDetails.addInitialProject) {
      // also update the initial project's vertical name,
      // since likely missed default vertical name during initial sync
      await syncProjectMetadataAfterDeploy(
        genArt721Core.address, // core contract address
        deployDetails.startingProjectId, // project Id
        deployer.address, // project artist address
        deployDetails.defaultVerticalName // project vertical name
      );
    }
    //////////////////////////////////////////////////////////////////////////////
    // HASURA METADATA UPSERT ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // FOLLOW-ON ACTIONS BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Reminder to update provider payment addresses that are left as the deployer for now.
    if (renderProviderAddress === deployer.address) {
      console.log(
        `[ACTION] render provider sales payment addresses remain as deployer addresses: ${deployer.address}. Update later as needed.`
      );
    }
    if (platformProviderAddress === deployer.address) {
      console.log(
        `[ACTION] platform provider sales payment addresses remain as deployer addresses: ${deployer.address}. Update later as needed.`
      );
    }

    if (!registeredContractOnEngineRegistry) {
      console.log(
        `[ACTION] Due to script failure, please manually register the core contract on the engine registry at ${deployDetails.engineRegistryAddress}:`
      );
    }

    // Reminder to update adminACL superAdmin if needed
    const adminACLSuperAdmin = await adminACL.superAdmin();
    console.log(
      `[ACTION] AdminACL's superAdmin address is ${adminACLSuperAdmin}, don't forget to update if required.`
    );

    // reminder to add to subgraph config if desire to index minter filter
    console.log(
      `[ACTION] Subgraph: Add Minter Filter and Minter contracts to subgraph config if desire to index minter suite.`
    );
    // delay to finish logging to file
    await delay(1000);

    //////////////////////////////////////////////////////////////////////////////
    // FOLLOW-ON ACTIONS ENDS HERE
    //////////////////////////////////////////////////////////////////////////////
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
