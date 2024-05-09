// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import EngineFactory from "../../../artifacts/contracts/engine/V3/EngineFactoryV0.sol/EngineFactoryV0.json";
import GenArt721CoreV3_Engine from "../../../artifacts/contracts/engine/V3/GenArt721CoreV3_Engine.sol/GenArt721CoreV3_Engine.json";
import GenArt721CoreV3_Engine_Flex from "../../../artifacts/contracts/engine/V3/GenArt721CoreV3_Engine_Flex.sol/GenArt721CoreV3_Engine_Flex.json";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs, getNetworkName } from "../../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../../util/constants";
import { syncContractMetadataAfterDeploy } from "../../util/graphql-utils";
import { createEngineBucket } from "../../util/aws_s3";
import {
  getActiveEngineImplementations,
  getActiveEngineFactoryAddress,
  getActiveCoreRegistry,
} from "../../util/constants";
/**
 * This script was created to log, setup the S3 bucket, and sync any metadata off-chain
 * post-deployment of any Engine and Engine Flex contracts using the EngineFactoryV0.
 * The configuration used to create the Engine contracts should be updated with the
 * correct transaction hash and then used as input to this function.
 */
async function main() {
  // get configuration details
  const {
    deployConfigDetailsArray,
    deployNetworkConfiguration,
    inputFileDirectory,
  } = await getConfigInputs(
    "deployments/engine/V3/studio/deployment-config.template.ts",
    "Batch Engine deployment config file"
  );

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  const outputSummaryFile = path.join(inputFileDirectory, "DEPLOYMENTS.md");
  const etherscanSubdomain = networkName === "mainnet" ? "" : `${networkName}.`;

  if (!deployNetworkConfiguration?.environment) {
    throw new Error(
      `[ERROR] Environment must be defined in the deployNetworkConfiguration`
    );
  }

  const engineFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    deployNetworkConfiguration.environment
  );

  const {
    activeEngineImplementationAddress,
    activeEngineFlexImplementationAddress,
  } = await getActiveEngineImplementations(
    networkName,
    deployNetworkConfiguration.environment
  );

  const coreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    deployNetworkConfiguration.environment
  );

  let outputMd = `
  # Batch Engine and Engine Flex Contract Deployments
  
  Date: ${new Date().toISOString()}
  
  ## **Network:** ${networkName}
  
  ## **Environment:** ${deployNetworkConfiguration.environment}
  
  **Engine Implementation:** https://${etherscanSubdomain}etherscan.io/address/${activeEngineImplementationAddress}#code
  
  **Engine Flex Implementation:** https://${etherscanSubdomain}etherscan.io/address/${activeEngineFlexImplementationAddress}#code
  
  **Engine Factory:** https://${etherscanSubdomain}etherscan.io/address/${engineFactoryAddress}#code
  
  **Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${coreRegistryAddress}#code
  
  ---

  `;

  const { transactionHash } = deployNetworkConfiguration;

  if (!transactionHash) {
    throw new Error(
      `[ERROR] Transaction hash must be defined in deployNetworkConfiguration`
    );
  }

  for (let i = 0; i < deployConfigDetailsArray.length; i++) {
    const {
      engineCoreContractType,
      tokenName,
      tokenTicker,
      renderProviderAddress,
      platformProviderAddress,
      newSuperAdminAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      nullPlatformProvider,
      allowArtistProjectActivation,
      adminACLContract,
      defaultVerticalName,
    } = deployConfigDetailsArray[i];

    // verify token name is defined for image bucket creation
    if (!tokenName) {
      throw new Error(`[ERROR] Token name not defined.`);
    }

    const engineFactory = new ethers.Contract(
      engineFactoryAddress,
      EngineFactory.abi,
      deployer
    );
    const filter = engineFactory.filters.EngineContractCreated();
    const receipt =
      await ethers.provider.getTransactionReceipt(transactionHash);
    const txBlockNumber = receipt.blockNumber;

    const events = await engineFactory.queryFilter(
      filter,
      txBlockNumber,
      txBlockNumber
    );

    if (!events.length || events.length < i) {
      throw new Error(
        `[ERROR] No events found or mis-match between events and number of contract deployments in deployNetworkConfiguration`
      );
    }

    // extract contract address from the event matching the deployment config
    const event = events[i];
    const engineContractAddress = event?.args?.engineContract;

    if (engineContractAddress) {
      // verify the default vertical is not fullyonchain if using Engine Flex
      if (
        defaultVerticalName == "fullyonchain" &&
        engineCoreContractType == 1 // Engine Flex
      ) {
        throw new Error(
          `[ERROR] The default vertical cannot be fullyonchain if using the flex engine`
        );
      }

      // verify the default vertical is not flex if using Engine
      if (
        defaultVerticalName == "flex" &&
        engineCoreContractType == 0 // Engine
      ) {
        throw new Error(
          `[ERROR] The default vertical cannot be flex if not using the flex engine`
        );
      }
      // Get Admin ACL Address on Engine Contract
      let engineContract;
      if (engineCoreContractType === 0) {
        engineContract = new ethers.Contract(
          engineContractAddress,
          GenArt721CoreV3_Engine.abi,
          deployer
        );
      } else {
        engineContract = new ethers.Contract(
          engineContractAddress,
          GenArt721CoreV3_Engine_Flex.abi,
          deployer
        );
      }

      const adminACLContractAddress = await engineContract.adminACLContract();

      // create image bucket
      let imageBucketCreated = false;
      // @dev initial bucket name of TBD to handle case of failure to generate bucket.
      // if bucket generation fails, TBD still enables output of DEPLOYMENTS file,
      // while making it clear that the bucket was not created
      let bucketName = "TBD";
      try {
        const result = await createEngineBucket(tokenName, networkName);
        bucketName = result.bucketName;
        console.log(`[INFO] Created image bucket ${bucketName}`);
        imageBucketCreated = true;
      } catch (error) {
        console.log(`[ERROR] Failed to create image bucket`);
      }

      if (!imageBucketCreated) {
        console.log(
          `[ACTION] Manually create an image bucket for ${tokenName} due to failure when this script was ran.`
        );
      }
      // hasura metadata upsert begins here
      await syncContractMetadataAfterDeploy(
        engineContractAddress,
        tokenName,
        bucketName,
        defaultVerticalName
      );
      // log deployment info
      outputMd += `
        ## Deployment: ${engineCoreContractType === 0 ? "Engine" : "Engine Flex"} | ${engineContractAddress}
  
        **Engine Contract:** https://${etherscanSubdomain}etherscan.io/address/${engineContractAddress}#code
        
        **Metadata**
        - **Starting Project Id:** ${startingProjectId}
        - **Token Name:** ${tokenName}
        - **Token Ticker:** ${tokenTicker}
        - **Auto Approve Artist Split Proposals:** ${autoApproveArtistSplitProposals}
        - **Render Provider Address, Primary Sales:** ${renderProviderAddress}
        - **Platform Provider Address, Primary Sales:** ${platformProviderAddress}
        - **Null Platform Provider:** ${nullPlatformProvider}
        - **Allow Artist Project Activation:** ${allowArtistProjectActivation}
        - **Admin ACL Contract:** ${adminACLContractAddress}
        - **Super Admin Address:** ${newSuperAdminAddress}        

      **Other**

      - **Starting project ID:** ${startingProjectId}
      - **Image Bucket:** ${bucketName}
        
        ---
      
        `;
    } else {
      console.log("Error: No contract address found in event args");
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENTS.md BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

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
