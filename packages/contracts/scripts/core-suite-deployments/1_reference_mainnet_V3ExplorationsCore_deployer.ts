// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// explorations
import { GenArt721CoreV3Explorations__factory } from "../contracts/factories/GenArt721CoreV3Explorations__factory";
import { AdminACLV0__factory } from "../contracts/factories/AdminACLV0__factory";
import { BasicRandomizerV2__factory } from "../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../contracts/factories/MinterFilterV1__factory";
import { MinterMerkleV1__factory } from "../contracts/factories/MinterMerkleV1__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the V3 core Explorations contracts,
 * including the associated minter suite, to the Ethereum mainnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const tokenName = "Art Blocks Explorations";
const tokenTicker = "EXPLORE";
const superAdminAddress = "0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283"; // Art Blocks contract-management multi-sig
const artblocksPrimarySalesAddress =
  "0xf7A55108A6E830a809e88e74cbf5f5DE9D930153";
const artblocksSecondarySalesAddress =
  "0x05b0658C6D0eD423e39da60F8feDDd460d838F5f";
const startingProjectId = 0; // this is the first AB Explorations Contract, and therefore starts at projectId 0
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "mainnet") {
    throw new Error("This script is intended to be run on mainnet only");
  }
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
  const genArt721CoreFactory = new GenArt721CoreV3Explorations__factory(
    deployer
  );
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
  // Merkle V1
  const MinterMerkle__factory = new MinterMerkleV1__factory(deployer);
  const minterMerkle = await MinterMerkle__factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterMerkle.deployed();
  console.log(`Minter Merkle V1 deployed at ${minterMerkle.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Assign randomizer to core and renounce ownership on randomizer
  await randomizer.assignCoreAndRenounce(genArt721Core.address);
  console.log(
    `Assigned randomizer to core and renounced ownership of randomizer`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // Set the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .updateMinterContract(minterFilter.address);
  console.log(`Updated the Minter Filter on the Core contract.`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

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
    await delay(EXTRA_DELAY_BETWEEN_TX);
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
    await delay(EXTRA_DELAY_BETWEEN_TX);
  } else {
    console.log(
      `artblocks secondary sales payment address remains as deployer addresses: ${deployer.address}.`
    );
  }

  // Allowlist new Minters on MinterFilter.
  await minterFilter.connect(deployer).addApprovedMinter(minterMerkle.address);
  console.log(`Allowlisted minter ${minterMerkle.address} on minter filter.`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // update super admin address
  if (superAdminAddress) {
    await adminACL
      .connect(deployer)
      .changeSuperAdmin(superAdminAddress, [genArt721Core.address]);
    console.log(
      `Updated AdminACL's superAdmin address to ${superAdminAddress}, and alerted for indexing on core contract(s) [${genArt721Core.address}].`
    );
  } else {
    console.log(
      `AdminACL's superAdmin address remains as deployer address: ${deployer.address}.`
    );
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
  console.log(`Verify MinterMerkle deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterMerkle.address} ${genArt721Core.address} ${minterFilter.address}`
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
