// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// delay to avoid issues with reorgs and tx failures
import { delay } from "../../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

import { createEngineBucket } from "../../../util/aws_s3";
import { tryVerify } from "../../../util/verification";

/**
 * This script was created to deploy partner contracts to the sepolia
 * testnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy contracts to a new network.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// FLEX contract file
import { GenArt721CoreV2_ENGINE_FLEX__factory } from "../../../contracts/factories/engine/V2/GenArt721CoreV2_ENGINE_FLEX__factory";
import { GenArt721Minter_PBAB__factory } from "../../../contracts/factories/engine/V2/GenArt721Minter_PBAB__factory";

// Details pulled from goerli deployment
const tokenName = "AB Dev Sepolia V2 Engine - Flex";
const tokenTicker = "DEVV2FlexSEP";
const transferAddress = "3c6412fee019f5c50d6f03aa6f5045d99d9748c4";
const artblocksAddress = "3c6412fee019f5c50d6f03aa6f5045d99d9748c4";
// Shared **goerli** randomizer instance.
const randomizerAddress = "0xb4CBEE71aA18f28fdD49837e0a1038935F54931a";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Setup S3 bucket.
  // @dev initial bucket name of TBD to handle case of failure to generate bucket.
  // if bucket generation fails, TBD still enables output of DEPLOYMENTS file,
  // while making it clear that the bucket was not created
  let bucketName = "TBD";
  let imageBucketCreated = false;
  try {
    ({ bucketName } = await createEngineBucket(tokenName, networkName));
    console.log(`[INFO] Created image bucket ${bucketName}`);
    imageBucketCreated = true;
  } catch (error) {
    console.log(`[ERROR] Failed to create image bucket`);
  }

  // Randomizer contract
  console.log(`Using shared randomizer at ${randomizerAddress}`);

  // deploy FLEX core contract
  const coreFactory = new GenArt721CoreV2_ENGINE_FLEX__factory(deployer);
  const genArt721CoreFlex = await coreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress
  );
  await genArt721CoreFlex.deployed();
  console.log(`GenArt721CoreV2 FLEX deployed at ${genArt721CoreFlex.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721Minter_PBAB__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721CoreFlex.address
  );

  await genArt721Minter.deployed();
  console.log(`Minter deployed at ${genArt721Minter.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////
  let tx = null;
  // Allowlist the Minter on the Core contract.
  tx = await genArt721CoreFlex
    .connect(deployer)
    .addMintWhitelisted(genArt721Minter.address);
  await tx.wait();
  console.log(`Allowlisted the Minter on the Core contract.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Art Blocks Address.
  tx = await genArt721CoreFlex
    .connect(deployer)
    .updateRenderProviderAddress(artblocksAddress);
  await tx.wait();
  console.log(`Updated the artblocks address to: ${artblocksAddress}.`);

  // Set Minter owner.
  tx = await genArt721Minter.connect(deployer).setOwnerAddress(transferAddress);
  console.log(`Set the Minter owner to: ${transferAddress}.`);
  await tx.wait();

  delay(EXTRA_DELAY_BETWEEN_TX);

  // Allowlist AB staff (testnet only)
  if (
    network.name == "ropsten" ||
    network.name == "rinkeby" ||
    network.name == "goerli" ||
    network.name == "sepolia"
  ) {
    console.log(`Detected testnet - Adding AB staff to the whitelist.`);
    const devAddresses = [
      "0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0", // dogbot
      "0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928", // ben_thank_you
    ];
    for (let i = 0; i < devAddresses.length; i++) {
      tx = await genArt721CoreFlex
        .connect(deployer)
        .addWhitelisted(devAddresses[i]);
      await tx.wait();

      console.log(`Allowlisted ${devAddresses[i]} on the Core contract.`);
      delay(EXTRA_DELAY_BETWEEN_TX);
    }
  }

  // Allowlist new owner.
  tx = await genArt721CoreFlex
    .connect(deployer)
    .addWhitelisted(transferAddress);
  await tx.wait();

  console.log(`Allowlisted Core contract access for: ${transferAddress}.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Transfer Core contract to new owner.
  tx = await genArt721CoreFlex.connect(deployer).updateAdmin(transferAddress);
  await tx.wait();
  console.log(`Transferred Core contract admin to: ${transferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify core contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721CoreFlex.address} "${tokenName}" "${tokenTicker}" ${randomizerAddress}`
  );
  console.log(`Verify Minter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Minter.address} ${genArt721CoreFlex.address}`
  );
  // try to verify
  await tryVerify(
    "GenArt721CoreV2_ENGINE_FLEX",
    genArt721CoreFlex.address,
    [tokenName, tokenTicker, randomizerAddress],
    networkName
  );
  await tryVerify(
    "GenArt721Minter_PBAB",
    genArt721Minter.address,
    [genArt721CoreFlex.address],
    networkName
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
