// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
// flagship
import { GenArt721CoreV3__factory } from "../contracts/factories/GenArt721CoreV3__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import fs from "fs";
import path from "path";

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms]

import {
  getActiveSharedMinterFilter,
  getActiveSharedRandomizer,
  BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES,
  getActiveCoreRegistry,
} from "../util/constants";
import { MinterFilterV2__factory } from "../contracts";
import { createEngineBucket } from "../util/aws_s3";
import {
  syncContractMetadataAfterDeploy,
  syncProjectMetadataAfterDeploy,
} from "../util/graphql-utils";

async function main() {
  // get deployment configuration details
  const { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory } =
    await getConfigInputs(
      "deployments/flagship/V3/deployment-config.template.ts",
      "Flagship deployment config file"
    );

  if (deployConfigDetailsArray.length > 1) {
    throw new Error(
      "[ERROR] This script only supports deploying one core contract at a time"
    );
  }

  const deployDetails = deployConfigDetailsArray[0];

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  const tokenName = deployDetails.tokenName;
  const tokenTicker = deployDetails.tokenTicker;

  //////////////////////////////////////////////////////////////////////////////
  // INPUT VALIDATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

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

  const randomizerAddress = getActiveSharedRandomizer(
    networkName,
    deployDetails.environment
  );

  if (!randomizerAddress) {
    throw new Error(
      `[ERROR] No randomizer address found for network ${networkName} and environment ${deployDetails.environment}`
    );
  }

  const minterFilterAddress = getActiveSharedMinterFilter(
    networkName,
    deployDetails.environment
  );

  if (!minterFilterAddress) {
    throw new Error(
      `[ERROR] No minter filter address found for network ${networkName} and environment ${deployDetails.environment}`
    );
  }

  const minterFilter = MinterFilterV2__factory.connect(
    minterFilterAddress,
    ethers.provider
  );
  const adminACLAddress = await minterFilter.adminACLContract();

  if (!adminACLAddress) {
    throw new Error(
      `[ERROR] No admin ACL address found for network ${networkName} and environment ${deployDetails.environment}`
    );
  }

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

  const adminACL = AdminACLV0__factory.connect(adminACLAddress, deployer);
  const bytecodeStorageReaderAddress =
    BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];

  if (!bytecodeStorageReaderAddress) {
    throw new Error(
      `[ERROR] No bytecode storage reader address found for network ${networkName}`
    );
  }

  // //////////////////////////////////////////////////////////////////////////////
  // // INPUT VALIDATION ENDS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // //////////////////////////////////////////////////////////////////////////////
  // // DEPLOYMENT BEGINS HERE
  // //////////////////////////////////////////////////////////////////////////////

  // Deploy Core contract
  const genArt721CoreFactory = new GenArt721CoreV3__factory(
    {
      "contracts/libs/v0.8.x/BytecodeStorageV1.sol:BytecodeStorageReader":
        bytecodeStorageReaderAddress,
    },
    deployer
  );
  const genArt721Core = await genArt721CoreFactory.deploy(
    tokenName,
    deployDetails.tokenTicker,
    randomizerAddress,
    adminACLAddress,
    deployDetails.startingProjectId
  );
  await genArt721Core.deployed();
  await delay(EXTRA_DELAY_BETWEEN_TX);
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

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

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Sets MinterFilter as the minter for the contract
  await genArt721Core
    .connect(deployer)
    .updateMinterContract(minterFilterAddress);
  console.log(`[INFO] Updated the Minter Filter on the Core contract.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Art Blocks primary and secondary payment Addresses (if different than default deployer address).
  if (
    deployDetails.artblocksPrimarySalesAddress &&
    deployDetails.artblocksPrimarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      .updateArtblocksPrimarySalesAddress(
        deployDetails.artblocksPrimarySalesAddress
      );
    console.log(
      `[INFO] Updated the artblocks primary sales payment address to: ${deployDetails.artblocksPrimarySalesAddress}.`
    );
    delay(EXTRA_DELAY_BETWEEN_TX);
  } else {
    console.log(
      `[INFO] artblocks primary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }

  if (
    deployDetails.artblocksSecondarySalesAddress &&
    deployDetails.artblocksSecondarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      ["updateArtblocksSecondarySalesAddress(address)"](
        deployDetails.artblocksSecondarySalesAddress
      );
    console.log(
      `[INFO] Updated the artblocks secondary sales payment address to: ${deployDetails.artblocksSecondarySalesAddress}.`
    );
    delay(EXTRA_DELAY_BETWEEN_TX);
  } else {
    console.log(
      `[INFO] artblocks secondary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }

  // (optional) add initial project
  if (deployDetails.addInitialProject) {
    await genArt721Core.addProject(tokenName, deployer.address);
    console.log(
      `[INFO] Added initial project ${tokenName} on core contract at ${genArt721Core.address}.`
    );
  } else {
    console.log(`Did not add an initial project.`);
  }

  // update super admin address
  if (deployDetails.newSuperAdminAddress) {
    await adminACL
      .connect(deployer)
      .changeSuperAdmin(deployDetails.newSuperAdminAddress, [
        genArt721Core.address,
      ]);
  }

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  const standardVerify = "yarn hardhat verify";
  try {
    console.log(`[INFO] Verifying core contract contract deployment...`);
    await hre.run("verify:verify", {
      address: genArt721Core.address,
      constructorArguments: [
        tokenName, // name
        deployDetails.tokenTicker, // ticker
        randomizerAddress, // randomizer
        adminACLAddress, // admin acl
        deployDetails.startingProjectId, // starting project id
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
      "${randomizerAddress}", // randomizer
      "${adminACLAddress}", // admin acl
      ${deployDetails.startingProjectId}, // starting project id
    ];`
    );
    console.log(
      `${standardVerify} --network ${networkName} --constructor-args constructor-args.js ${genArt721Core.address}`
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENTS.md BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

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

  const outputSummaryFile = path.join(inputFileDirectory, "DEPLOYMENTS.md");
  const etherscanSubdomain = networkName === "mainnet" ? "" : `${networkName}.`;
  const outputMd = `
  # Deployment

  Date: ${new Date().toISOString()}

  ## **Network:** ${networkName}

  ## **Environment:** ${deployDetails.environment}

  **Deployment Input File:** \`${deploymentConfigFile}\`

  **GenArt721CoreV3:** https://${etherscanSubdomain}etherscan.io/address/${
    genArt721Core.address
  }#code

  **AdminACLV0:** https://${etherscanSubdomain}etherscan.io/address/${adminACLAddress}#code

  **Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${activeCoreRegistryAddress}#code

  **Shared Minter Filter:** https://${etherscanSubdomain}etherscan.io/address/${minterFilterAddress}#code

  **Minters:** All globally allowed minters on the shared minter filter contract may be used to mint tokens on the core contract.

  **Metadata**

  - **Starting Project Id:** ${deployDetails.startingProjectId}
  - **Token Name:** ${tokenName}
  - **Token Ticker:** ${tokenTicker}
  - **Art Blocks Address, Primary Sales:** ${
    deployDetails.artblocksPrimarySalesAddress
  }
  - **BytecodeStorageReader Library:** ${bytecodeStorageReaderAddress}

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
    tokenName, // contracts_metadata.name
    bucketName, // contracts_metadata.bucket_name
    "presents" // contracts_metadata.default_vertical_name (optional)
  );

  if (deployDetails.addInitialProject) {
    // also update the initial project's vertical name,
    // since likely missed default vertical name during initial sync
    await syncProjectMetadataAfterDeploy(
      genArt721Core.address, // core contract address
      deployDetails.startingProjectId, // project Id
      deployer.address, // project artist address
      "presents" // project vertical name
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // HASURA METADATA UPSERT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  delay(3000);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
