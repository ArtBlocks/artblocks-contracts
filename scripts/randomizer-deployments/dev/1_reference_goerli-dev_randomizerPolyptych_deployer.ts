// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { tryVerify } from "../../util/verification";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy polyptych randomizer as required for the MinterPolyptychV0 contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy the polyptych randomizer contract.
 * NOTE: this script makes calls as both the deployer, and then as the superAdmin of the
 * associated core contract. If the deployer is not the superAdmin, then the script will
 * need to be modified to make the calls as the superAdmin (or calls must be made manually).
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const genArt721V3CoreAddress = "0x5702797Ff45FCb0a70eB6AE1E4563299dCFa9Dd6";
const coreContractType = "GenArt721CoreV3_Engine";
const polyptychMinterAddress = "0xAA72E10Eec168D66847048b8FceB1aCf25db8115";
const randomizerName = "BasicPolyptychRandomizerV0";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "goerli") {
    throw new Error("This script is intended to be run on mainnet only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy new randomizer contract(s)
  const randomizerFactory = await ethers.getContractFactory(randomizerName);
  const randomizer = await randomizerFactory.deploy();
  await randomizer.deployed();
  const randomizerAddress = randomizer.address;
  console.log(`[INFO] ${randomizerName} deployed at ${randomizerAddress}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // assign core and renounce ownership
  await randomizer.assignCoreAndRenounce(genArt721V3CoreAddress, {
    gasLimit: 1000000,
  });
  console.log(
    `[INFO] ${randomizerName} updated it's reference to the core contract ${genArt721V3CoreAddress}, and ownership was renounced`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // THE FOLLOWING CALLS MUST BE MADE AS THE SUPERADMIN OF THE CORE CONTRACT
  // IF THE DEPLOYER IS NOT THE SUPERADMIN, THEN THE CALLS MUST BE MADE MANUALLY
  // add polyptych minter to the randomizer
  await randomizer.setHashSeedSetterContract(polyptychMinterAddress);
  console.log(
    `[INFO] Set hash seed setter contract to be the Polyptych minter at ${polyptychMinterAddress} on the randomizer at ${randomizerAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  const coreContract = await ethers.getContractAt(
    coreContractType,
    genArt721V3CoreAddress
  );
  await coreContract.updateRandomizerAddress(randomizerAddress);
  console.log(
    `[INFO] Updated randomizer for core at ${genArt721V3CoreAddress} to the Polyptych Randomizer at at ${randomizerAddress}`
  );
  await delay(EXTRA_DELAY_BETWEEN_TX);

  // verify contract on Etherscan if not on mainnet
  if (networkName == "goerli") {
    await tryVerify(randomizerName, randomizerAddress, [], networkName);
  } else {
    console.log(
      `[INFO] Skipping Etherscan verification for ${randomizerName} on ${networkName}`
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log(`Done!`);
  console.log(`Reminder that before a project switches to polyptych randomization mode \
(sometimes after initial frame  mints if polyptych tokens are all in same project), \
an artist will need to call \`toggleProjectIsPolyptych\` on this randomizer contract.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
