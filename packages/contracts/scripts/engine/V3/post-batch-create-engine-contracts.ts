// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import EngineFactory from "../../../../artifacts/contracts/engine/V3/EngineFactoryV0.sol/EngineFactoryV0.json";
import { EngineContractConfig } from "../../../deployments/engine/V3/studio/deployment-config.template";
// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay, getConfigInputs, getNetworkName } from "../../util/utils";
import { EXTRA_DELAY_BETWEEN_TX } from "../../util/constants";
import { syncContractMetadataAfterDeploy } from "../../util/graphql-utils";
import { createEngineBucket } from "../../util/aws_s3";

/**
 * This script was created to log, setup the S3 bucket, and sync any metadata off-chain
 * post-deployment of any Engine and Engine Flex contracts using the EngineFactoryV0.
 * The configuration used to create the Engine contracts should be updated with the
 * correct transaction hash and then used as input to this function.
 */
async function main() {
  // get configuration details
  const { deployConfigDetailsArray, inputFileDirectory } =
    await getConfigInputs(
      "deployments/engine/V3/deployment-config.template.ts",
      "Batch Engine deployment config file"
    );
  // fill out before running
  const config = {
    engineImplementationAddress: "",
    engineFlexImplementationAddress: "",
    coreRegistryAddress: "",
    engineFactoryAddress: "",
    environment: "",
  };

  // get accounts and network
  const [deployer] = await ethers.getSigners();
  const networkName = await getNetworkName();
  const outputSummaryFile = path.join(inputFileDirectory, "DEPLOYMENTS.md");
  const etherscanSubdomain = networkName === "mainnet" ? "" : `${networkName}.`;

  let outputMd = `
  # Batch Engine and Engine Flex Contract Deployments
  
  Date: ${new Date().toISOString()}
  
  ## **Network:** ${networkName}
  
  ## **Environment:** ${config.environment}
  
  **Engine Implementation:** https://${etherscanSubdomain}etherscan.io/address/${config.engineImplementationAddress}#code
  
  **Engine Flex Implementation:** https://${etherscanSubdomain}etherscan.io/address/${config.engineFlexImplementationAddress}#code
  
  **Engine Factory:** https://${etherscanSubdomain}etherscan.io/address/${config.engineFactoryAddress}#code
  
  **Core Registry:** https://${etherscanSubdomain}etherscan.io/address/${config.coreRegistryAddress}#code
  
  ---

  `;

  for (const engineContractConfiguration of deployConfigDetailsArray) {
    const {
      transactionHash,
      adminACLContract,
      engineCoreContractType,
      engineConfiguration,
      defaultVerticalName,
    } = engineContractConfiguration as EngineContractConfig;

    if (!transactionHash) {
      continue;
    }

    const engineFactory = new ethers.Contract(
      config.engineFactoryAddress,
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
    if (events.length > 0) {
      // extract contract address from the first matching event
      const event = events[0];
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
        // create image bucket
        let imageBucketCreated = false;
        // @dev initial bucket name of TBD to handle case of failure to generate bucket.
        // if bucket generation fails, TBD still enables output of DEPLOYMENTS file,
        // while making it clear that the bucket was not created
        let bucketName = "TBD";
        try {
          const result = await createEngineBucket(
            engineConfiguration.tokenName,
            networkName
          );
          bucketName = result.bucketName;
          console.log(`[INFO] Created image bucket ${bucketName}`);
          imageBucketCreated = true;
        } catch (error) {
          console.log(`[ERROR] Failed to create image bucket`);
        }

        if (!imageBucketCreated) {
          console.log(
            `[ACTION] Manually create an image bucket for ${engineConfiguration.tokenName} due to failure when this script was ran.`
          );
        }
        // hasura metadata upsert begins here
        await syncContractMetadataAfterDeploy(
          engineContractAddress,
          engineConfiguration.tokenName,
          bucketName,
          defaultVerticalName
        );
        // log deployment info
        outputMd += `**AdminACL:** https://${etherscanSubdomain}etherscan.io/address/${adminACLContract}#code
  
        **Engine Contract Type:** ${engineCoreContractType === 0 ? "Engine" : "Engine Flex"}
        
        **Engine Contract:** https://${etherscanSubdomain}etherscan.io/address/${engineContractAddress}#code
        
        **Metadata**
        - **Starting Project Id:** ${engineConfiguration.startingProjectId}
        - **Token Name:** ${engineConfiguration.tokenName}
        - **Token Ticker:** ${engineConfiguration.tokenSymbol}
        - **Auto Approve Artist Split Proposals:** ${engineConfiguration.autoApproveArtistSplitProposals}
        - **Render Provider Address, Primary Sales:** ${
          engineConfiguration.renderProviderAddress
        }
        - **Platform Provider Address, Primary Sales:** ${
          engineConfiguration.platformProviderAddress
        }

      **Other**

      - **Add initial project?:** false
      - **Add initial token?:** false
      - **Image Bucket:** ${bucketName}
        
        ---
      
        `;
      }
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
