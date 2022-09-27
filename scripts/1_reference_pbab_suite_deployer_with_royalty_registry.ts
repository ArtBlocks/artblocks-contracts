// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721CoreV2PBAB__factory } from "./contracts/factories/GenArt721CoreV2PBAB__factory";
import { GenArt721MinterPBAB__factory } from "./contracts/factories/GenArt721MinterPBAB__factory";
import { createPBABBucket } from "./util/aws_s3";
import royaltyRegistryABI from "../contracts/libs/abi/RoyaltyRegistry.json";
import { GenArt721RoyaltyOverridePBAB__factory } from "./contracts/factories/GenArt721RoyaltyOverridePBAB__factory";

const DEAD = "0x000000000000000000000000000000000000dEaD";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
// TODO: Update and verify the below configuration items before deploying!
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "TODO :: Placeholder";
const pbabTokenTicker = "TODO";
const startingProjectId = 0; // TODO
const pbabTransferAddress = "0x000000000000000000000000000000000000dEaD";
const rendererProviderAddress = "0x000000000000000000000000000000000000dEaD";
const randomizerAddress = "0x000000000000000000000000000000000000dEaD";
// The following is not required, but if not set, must be set later by platform
// for Royalty Registry to work (will be ignored of set to "0x0...dEaD")
const platformRoyaltyPaymentAddress =
  "0x000000000000000000000000000000000000dEaD";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

function getRoyaltyRegistryAddress(networkName: string): string {
  // ref: https://royaltyregistry.xyz/lookup)
  if (networkName == "ropsten") {
    return "0x9cac159ec266E76ed7377b801f3b5d2cC7bcf40d";
  }
  if (networkName == "rinkeby") {
    return "0xc9198CbbB57708CF31e0caBCe963c98e60d333c3";
  }
  // return address on ETH mainnet
  return "0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D";
}

function getRoyaltyOverrideAddress_PBAB(networkName: string): string {
  if (networkName == "ropsten") {
    return "0xEC5DaE4b11213290B2dBe5295093f75920bD2982";
  }
  if (networkName == "rinkeby") {
    return "0xCe9E591314046011d141Bf77AFf7706c1CA1fC67";
  }
  // return address on ETH mainnet
  return "0x000000000000000000000000000000000000dEaD";
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Core contract.
  const genArt721CoreFactory = new GenArt721CoreV2PBAB__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerAddress,
    startingProjectId
  );

  await createPBABBucket(pbabTokenName, networkName);

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721MinterPBAB__factory(deployer);
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

  // TODO - un-comment this block once mainnet PBAB royalty override contract is deployed
  /*
  // set override on Royalty Registry
  const royaltyOverrideAddress_PBAB = getRoyaltyOverrideAddress_PBAB(
    network.name
  );
  const RoyaltyRegistryAddress = getRoyaltyRegistryAddress(network.name);
  const RoyaltyRegistryContract = await ethers.getContractAt(
    royaltyRegistryABI,
    RoyaltyRegistryAddress
  );
  await RoyaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
    genArt721Core.address, // token address
    royaltyOverrideAddress_PBAB // royalty override address
  );
  console.log(
    `Royalty Registry override for new GenArt721Core set to: ` +
      `${royaltyOverrideAddress_PBAB}`
  );

  // set platform royalty payment address if defined, else display reminder
  if (platformRoyaltyPaymentAddress == DEAD) {
    // warn - platform royalty payment address not configured at this time
    console.warn(
      `REMINDER: PBAB platform admin must call updatePlatformRoyaltyAddressForContract ` +
        `on ${royaltyOverrideAddress_PBAB} for Royalty Registry to work!`
    );
  } else {
    // configure platform royalty payment address so Royalty Registry works
    const RoyaltyOverrideFactory_PBAB =
      new GenArt721RoyaltyOverridePBAB__factory();
    const RoyaltyOverride_PBAB = RoyaltyOverrideFactory_PBAB.attach(
      royaltyOverrideAddress_PBAB
    );
    await RoyaltyOverride_PBAB.connect(
      deployer
    ).updatePlatformRoyaltyAddressForContract(
      genArt721Core.address, // token address
      platformRoyaltyPaymentAddress // platform royalty payment address
    );
    console.log(
      `Platform Royalty Payment Address for newly deployed GenArt721Core ` +
        `set to: ${platformRoyaltyPaymentAddress} \n    (on the PBAB royalty ` +
        `override contract at ${royaltyOverrideAddress_PBAB})`
    );
  }
  */

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerAddress} ${startingProjectId}`
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
