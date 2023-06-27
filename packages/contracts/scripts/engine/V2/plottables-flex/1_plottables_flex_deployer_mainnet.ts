// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

import { createEngineBucket } from "../../util/aws_s3";

/**
 * This script was created to deploy partner contracts to the goerli
 * testnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy contracts to a new network.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// FLEX contract file
import { GenArt721CoreV2PlottablesFlex__factory } from "../../contracts/factories/GenArt721CoreV2PlottablesFlex__factory";
import { GenArt721MinterPlottablesFlex__factory } from "../../contracts/factories/GenArt721MinterPlottablesFlex__factory";

// Details pulled from https://github.com/ArtBlocks/artblocks/issues/275 (private repo)
const tokenName = "Plottables Flex";
const tokenTicker = "PLOTSFLEX";
const transferAddress = "0x9f75C11383f5b93a72c61fb1Dd1a44f5Ec7e4187";
const artblocksAddress = "0x497702b81Ffc3Aa3535c84Af86Cfb5a8b367E1b2";
// Shared **mainnet** randomizer instance.
const randomizerAddress = "0x088098f7438773182b703625c4128aff85fcffc4";
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
  await createEngineBucket(tokenName, networkName);

  // Randomizer contract
  console.log(`Using shared randomizer at ${randomizerAddress}`);

  // deploy FLEX core contract
  const coreFactory = new GenArt721CoreV2PlottablesFlex__factory(deployer);
  const genArt721CoreFlex = await coreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress
  );
  await genArt721CoreFlex.deployed();
  console.log(`GenArt721CoreV2 FLEX deployed at ${genArt721CoreFlex.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721MinterPlottablesFlex__factory(
    deployer
  );
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
    network.name == "goerli"
  ) {
    console.log(`Detected testnet - Adding AB staff to the whitelist.`);
    const devAddresses = [
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63", // purplehat
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
