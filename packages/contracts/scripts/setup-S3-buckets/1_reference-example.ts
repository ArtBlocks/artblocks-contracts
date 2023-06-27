// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
import { ethers } from "hardhat";
import { createEngineBucket } from "../util/aws_s3";

/**
 * This script was created as a reference of how to setup a new S3 bucket for a new contract
 */
const tokenName = "Art Blocks Explorations";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  // Setup S3 bucket.
  await createEngineBucket(tokenName, networkName);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
