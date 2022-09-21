// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// flagship
import { GenArt721CoreV3__factory } from "../../contracts/factories/GenArt721CoreV3__factory";
import { AdminACLV0__factory } from "../../contracts/factories/AdminACLV0__factory";
import { BasicRandomizerV2__factory } from "../../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../../contracts/factories/MinterFilterV1__factory";
import { MinterSetPriceV2__factory } from "../../contracts/factories/MinterSetPriceV2__factory";
import { MinterSetPriceERC20V2__factory } from "../../contracts/factories/MinterSetPriceERC20V2__factory";
import { MinterDALinV2__factory } from "../../contracts/factories/MinterDALinV2__factory";
import { MinterDAExpV2__factory } from "../../contracts/factories/MinterDAExpV2__factory";
import { MinterMerkleV1__factory } from "../../contracts/factories/MinterMerkleV1__factory";
import { MinterHolderV1__factory } from "../../contracts/factories/MinterHolderV1__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
import { HardhatArguments } from "hardhat/types";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

const pricePerTokenInWei = ethers.utils.parseEther("0.001");
const auctionStartPrice = pricePerTokenInWei.mul(2);
// auction start times in the future:
const auctionStartTime = 1758432614; // roughly 2025-09-20
// set half life time to value within default allowed range
const halfLifeTime = 301;

/**
 * This script was created to test V3 core flagship contracts, including
 * the associated minter suite, to the goerli testnet.
 * It is intended to be ran when running a subgraph, and acts as full
 * end-to-end testing of the subgraph.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// deployed contract config
const genArt721CoreAddress = "0xF396C180bb2f92EE28535D23F5224A5b9425ceca";
const adminACLAddress = "0x0D277C3d488CdABD86DB37E743765835e273101E";
const minterFilterAddress = "0x7EcFFfc1A3Eb7Ce76D4b29Df3e5098D2D921D367";
const minterSetPriceAddress = "0x3A23Ae9EB73C14Ff2A83a0bBe1028A690006e0cc";
const minterSetPriceERC20Address = "0x004E1cdb723869f6c65086f1d5cED55Cd9BA1971";
const minterDALinAddress = "0x73873eAAf65338256E31b1e612AC74D09492B5B8";
const minterDAExpAddress = "0xBced47092b6c1a9Ee24aFeC871E782aA44587001";
const minterHolderAddress = "0x82Df93Cd9Cd9178C8F442FB766fe3402916Fe567";
const minterMerkleAddress = "0xcd1AA5C612731108267D22b77745207D9728Edf8";

// helpers
const allMinterAddresses = [
  minterSetPriceAddress,
  minterSetPriceERC20Address,
  minterDALinAddress,
  minterDAExpAddress,
  minterMerkleAddress,
  minterHolderAddress,
];
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [superAdmin, artist, etc] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  //////////////////////////////////////////////////////////////////////////////
  // ATTACH BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Connect to AdminACL contract
  const adminACLFactory = new AdminACLV0__factory(superAdmin);
  const adminACL = adminACLFactory.attach(adminACLAddress);
  console.log(`Admin ACL attached to at ${adminACLAddress}`);

  // Deploy Core contract
  const genArt721CoreFactory = new GenArt721CoreV3__factory(superAdmin);
  const genArt721Core = genArt721CoreFactory.attach(genArt721CoreAddress);
  console.log(`GenArt721Core attached to at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV1__factory(superAdmin);
  const minterFilter = minterFilterFactory.attach(minterFilterAddress);
  console.log(`Minter Filter attached to at ${minterFilter.address}`);

  // Deploy Minter Suite contracts.
  // set price V2
  const minterSetPriceFactory = new MinterSetPriceV2__factory(superAdmin);
  const minterSetPrice = minterSetPriceFactory.attach(minterSetPriceAddress);
  console.log(`MinterSetPrice V2 attached to at ${minterSetPrice.address}`);
  // set price ERC20 V2
  const minterSetPriceERC20Factory = new MinterSetPriceERC20V2__factory(
    superAdmin
  );
  const minterSetPriceERC20 = minterSetPriceERC20Factory.attach(
    minterSetPriceERC20Address
  );
  console.log(
    `MinterSetPrice ERC20 V2 attached to at ${minterSetPriceERC20.address}`
  );
  // DA Lin V2
  const MinterDALin__factory = new MinterDALinV2__factory(superAdmin);
  const minterDALin = MinterDALin__factory.attach(minterDALinAddress);
  console.log(`Minter DA Lin V2 attached to at ${minterDALin.address}`);
  // DA Exp V2
  const MinterDAExp__factory = new MinterDAExpV2__factory(superAdmin);
  const minterDAExp = MinterDAExp__factory.attach(minterDAExpAddress);
  console.log(`Minter DA Exp V2 attached to at ${minterDAExp.address}`);
  // Merkle V1
  const MinterMerkle__factory = new MinterMerkleV1__factory(superAdmin);
  const minterMerkle = MinterMerkle__factory.attach(minterMerkleAddress);
  console.log(`Minter Merkle V1 attached to at ${minterMerkle.address}`);
  // Holder V1
  const MinterHolder__factory = new MinterHolderV1__factory(superAdmin);
  const minterHolder = MinterHolder__factory.attach(minterHolderAddress);
  console.log(`Minter Holder V1 attached to at ${minterHolder.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // ATTACH ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // MINTER OPERATIONS BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // add projects to core contract
  const projectIdA = await genArt721Core.nextProjectId();
  let tx = await genArt721Core
    .connect(superAdmin)
    .addProject("Project A", artist.address);
  await tx.wait();
  console.log(
    `Project A added to GenArt721Core with projectId ${projectIdA.toNumber()}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);
  const projectIdB = await genArt721Core.nextProjectId();
  tx = await genArt721Core
    .connect(superAdmin)
    .addProject("Project B", artist.address);
  await tx.wait();
  console.log(`Project B added to GenArt721Core at ${projectIdB.toNumber()}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // Allowlist the MinterFilter on the Core contract.
  tx = await genArt721Core
    .connect(superAdmin)
    .updateMinterContract(minterFilter.address);
  await tx.wait();
  console.log(
    `Updated the Minter Filter on the Core contract to ${minterFilter.address}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // Allow and deny minters on the Minter Filter contract.
  tx = await minterFilter
    .connect(superAdmin)
    .addApprovedMinter(minterSetPrice.address);
  await tx.wait();
  console.log(`approved minter on MinterFilter: ${minterSetPrice.address}.`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await minterFilter
    .connect(superAdmin)
    .removeApprovedMinter(minterSetPrice.address);
  await tx.wait();
  console.log(`removed minter on MinterFilter: ${minterSetPrice.address}.`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  // Allow all minters on Minter Filter contract.
  for (let i = 0; i < allMinterAddresses.length; i++) {
    const _minterAddress = allMinterAddresses[i];
    tx = await minterFilter
      .connect(superAdmin)
      .addApprovedMinter(_minterAddress);
    await tx.wait();
    console.log(`approved minter on MinterFilter: ${_minterAddress}`);
    await delay(EXTRA_DELAY_BETWEEN_TX);
  }

  // pre-configure the Minter Set Price contract for Project A.
  tx = await minterSetPrice
    .connect(artist)
    .updatePricePerTokenInWei(projectIdA, pricePerTokenInWei);
  await tx.wait();
  console.log(`set price per token for Project A to ${pricePerTokenInWei}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // pre-configure the Minter DAExp contract for Project A.
  tx = await minterDAExp
    .connect(artist)
    .setAuctionDetails(
      projectIdA,
      auctionStartTime,
      halfLifeTime,
      auctionStartPrice,
      pricePerTokenInWei
    );
  await tx.wait();
  console.log(`set auction details for Project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // set minter to set price for Project A.
  tx = await minterFilter
    .connect(artist)
    .setMinterForProject(projectIdA, minterSetPrice.address);
  await tx.wait();
  console.log(`set minter to set price for Project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // set minter to DAExp for Project A.
  tx = await minterFilter
    .connect(artist)
    .setMinterForProject(projectIdA, minterDAExp.address);
  await tx.wait();
  console.log(`set minter to DAEXP for Project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // remove minter for Project A
  tx = await minterFilter.connect(artist).removeMinterForProject(projectIdA);
  await tx.wait();
  console.log(`removed minter for Project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // set minter to Set Price for Project A.
  tx = await minterFilter
    .connect(artist)
    .setMinterForProject(projectIdA, minterSetPrice.address);
  await tx.wait();
  console.log(`set minter to set price for Project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // set minter to set price for Project B.
  tx = await minterFilter
    .connect(artist)
    .setMinterForProject(projectIdB, minterSetPrice.address);
  await tx.wait();
  console.log(`set minter to set price for Project B`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // MINTER OPERATIONS ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // CORE CONTRACT SUPERADMIN OPERATIONS STARTS HERE
  //////////////////////////////////////////////////////////////////////////////

  // update registry contracts
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksCurationRegistryAddress(etc.address);
  await tx.wait();
  console.log(`updated core curation registry address to ${etc.address}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksDependencyRegistryAddress(etc.address);
  await tx.wait();
  console.log(`updated core dependency registry address to ${etc.address}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // update artblocks addresses and percentages
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksPrimarySalesAddress(superAdmin.address);
  await tx.wait();
  console.log(`updated core primary sales address to ${superAdmin.address}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksSecondarySalesAddress(superAdmin.address);
  await tx.wait();
  console.log(`updated core secondary sales address to ${superAdmin.address}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksPrimarySalesPercentage(12);
  await tx.wait();
  console.log(`updated core AB primary sales percentage to ${12}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(superAdmin)
    .updateArtblocksSecondarySalesBPS(251);
  await tx.wait();
  console.log(`updated core AB secondary sales BPS to ${251}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // toggle project is active
  tx = await genArt721Core
    .connect(superAdmin)
    .toggleProjectIsActive(projectIdA);
  await tx.wait();
  console.log(`toggled project active for project A, projectId: ${projectIdA}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // CORE CONTRACT SUPERADMIN OPERATIONS ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // CORE CONTRACT ARTIST OPERATIONS STARTS HERE
  //////////////////////////////////////////////////////////////////////////////
  // update project details
  tx = await genArt721Core
    .connect(artist)
    .updateProjectName(projectIdA, "Project A");
  await tx.wait();
  console.log(`updated project A name to be: ${"Project A"}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .updateProjectArtistName(projectIdA, "Scripty");
  await tx.wait();
  console.log(`updated project A artist name to be: ${"Scripty"}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .addProjectScript(projectIdA, "console.log('hello world')");
  await tx.wait();
  console.log(`added project A script`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .addProjectScript(projectIdA, "console.log('hello world again')");
  await tx.wait();
  console.log(`added another project A script`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core.connect(artist).removeProjectLastScript(projectIdA);
  await tx.wait();
  console.log(`removed last project A script`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  let tx = await genArt721Core
    .connect(artist)
    .updateProjectScriptType(
      projectIdA,
      ethers.utils.formatBytes32String("p5js@1.0.0")
    );
  await tx.wait();
  console.log(`updated project A script type and version to ${"p5js@1.0.0"}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .updateProjectAspectRatio(projectIdA, "1.77777778");
  await tx.wait();
  console.log(`updated project A script type and version to ${"1.77777778"}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // artist or admin - perform by artist
  tx = await genArt721Core.connect(artist).toggleProjectIsPaused(projectIdA);
  await tx.wait();
  console.log(`toggled project paused for project A, projectId: ${projectIdA}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .updateProjectSecondaryMarketRoyaltyPercentage(projectIdA, 6);
  await tx.wait();
  console.log(`updated project A royalty percentage to: ${6}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .updateProjectWebsite(projectIdA, "artblocks.io");
  await tx.wait();
  console.log(`updated project A website`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(artist)
    .updateProjectMaxInvocations(projectIdA, 100);
  await tx.wait();
  console.log(`updated project A max invocations to: ${100}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // propose and accept artist addresses and splits
  tx = await genArt721Core
    .connect(artist)
    .proposeArtistPaymentAddressesAndSplits(
      projectIdA,
      artist.address,
      etc.address,
      5,
      etc.address,
      20
    );
  await tx.wait();
  console.log(`proposed artist addresses and splits for project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  tx = await genArt721Core
    .connect(superAdmin)
    .adminAcceptArtistAddressesAndSplits(
      projectIdA,
      artist.address,
      etc.address,
      5,
      etc.address,
      20
    );
  await tx.wait();
  console.log(`admin accepted addresses and splits for project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // update project description
  tx = await genArt721Core
    .connect(artist)
    .updateProjectDescription(projectIdA, "Project A description");
  await tx.wait();
  console.log(`updated project A description`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // mint a token
  tx = await minterSetPrice
    .connect(artist)
    .purchase(projectIdA, { value: pricePerTokenInWei });
  await tx.wait();
  console.log(`minted a token for project A`);
  await delay(EXTRA_DELAY_BETWEEN_TX);
  //////////////////////////////////////////////////////////////////////////////
  // CORE CONTRACT ARTIST OPERATIONS ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log(`TESTING COMPLETE!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
