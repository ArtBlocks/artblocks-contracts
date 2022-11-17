// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// delay to avoid issues with reorgs and tx failures
import { delay } from "../../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 10000; // ms

/**
 * This script was created to deploy partner contracts to the Palm Network
 * testnet.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
// FLEX contract file
import { GenArt721CoreV2ENGINEFLEX__factory } from "../../contracts/factories/GenArt721CoreV2ENGINEFLEX__factory";
import { GenArt721MinterPBAB__factory } from "../../contracts/factories/GenArt721MinterPBAB__factory";

const tokenName = "Art Blocks Flex Engine Palm Testnet Demo";
const tokenTicker = "ABFLEX_DEMO_PALM_TESTNET";
const transferAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const artblocksAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const randomizerAddress = "0xB295b7de82C4903D96B7AAb0f6bB4a9815f33CE4";

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
  const networkName = network.name;
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Randomizer contract
  console.log(`Using shared randomizer at ${randomizerAddress}`);

  // Deploy Core contract
  const coreFactory = new GenArt721CoreV2ENGINEFLEX__factory(deployer);
  const genArt721CoreFlex = await coreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizerAddress
  );
  console.log(genArt721CoreFlex.deployTransaction);
  await genArt721CoreFlex.deployed();
  console.log(`GenArt721CoreV2 deployed at ${genArt721CoreFlex.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721MinterPBAB__factory(deployer);
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

  console.log(`Allowlisted the Minter Filter on the Core contract.`);

  await delay(EXTRA_DELAY_BETWEEN_TX);

  // Update the Renderer provider.
  tx = await genArt721CoreFlex
    .connect(deployer)
    .updateRenderProviderAddress(artblocksAddress);

  await tx.wait();

  console.log(`Updated the render provider address to: ${artblocksAddress}.`);

  // Set Minter owner.
  tx = await genArt721Minter.connect(deployer).setOwnerAddress(transferAddress);
  console.log(`Set the Minter owner to: ${transferAddress}.`);
  await tx.wait();

  await delay(EXTRA_DELAY_BETWEEN_TX);

  // Allowlist AB staff
  console.log(`Detected testnet - Adding AB staff to the whitelist.`);
  const devAddresses = [
    "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63", // purplehat
    "0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0", // dogbot
    "0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928", // ben_thank_you
    "0x3b9038fa89783CBA1933c1689043b4dae2032d1c", // heylinds
    "0x48631d49245185cB38C01a31E0AFFfA75c133d9a", // meck
  ];
  for (let i = 0; i < devAddresses.length; i++) {
    tx = await genArt721CoreFlex
      .connect(deployer)
      .addWhitelisted(devAddresses[i]);
    await tx.wait();

    console.log(`Allowlisted ${devAddresses[i]} on the Core contract.`);
    await delay(EXTRA_DELAY_BETWEEN_TX);
  }

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
  await delay(EXTRA_DELAY_BETWEEN_TX);

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
