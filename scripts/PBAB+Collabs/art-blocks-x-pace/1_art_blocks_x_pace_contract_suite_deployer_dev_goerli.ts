// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { BasicRandomizer__factory } from "../../contracts/factories/BasicRandomizer__factory";
// minter suite
import { MinterFilterV0__factory } from "../../contracts/factories/MinterFilterV0__factory";
import { MinterSetPriceV1__factory } from "../../contracts/factories/MinterSetPriceV1__factory";
import { MinterSetPriceERC20V1__factory } from "../../contracts/factories/MinterSetPriceERC20V1__factory";
import { MinterDALinV1__factory } from "../../contracts/factories/MinterDALinV1__factory";
import { MinterDAExpV1__factory } from "../../contracts/factories/MinterDAExpV1__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy partner contracts to the goerli
 * testnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy contracts to a new network.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// prtnr contract file
import { GenArt721CoreV2ArtBlocksXPace__factory } from "../../contracts/factories/GenArt721CoreV2ArtBlocksXPace__factory";
// config info
const tokenName = "Art Blocks x Pace Dev (Goerli)";
const tokenTicker = "ABXPACE_DEV_GOERLI";
const transferAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const artblocksAddress = "0x00000000000730639587DCC1541C04406fFe4B7D";
const randomizerAddress = "0xEC5DaE4b11213290B2dBe5295093f75920bD2982";
// (optional) add initial project
const doAddProjectZero = true;
const projectZeroName = "projectZeroTestPRTNR";
const artistAddress = "0x00000000000730639587DCC1541C04406fFe4B7D";
const pricePerTokenInWei = 0;
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

  // Randomizer contract
  console.log(`Using shared randomizer at ${randomizerAddress}`);

  // deploy PRTNR core contract
  const genArt721CorePRTNRFactory = new GenArt721CoreV2ArtBlocksXPace__factory(
    deployer
  );
  const genArt721CorePRTNR = await genArt721CorePRTNRFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress
  );
  await genArt721CorePRTNR.deployed();
  console.log(
    `GenArt721CoreV2_PRTNR deployed at ${genArt721CorePRTNR.address}`
  );

  // deploy PRTNR minter filter
  const minterFilterFactory = new MinterFilterV0__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(
    genArt721CorePRTNR.address
  );
  await minterFilter.deployed();
  console.log(`Minter Filter for PRTNR deployed at ${minterFilter.address}`);

  // Deploy Minter Suite contracts
  // set price V1
  const minterSetPriceFactory = new MinterSetPriceV1__factory(deployer);
  const minterSetPrice = await minterSetPriceFactory.deploy(
    genArt721CorePRTNR.address,
    minterFilter.address
  );
  await minterSetPrice.deployed();
  console.log(
    `MinterSetPrice V1 for PRTNR deployed at ${minterSetPrice.address}`
  );
  // set price ERC20 V1
  const minterSetPriceERC20Factory = new MinterSetPriceERC20V1__factory(
    deployer
  );
  const minterSetPriceERC20 = await minterSetPriceERC20Factory.deploy(
    genArt721CorePRTNR.address,
    minterFilter.address
  );
  await minterSetPriceERC20.deployed();
  console.log(
    `MinterSetPrice ERC20 V1 for PRTNR deployed at ${minterSetPriceERC20.address}`
  );
  // DA Lin V1
  const MinterDALin__factory = new MinterDALinV1__factory(deployer);
  const minterDALin = await MinterDALin__factory.deploy(
    genArt721CorePRTNR.address,
    minterFilter.address
  );
  await minterDALin.deployed();
  console.log(`Minter DA Lin V1 for PRTNR deployed at ${minterDALin.address}`);
  // DA Exp V1
  const MinterDAExp__factory = new MinterDAExpV1__factory(deployer);
  const minterDAExp = await MinterDAExp__factory.deploy(
    genArt721CorePRTNR.address,
    minterFilter.address
  );
  await minterDAExp.deployed();
  console.log(`Minter DA Exp V1 for PRTNR deployed at ${minterDAExp.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721CorePRTNR
    .connect(deployer)
    .addMintWhitelisted(minterFilter.address);
  console.log(`Allowlisted the Minter Filter on the Core contract.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Art Blocks Address.
  await genArt721CorePRTNR
    .connect(deployer)
    .updateRenderProviderAddress(artblocksAddress);
  console.log(`Updated the artblocks address to: ${artblocksAddress}.`);
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
      "0x238DE1C33DFBa6eeC40C3C71e991dC844A4D4Bad",
      "0x26fA34bf9fe08C74a27aae43f92F9FAd88c3ba8E",
      "0x2A98FCD155c9Da4A28BdB32acc935836C233882A",
      "0x6aB56Ac1F498eddcf42637B4bb7fD4E3DeDe0428",
      "0x7C27E3f986879b3195854bEe8350E61653d5D953",
      "0x7d42611012FDbE366Bf4A0481FC0E1aBf15E245A",
      "0x89E0cCE4Bc79D9CB0cEFA4785783Ad6e66978527",
      "0x8De4e517A6F0B84654625228D8293b70AB49cF6C",
      "0xB0244eC7eE22Bc98abA1BA6Aa0947B29B691BD83",
      "0xbe37a8b986f44cf527d393ba9f5a24bf0c16e31e",
      "0xf6fadf1d91ffd729189fe8746296ce4269353462",
    ];
    for (let i = 0; i < devAddresses.length; i++) {
      await genArt721CorePRTNR
        .connect(deployer)
        .addWhitelisted(devAddresses[i]);
      console.log(`Allowlisted ${devAddresses[i]} on the Core contract.`);
      delay(EXTRA_DELAY_BETWEEN_TX);
    }
  }

  // Allowlist new Minters on MinterFilter.
  await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPrice.address);
  console.log(`Allowlisted minter ${minterSetPrice.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);
  await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPriceERC20.address);
  console.log(
    `Allowlisted minter ${minterSetPriceERC20.address} on minter filter.`
  );
  delay(EXTRA_DELAY_BETWEEN_TX);
  await minterFilter.connect(deployer).addApprovedMinter(minterDALin.address);
  console.log(`Allowlisted minter ${minterDALin.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);
  await minterFilter.connect(deployer).addApprovedMinter(minterDAExp.address);
  console.log(`Allowlisted minter ${minterDAExp.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // alert as canonical minter filter
  await minterFilter.connect(deployer).alertAsCanonicalMinterFilter();
  console.log(`Alerted MinterFilter ${minterFilter.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // (optional) add initial project
  if (doAddProjectZero) {
    await genArt721CorePRTNR.addProject(
      projectZeroName,
      artistAddress,
      pricePerTokenInWei
    );
  }
  console.log(
    `Added project zero ${projectZeroName} on core contract at ${genArt721CorePRTNR.address}.`
  );

  // Allowlist new owner.
  await genArt721CorePRTNR.connect(deployer).addWhitelisted(transferAddress);
  console.log(`Allowlisted Core contract access for: ${transferAddress}.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Transfer Core contract to new owner.
  await genArt721CorePRTNR.connect(deployer).updateAdmin(transferAddress);
  console.log(`Transferred Core contract admin to: ${transferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify core contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721CorePRTNR.address} "${tokenName}" "${tokenTicker}" ${randomizerAddress}`
  );
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721CorePRTNR.address}`
  );
  console.log(`Verify MinterSetPrice deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPrice.address} ${genArt721CorePRTNR.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterSetPriceERC20 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20.address} ${genArt721CorePRTNR.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDALin deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALin.address} ${genArt721CorePRTNR.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDAExp deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExp.address} ${genArt721CorePRTNR.address} ${minterFilter.address}`
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
