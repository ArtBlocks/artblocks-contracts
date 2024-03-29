// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721CoreV2BrightMoments__factory } from "../../contracts/factories/GenArt721CoreV2BrightMoments__factory";
import { GenArt721MinterBrightMoments__factory } from "../../contracts/factories/GenArt721MinterBrightMoments__factory";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
// TODO: Update and verify the below configuration items before deploying!
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "Bright Moments";
const pbabTokenTicker = "MOMENT";
const pbabTransferAddress = "0xB96E81f80b3AEEf65CB6d0E280b15FD5DBE71937";
const rendererProviderAddress = "0x43A7D26a271F5801b8092d94DFd5b36EA5D01F5f";
const randomizerAddress = "0x088098f7438773182b703625c4128aff85fcffc4";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Core contract.
  const genArt721CoreFactory = new GenArt721CoreV2BrightMoments__factory(
    deployer
  );
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerAddress
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721MinterBrightMoments__factory(
    deployer
  );
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
  const network = await ethers.provider.getNetwork();
  if (network.name == "ropsten" || network.name == "rinkeby") {
    // purplehat
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63");
    // dogbot
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0");
    // ben_thank_you
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928");
    console.log(`Performing ${network.name} deployment, allowlisted AB staff.`);
  }

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerAddress}`
  );
  console.log(`Verify GenArt721Minter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Minter.address} ${genArt721Core.address}`
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
