// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// flagship
import { GenArt721CoreV3__factory } from "../contracts/factories/GenArt721CoreV3__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import { BasicRandomizerV2__factory } from "../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../contracts/factories/MinterFilterV1__factory";
import { MinterSetPriceV2__factory } from "../contracts/factories/MinterSetPriceV2__factory";
import { MinterSetPriceERC20V2__factory } from "../contracts/factories/MinterSetPriceERC20V2__factory";
import { MinterDALinV2__factory } from "../contracts/factories/MinterDALinV2__factory";
import { MinterDAExpV2__factory } from "../contracts/factories/MinterDAExpV2__factory";
import { MinterMerkleV2__factory } from "../contracts/factories/MinterMerkleV2__factory";
import { MinterHolderV1__factory } from "../contracts/factories/MinterHolderV1__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the V3 core flagship contracts, including
 * the associated minter suite, to the goerli testnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const tokenName = "Art Blocks V3 Core Dev (Goerli)";
const tokenTicker = "BLOCKS_V3_CORE_DEV_GOERLI";
const superAdminAddress = undefined; // set to undefined to use deployer address
const artblocksPrimarySalesAddress = undefined; // set to undefined to use deployer address
const artblocksSecondarySalesAddress = undefined; // set to undefined to use deployer address
const startingProjectId = 100; // offset from existing core with margin for new projects in the next ~month
// (optional) add initial project
const doAddInitialProject = false;
const initialProjectName = undefined;
const initialProjectArtistAddress = undefined;
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

  // Deploy randomizer contract
  // @dev - comment out deployment if using existing randomizer
  const randomizerFactory = new BasicRandomizerV2__factory(deployer);
  const randomizer = await randomizerFactory.deploy();
  await randomizer.deployed();
  const randomizerAddress = randomizer.address;
  console.log(`Randomizer deployed at ${randomizerAddress}`);

  // Deploy AdminACL contract
  const adminACLFactory = new AdminACLV0__factory(deployer);
  const adminACL = await adminACLFactory.deploy();
  await adminACL.deployed();
  const adminACLAddress = adminACL.address;
  console.log(`Admin ACL deployed at ${adminACLAddress}`);

  // Deploy Core contract
  const genArt721CoreFactory = new GenArt721CoreV3__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress,
    adminACLAddress,
    startingProjectId
  );
  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV1__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(genArt721Core.address);
  await minterFilter.deployed();
  console.log(`Minter Filter deployed at ${minterFilter.address}`);

  // Deploy Minter Suite contracts.
  // set price V2
  const minterSetPriceFactory = new MinterSetPriceV2__factory(deployer);
  const minterSetPrice = await minterSetPriceFactory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPrice.deployed();
  console.log(`MinterSetPrice V2 deployed at ${minterSetPrice.address}`);
  // set price ERC20 V2
  const minterSetPriceERC20Factory = new MinterSetPriceERC20V2__factory(
    deployer
  );
  const minterSetPriceERC20 = await minterSetPriceERC20Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceERC20.deployed();
  console.log(
    `MinterSetPrice ERC20 V2 deployed at ${minterSetPriceERC20.address}`
  );
  // DA Lin V2
  const MinterDALin__factory = new MinterDALinV2__factory(deployer);
  const minterDALin = await MinterDALin__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDALin.deployed();
  console.log(`Minter DA Lin V2 deployed at ${minterDALin.address}`);
  // DA Exp V2
  const MinterDAExp__factory = new MinterDAExpV2__factory(deployer);
  const minterDAExp = await MinterDAExp__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDAExp.deployed();
  console.log(`Minter DA Exp V2 deployed at ${minterDAExp.address}`);
  // Merkle V1
  const MinterMerkle__factory = new MinterMerkleV2__factory(deployer);
  const minterMerkle = await MinterMerkle__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterMerkle.deployed();
  console.log(`Minter Merkle V2 deployed at ${minterMerkle.address}`);
  // Holder V1
  const MinterHolder__factory = new MinterHolderV1__factory(deployer);
  const minterHolder = await MinterHolder__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterHolder.deployed();
  console.log(`Minter Holder V1 deployed at ${minterHolder.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Assign randomizer to core and renounce ownership
  await randomizer.assignCoreAndRenounce(genArt721Core.address);

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .updateMinterContract(minterFilter.address);
  console.log(`Updated the Minter Filter on the Core contract.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Art Blocks primary and secondary payment Addresses (if different than default deployer address).
  if (
    artblocksPrimarySalesAddress &&
    artblocksPrimarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      .updateArtblocksPrimarySalesAddress(artblocksPrimarySalesAddress);
    console.log(
      `Updated the artblocks primary sales payment address to: ${artblocksPrimarySalesAddress}.`
    );
    delay(EXTRA_DELAY_BETWEEN_TX);
  } else {
    console.log(
      `artblocks primary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }
  if (
    artblocksSecondarySalesAddress &&
    artblocksSecondarySalesAddress !== deployer.address
  ) {
    await genArt721Core
      .connect(deployer)
      [
        "updateArtblocksSecondarySalesAddress(address)"
      ](artblocksSecondarySalesAddress);
    console.log(
      `Updated the artblocks secondary sales payment address to: ${artblocksSecondarySalesAddress}.`
    );
    delay(EXTRA_DELAY_BETWEEN_TX);
  } else {
    console.log(
      `artblocks secondary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }

  // currently no ability to allowlist more than a single superAdmin on testnet

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
  await minterFilter.connect(deployer).addApprovedMinter(minterMerkle.address);
  console.log(`Allowlisted minter ${minterMerkle.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);
  await minterFilter.connect(deployer).addApprovedMinter(minterHolder.address);
  console.log(`Allowlisted minter ${minterHolder.address} on minter filter.`);
  delay(EXTRA_DELAY_BETWEEN_TX);

  // (optional) add initial project
  if (doAddInitialProject) {
    await genArt721Core.addProject(
      initialProjectName,
      initialProjectArtistAddress
    );
    console.log(
      `Added initial project ${initialProjectName} on core contract at ${genArt721Core.address}.`
    );
  } else {
    console.log(`Did not add an initial project.`);
  }

  // update super admin address
  if (superAdminAddress) {
    await adminACL
      .connect(deployer)
      .changeSuperAdmin(superAdminAddress, [genArt721Core.address]);
  }

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify core contract deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${tokenName}" "${tokenTicker}" ${randomizerAddress} ${adminACLAddress} ${startingProjectId}`
  );
  console.log(`Verify Admin ACL contract deployment with:`);
  console.log(`${standardVerify} --network ${networkName} ${adminACL.address}`);
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721Core.address}`
  );
  console.log(`Verify MinterSetPrice deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPrice.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterSetPriceERC20 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDALin deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALin.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterDAExp deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExp.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterMerkle deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterMerkle.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(`Verify MinterHolder deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterHolder.address} ${genArt721Core.address} ${minterFilter.address}`
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
