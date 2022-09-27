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
const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

/**
 * This script was created to deploy partner contracts to the goerli
 * testnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy contracts to a new network.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// FLEX contract file
import { GenArt721CoreV2ENGINEFLEX__factory } from "../../contracts/factories/GenArt721CoreV2ENGINEFLEX__factory";
const tokenName = "Art Blocks Flex Engine Demo (Goerli)";
const tokenTicker = "ABFLEX_DEMO_STAGE_GOERLI";
const transferAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const artblocksAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const randomizerAddress = "0xEC5DaE4b11213290B2dBe5295093f75920bD2982";
// (optional) add initial project
const doAddProjectZero = true;
const projectZeroName = "projectZeroTest";
const artistAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
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

  // deploy FLEX core contract
  const coreFactory = new GenArt721CoreV2ENGINEFLEX__factory(deployer);
  const genArt721CoreFlex = await coreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress
  );
  console.log(genArt721CoreFlex.deployTransaction);
  await genArt721CoreFlex.deployed();
  console.log(`GenArt721CoreV2 FLEX deployed at ${genArt721CoreFlex.address}`);

  // deploy FLEX minter filter
  const minterFilterFactory = new MinterFilterV0__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(
    genArt721CoreFlex.address
  );
  await minterFilter.deployed();
  console.log(`Minter Filter for FLEX deployed at ${minterFilter.address}`);

  // Deploy Minter Suite contracts
  // set price V1
  const minterSetPriceFactory = new MinterSetPriceV1__factory(deployer);
  const minterSetPrice = await minterSetPriceFactory.deploy(
    genArt721CoreFlex.address,
    minterFilter.address
  );
  await minterSetPrice.deployed();
  console.log(
    `MinterSetPrice V1 for FLEX deployed at ${minterSetPrice.address}`
  );
  // set price ERC20 V1
  const minterSetPriceERC20Factory = new MinterSetPriceERC20V1__factory(
    deployer
  );
  const minterSetPriceERC20 = await minterSetPriceERC20Factory.deploy(
    genArt721CoreFlex.address,
    minterFilter.address
  );
  await minterSetPriceERC20.deployed();
  console.log(
    `MinterSetPrice ERC20 V1 for FLEX deployed at ${minterSetPriceERC20.address}`
  );
  // DA Lin V1
  const MinterDALin__factory = new MinterDALinV1__factory(deployer);
  const minterDALin = await MinterDALin__factory.deploy(
    genArt721CoreFlex.address,
    minterFilter.address
  );
  await minterDALin.deployed();
  console.log(`Minter DA Lin V1 for FLEX deployed at ${minterDALin.address}`);
  // DA Exp V1
  const MinterDAExp__factory = new MinterDAExpV1__factory(deployer);
  const minterDAExp = await MinterDAExp__factory.deploy(
    genArt721CoreFlex.address,
    minterFilter.address
  );
  await minterDAExp.deployed();
  console.log(`Minter DA Exp V1 for FLEX deployed at ${minterDAExp.address}`);

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
    .addMintWhitelisted(minterFilter.address);
  await tx.wait();
  console.log(`Allowlisted the Minter Filter on the Core contract.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Art Blocks Address.
  tx = await genArt721CoreFlex
    .connect(deployer)
    .updateRenderProviderAddress(artblocksAddress);
  await tx.wait();
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

  // Allowlist new Minters on MinterFilter.
  tx = await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPrice.address);
  await tx.wait();
  console.log(`Allowlisted minter ${minterSetPrice.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterSetPriceERC20.address);
  await tx.wait();
  console.log(
    `Allowlisted minter ${minterSetPriceERC20.address} on minter filter.`
  );
  delay(EXTRA_DELAY_BETWEEN_TX);

  tx = await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterDALin.address);
  await tx.wait();
  console.log(`Allowlisted minter ${minterDALin.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  tx = await minterFilter
    .connect(deployer)
    .addApprovedMinter(minterDAExp.address);
  await tx.wait();
  console.log(`Allowlisted minter ${minterDAExp.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // alert as canonical minter filter
  tx = await minterFilter.connect(deployer).alertAsCanonicalMinterFilter();
  console.log(`Alerted MinterFilter ${minterFilter.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // (optional) add initial project
  if (doAddProjectZero) {
    tx = await genArt721CoreFlex.addProject(
      projectZeroName,
      artistAddress,
      pricePerTokenInWei
    );
    await tx.wait();
  }
  console.log(
    `Added project zero ${projectZeroName} on core contract at ${genArt721CoreFlex.address}.`
  );

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
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721CoreFlex.address}`
  );
  console.log(`Verify MinterSetPrice deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPrice.address} ${genArt721CoreFlex.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterSetPriceERC20 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20.address} ${genArt721CoreFlex.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDALin deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALin.address} ${genArt721CoreFlex.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDAExp deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExp.address} ${genArt721CoreFlex.address} ${minterFilter.address}`
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
