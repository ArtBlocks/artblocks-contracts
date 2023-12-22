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
// non-flex contract file
import { GenArt721CoreV2_PBAB__factory } from "../../../contracts/factories/engine/V2/GenArt721CoreV2_PBAB__factory";
import { GenArt721Minter_PBAB__factory } from "../../../contracts/factories/engine/V2/GenArt721Minter_PBAB__factory";

// Details
const pbabTokenName = "newrafael.work";
const pbabTokenTicker = "RAFAEL";
const pbabTransferAddress = "0x0F441cFaD93287109F5eF834bF52F4aaaa8d8ffa";
const rendererProviderAddress = "0x00df4E8d293d57718aac0B18cBfBE128c5d484Ef";
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
    ({ bucketName } = await createEngineBucket(pbabTokenName, networkName));
    console.log(`[INFO] Created image bucket ${bucketName}`);
    imageBucketCreated = true;
  } catch (error) {
    console.log(`[ERROR] Failed to create image bucket`);
  }

  // Deploy Core contract.
  const genArt721CoreFactory = new GenArt721CoreV2_PBAB__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerAddress,
    0
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721Minter_PBAB__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721Core.address
  );

  await genArt721Minter.deployed();
  console.log(`Minter deployed at ${genArt721Minter.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .addMintWhitelisted(genArt721Minter.address);
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await genArt721Core
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress);
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  // Set Minter owner.
  await genArt721Minter.connect(deployer).setOwnerAddress(pbabTransferAddress);
  console.log(`Set the Minter owner to: ${pbabTransferAddress}.`);

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
      const tx = await genArt721Core
        .connect(deployer)
        .addWhitelisted(devAddresses[i]);
      await tx.wait();

      console.log(`Allowlisted ${devAddresses[i]} on the Core contract.`);
      delay(EXTRA_DELAY_BETWEEN_TX);
    }
  }

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Output instructions for manual Etherscan verification.
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerAddress} 0`
  );
  console.log(`Verify GenArt721Minter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Minter.address} ${genArt721Core.address}`
  );
  // try to verify
  await tryVerify(
    "GenArt721CoreV2_PBAB",
    genArt721Core.address,
    [pbabTokenName, pbabTokenTicker, randomizerAddress, 0],
    networkName
  );
  await tryVerify(
    "GenArt721Minter_PBAB",
    genArt721Minter.address,
    [genArt721Core.address],
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
