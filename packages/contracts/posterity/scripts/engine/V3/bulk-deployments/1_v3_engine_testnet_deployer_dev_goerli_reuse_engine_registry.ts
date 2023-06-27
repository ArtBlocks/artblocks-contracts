// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// engine registry
import { EngineRegistryV0__factory } from "../../../contracts/factories/EngineRegistryV0__factory";
// engine
import { GenArt721CoreV3Engine__factory } from "../../../contracts/factories/GenArt721CoreV3Engine__factory";
import { AdminACLV1__factory } from "../../../contracts/factories/AdminACLV1__factory";
import { BasicRandomizerV2__factory } from "../../../contracts/factories/BasicRandomizerV2__factory";
// minter suite
import { MinterFilterV1__factory } from "../../../contracts/factories/MinterFilterV1__factory";
import { MinterSetPriceV4__factory } from "../../../contracts/factories/MinterSetPriceV4__factory";

// image bucket creation
import { createEngineBucket } from "../../../util/aws_s3";
// delay to avoid issues with reorgs and tx failures
import { delay } from "../../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 1000; // ms
const MANUAL_GAS_LIMIT = 500000; // gas
const AUTO_APPROVE_ARTIST_SPLIT_PROPOSALS = true;

/**
 * This script was created to deploy the V3 core Engine contracts,
 * including the associated minter suite, to the Ethereum goerli testnet.
 * It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the V3 core contract suite.
 * IMPORTANT: This deploys a basic randomizer, which may be changed after
 * deployment by the configured superAdmin.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const contractDeployDetailsArray = [
  {
    tokenName: "Art Blocks V3 Engine Testnet Dev #2",
    tokenTicker: "ABV3ENGDEV_2",
    startingProjectId: 0,
  },
];
// the following engine registry address must be used by admin dev deployer wallet
// 0x2246475beddf9333b6a6D9217194576E7617Afd1
const engineRegistryAddress = "0x2A39132E8d594d2c840D6656327fB26d900C05bA";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on goerli only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT (SHARED) BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy AdminACL contract
  // @dev - comment out deployment if using existing ACL contract
  const adminACLFactory = new AdminACLV1__factory(deployer);
  const adminACL = await adminACLFactory.deploy();
  await adminACL.deployed();
  const adminACLAddress = adminACL.address;
  console.log(`Admin ACL deployed at ${adminACLAddress}`);

  // Deploy engine registry contract
  // @dev - comment out deployment if using existing engine registry
  console.log(`Engine Registry being used at ${engineRegistryAddress}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT (SHARED) ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Perform the following deploy steps for each to-be-deployed contract:
  for (let index = 0; index < contractDeployDetailsArray.length; index++) {
    const contractDeployDetails = contractDeployDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (PER-CONTRACT) BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // Deploy randomizer contract
    const randomizerFactory = new BasicRandomizerV2__factory(deployer);
    const randomizer = await randomizerFactory.deploy();
    await randomizer.deployed();
    const randomizerAddress = randomizer.address;
    console.log(`Randomizer deployed at ${randomizerAddress}`);

    // Deploy Core contract
    const genArt721CoreFactory = new GenArt721CoreV3Engine__factory(deployer);
    const tokenName = contractDeployDetails.tokenName;
    const tokenTicker = contractDeployDetails.tokenTicker;
    const renderProviderAddress = deployer.address;
    const platformProviderAddress = deployer.address;
    const startingProjectId = contractDeployDetails.startingProjectId;
    const genArt721Core = await genArt721CoreFactory.deploy(
      tokenName,
      tokenTicker,
      renderProviderAddress,
      platformProviderAddress,
      randomizerAddress,
      adminACLAddress,
      startingProjectId,
      AUTO_APPROVE_ARTIST_SPLIT_PROPOSALS,
      engineRegistryAddress
    );

    await genArt721Core.deployed();
    console.log(`GenArt721CoreV3_Engine deployed at ${genArt721Core.address}`);

    // Deploy Minter Filter contract.
    const minterFilterFactory = new MinterFilterV1__factory(deployer);
    const minterFilter = await minterFilterFactory.deploy(
      genArt721Core.address
    );
    await minterFilter.deployed();
    console.log(`Minter Filter deployed at ${minterFilter.address}`);

    // Deploy Minter Suite contracts.
    // set price V2
    const minterSetPriceFactory = new MinterSetPriceV4__factory(deployer);
    const minterSetPrice = await minterSetPriceFactory.deploy(
      genArt721Core.address,
      minterFilter.address
    );
    await minterSetPrice.deployed();
    console.log(`MinterSetPrice V4 deployed at ${minterSetPrice.address}`);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT (PER-CONTRACT) ENDS HERE
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

    // Allowlist new Minters on MinterFilter.
    await minterFilter
      .connect(deployer)
      .addApprovedMinter(minterSetPrice.address);
    console.log(
      `Allowlisted minter ${minterSetPrice.address} on minter filter.`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Create a project 0, and a token 0, on that empty project.
    await genArt721Core.connect(deployer).addProject(
      tokenName, // Use `tokenName` as placeholder for project 0 name
      deployer.address // Use `deployer.address` as placeholder for project 0 owner
    );
    console.log(
      `Added ${tokenName} project ${startingProjectId} placeholder on ${tokenName} contract.`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);
    await minterFilter
      .connect(deployer)
      .setMinterForProject(startingProjectId, minterSetPrice.address, {
        gasLimit: MANUAL_GAS_LIMIT,
      }); // provide manual gas limit
    console.log(
      `Configured set price minter (${minterSetPrice.address}) for project ${startingProjectId}.`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);
    await minterSetPrice
      .connect(deployer)
      .updatePricePerTokenInWei(startingProjectId, 0, {
        gasLimit: MANUAL_GAS_LIMIT,
      }); // provide manual gas limit
    console.log(`Configured minter price project ${startingProjectId}.`);
    await delay(EXTRA_DELAY_BETWEEN_TX);
    await minterSetPrice
      .connect(deployer)
      .purchase(startingProjectId, { gasLimit: MANUAL_GAS_LIMIT }); // provide manual gas limit
    console.log(`Minted token 0 for project ${startingProjectId}.`);
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Note reminders about config addresses that have been left as the deployer for now.
    console.log(
      `provider primary and secondary sales payment addresses remain as deployer addresses: ${deployer.address}.`
    );
    console.log(
      `AdminACL's superAdmin address remains as deployer address: ${deployer.address}.`
    );
    console.log(`Don't forget to update these later as needed!.`);

    // Output instructions for manual Etherscan verification.
    const standardVerify = "yarn hardhat verify";
    console.log(
      `Save the following constructor args config file to a constructor-args.js file, then verify core contract deployment with:`
    );
    console.log(
      `module.exports = [
        "${tokenName}", // name
        "${tokenTicker}", // ticker
        "${renderProviderAddress}", // render provider
        "${platformProviderAddress}", // platform provider
        "${randomizerAddress}", // randomizer
        "${adminACLAddress}", // admin acl
        ${startingProjectId}, // starting project id
        ${AUTO_APPROVE_ARTIST_SPLIT_PROPOSALS}, // auto approve artist split proposals
        "${engineRegistryAddress}" // engine registry
      ];`
    );
    console.log(
      `${standardVerify} --network ${networkName} --constructor-args constructor-args.js ${genArt721Core.address}`
    );
    console.log(`Verify Admin ACL contract deployment with:`);
    console.log(
      `${standardVerify} --network ${networkName} ${adminACL.address}`
    );
    console.log(`Verify MinterFilter deployment with:`);
    console.log(
      `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721Core.address}`
    );
    console.log(`Verify MinterSetPrice deployment with:`);
    console.log(
      `${standardVerify} --network ${networkName} ${minterSetPrice.address} ${genArt721Core.address} ${minterFilter.address}`
    );
    // create image bucket
    const payload = await createEngineBucket(tokenName, networkName);
    console.log(`Set image bucket for this core contract to ${payload["url"]}`);
    // reminder to set core contract type in db
    const coreType = await genArt721Core.coreType();
    console.log(`Set core contract type to ${coreType}`);

    //////////////////////////////////////////////////////////////////////////////
    // SETUP ENDS HERE
    //////////////////////////////////////////////////////////////////////////////
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
