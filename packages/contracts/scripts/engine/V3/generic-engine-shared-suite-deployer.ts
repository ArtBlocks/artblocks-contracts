// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import hre, { platform } from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import path from "path";
import fs from "fs";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

import {
  syncContractMetadataAfterDeploy,
  syncProjectMetadataAfterDeploy,
} from "../../util/graphql-utils";

import {
  BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES,
  getActiveSharedMinterFilter,
  getActiveSharedRandomizer,
  getActiveCoreRegistry,
  EXTRA_DELAY_BETWEEN_TX,
} from "../../util/constants";
import { tryVerify } from "../../util/verification";
// image bucket creation
import { createEngineBucket } from "../../util/aws_s3";
// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs } from "../../util/utils";

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
 * configuring them to use the shared minter suite.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This configures the core contract to use the active shared minter
 * filter and active shared randomizer as defined in constants.ts
 */
async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/engine/V3/deployment-config.template.ts",
      "Engine deployment config file"
    );

  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VALIDATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  // @dev perform input validation for ALL deploy config details to avoid mid-deployment failures

  // Perform the following steps for each to-be-deployed contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];

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

    // verify a shared minter filter address is defined for network and environment
    // @dev throws if not found
    getActiveSharedMinterFilter(networkName, deployDetails.environment);

    // verify a shared randomizer address is defined for network and environment
    // @dev throws if not found
    getActiveSharedRandomizer(networkName, deployDetails.environment);

    // verify deployer wallet is allowed to add projects to the core registry contract
    // @dev throws if not found
    const activeCoreRegistryAddress = await getActiveCoreRegistry(
      networkName,
      deployDetails.environment
    );
    const coreRegistryContract = await ethers.getContractAt(
      "CoreRegistryV1",
      activeCoreRegistryAddress
    );
    const requiredDeployer = await coreRegistryContract.owner();
    if (requiredDeployer !== deployer.address) {
      throw new Error(
        `[ERROR] Active core registry address ${activeCoreRegistryAddress} is not owned by deployer wallet ${deployer.address}. Please use appropriate deployer wallet.`
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
    // ensure that the adminACL contract name is valid (i.e. the following doesn't throw)
    await ethers.getContractFactory(deployDetails.adminACLContractName);
    if (deployDetails.existingAdminACL) {
      // ensure a valid address
      ethers.utils.isAddress(deployDetails.existingAdminACL);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VALIDATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following steps for each to-be-deployed contract
  for (let index = 0; index < deployConfigDetailsArray.length; index++) {
    const deployDetails = deployConfigDetailsArray[index];
    const network = await ethers.provider.getNetwork();
    const networkName = network.name == "homestead" ? "mainnet" : network.name;
    const bytecodeStorageLibraryAddress =
      BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];
    const activeCoreRegistryAddress = await getActiveCoreRegistry(
      networkName,
      deployDetails.environment
    );

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

    // specify shared randomizer contract
    const randomizerAddress = getActiveSharedRandomizer(
      networkName,
      deployDetails.environment
    );
    console.log(`[INFO] Using shared Randomizer at ${randomizerAddress}`);

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
      autoApproveArtistSplitProposals,
      activeCoreRegistryAddress
    );

    await genArt721Core.deployed();
    console.log(
      `[INFO] Core ${deployDetails.genArt721CoreContractName} deployed at ${genArt721Core.address}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // register core contract on core registry
    let registeredContractOnCoreRegistry = false;
    try {
      const coreRegistryContract = await ethers.getContractAt(
        "CoreRegistryV1",
        activeCoreRegistryAddress
      );
      const coreType = await genArt721Core.coreType();
      const coreVersion = await genArt721Core.coreVersion();
      await coreRegistryContract
        .connect(deployer)
        .registerContract(
          genArt721Core.address,
          ethers.utils.formatBytes32String(coreVersion),
          ethers.utils.formatBytes32String(coreType)
        );
      console.log(
        `[INFO] Registered core contract ${genArt721Core.address} on core registry ${activeCoreRegistryAddress}`
      );
      registeredContractOnCoreRegistry = true;
    } catch (error) {
      console.error(
        `[ERROR] Failed to register core contract on core registry, please register manually!`
      );
      console.error(error);
    }
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // using shared minter suite, so no minter suite deployments

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (PER-CONTRACT) ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Set the Minter to MinterFilter on the Core contract.
    const minterFilterAddress = getActiveSharedMinterFilter(
      networkName,
      deployDetails.environment
    );
    await genArt721Core
      .connect(deployer)
      .updateMinterContract(minterFilterAddress);
    console.log(
      `[INFO] Updated the Minter Filter on the Core contract to ${minterFilterAddress}.`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

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

    // @dev no initial token option in this script, due to the complexity of
    // retrieving minters from the shared minter filter contract

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
          ONE_HUNDRED_PERCENT.sub(platformSplitPercentagePrimary).toNumber()
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
        deployDetails.renderProviderSplitPercentagePrimary ==
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
          TEN_THOUSAND_BASIS_POINTS.sub(platformSplitBPSSecondary).toNumber()
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
        deployDetails.renderProviderSplitBPSSecondary ==
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
    const adminACLFactory =
      await ethers.getContractFactory(adminACLContractName);
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

    // create image bucket
    let imageBucketCreated = false;
    // @dev initial bucket name of TBD to handle case of failure to generate bucket.
    // if bucket generation fails, TBD still enables output of DEPLOYMENTS file,
    // while making it clear that the bucket was not created
    let bucketName = "TBD";
    try {
      ({ bucketName } = await createEngineBucket(tokenName, networkName));
      console.log(`[INFO] Created image bucket ${bucketName}`);
      imageBucketCreated = true;
    } catch (error) {
      console.log(`[ERROR] Failed to create image bucket`);
    }

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

**Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${activeCoreRegistryAddress}#code

**Shared Minter Filter:** https://${etherscanSubdomain}etherscan.io/address/${minterFilterAddress}#code

**Minters:** All globally allowed minters on the shared minter filter contract may be used to mint tokens on the core contract.

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
- **Add initial token?:** false
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
    console.log(
      `[ACTION] provider primary and secondary sales payment addresses remain as deployer addresses: ${deployer.address}. Update later as needed.`
    );

    // Reminder to update adminACL superAdmin if needed
    const adminACLSuperAdmin = await adminACL.superAdmin();
    console.log(
      `[ACTION] AdminACL's superAdmin address is ${adminACLSuperAdmin}, don't forget to update if requred.`
    );

    if (!imageBucketCreated) {
      console.log(
        `[ACTION] Manually create an image bucket for ${tokenName} due to failure when this script was ran.`
      );
    }

    if (!registeredContractOnCoreRegistry) {
      console.log(
        `[ACTION] Due to script failure, please manually register the core contract on the core registry at ${activeCoreRegistryAddress}:`
      );
    }
    // extra delay to ensure all logs are written to files
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
