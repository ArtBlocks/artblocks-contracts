// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import { Randomizer__factory } from "./contracts/factories/Randomizer__factory";
import { GenArt721CoreV2PBAB__factory } from "./contracts/factories/GenArt721CoreV2PBAB__factory";
import { GenArt721MinterPBAB__factory } from "./contracts/factories/GenArt721MinterPBAB__factory";
import royaltyRegistryABI from "../contracts/libs/abi/RoyaltyRegistry.json";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
// TODO: Update and verify the below configuration items before deploying!
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "TODO :: Placeholder";
const pbabTokenTicker = "TODO";
const pbabTransferAddress = "0x000000000000000000000000000000000000dEaD";
const rendererProviderAddress = "0x000000000000000000000000000000000000dEaD";
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

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Randomizer contract.
  const randomizerFactory = new Randomizer__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  // Deploy Core contract.
  const genArt721CoreFactory = new GenArt721CoreV2PBAB__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizer.address
  );

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

  // TODO - un-comment this block once royalty override contract is deployed
  // // set override on Royalty Registry
  // const royaltyOverrideAddress_PBAB =
  // "0xTODO - Update Once Royalty Override for PBAB is Deployed";
  // const RoyaltyRegistryAddress = getRoyaltyRegistryAddress(network.name);
  // const RoyaltyRegistryContract = await ethers.getContractAt(
  //   royaltyRegistryABI,
  //   RoyaltyRegistryAddress
  // );
  // await RoyaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
  //   genArt721Core.address, // token address
  //   royaltyOverrideAddress_PBAB // override address
  // );
  // console.log(
  //   "Royalty Registry Override for GenArt721Core set to: ${royaltyOverrideAddress_PBAB}"
  // );

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
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizer.address}`
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
