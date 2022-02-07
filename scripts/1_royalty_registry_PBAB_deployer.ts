// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721RoyaltyOverridePBAB__factory, Randomizer__factory, GenArt721CoreV2PBAB__factory, GenArt721MinterPBAB__factory } from "./contracts";
import royaltyRegistryABI from "../contracts/libs/abi/RoyaltyRegistry.json";
// import genArt721CoreV3RegistryABI from "../artifacts/contracts/GenArt721CoreV3.sol/GenArt721CoreV3.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  function getRoyaltyRegistryAddress(networkName: string): string {
    // ref: https://royaltyregistry.xyz/lookup)
    if (networkName == "ropsten") {
      return "0x9cac159ec266E76ed7377b801f3b5d2cC7bcf40d";
    }
    if (networkName == "mainnet") {
      return "0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D";
    }
    return;
  }

  function getRoyaltyOverrideAddress_PBAB(networkName: string): string {
    if (networkName == "ropsten") {
      return "0xEC5DaE4b11213290B2dBe5295093f75920bD2982";
    }
    if (networkName == "mainnet") {
      return "0x000000000000000000000000000000000000dEaD";
    }
    return;
  }

    // GET ROYALTY REGISTRY CONTRACT TO SET OVERRIDE ADDRESS
    const RoyaltyRegistryAddress = getRoyaltyRegistryAddress(network.name);
    const RoyaltyRegistryContract = await ethers.getContractAt(
      royaltyRegistryABI,
      RoyaltyRegistryAddress
    );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////


  // Deploy Randomizer contract.
  const randomizerFactory = new Randomizer__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);




  ///////////////////////////////////////
  //PBAB TESTING

  const tokenNamePBAB = "Token Placeholder";
  const tokenTickerPBAB = "TOKN";
  const artistAddressPBAB = "0x18579FBCe9152A1342663678FA970DcA4AE654fF";
  const artblocksRoyaltiesAddressPBAB = "0xdddD4e84E9B742236543Bc497F0b3fd2a47f34D8"
  const pbabTransferAddress = "0x451d3de659e8fc81054F07C37e0e889E1eE6B3b5";     // new PBAB owner
  const rendererProviderAddress = "0x1ea6EFF00AB9E00160214e641A24FCa30A83DF87"; // dummy AB royalties address
  const platformRoyaltyPaymentAddress = "0x4Ee9e3fc2Cb7bE2daF4e91f1b9b9F5DB3F225d53";

  /////// UNCOMMENT THIS FOR TESTNET DEPLOYMENT & TESTING
  // Deploy Core contract.
  const genArt721CoreFactoryPBAB = new GenArt721CoreV2PBAB__factory(deployer);
  const coreTokenPBAB = await genArt721CoreFactoryPBAB.deploy(
    tokenNamePBAB,
    tokenTickerPBAB,
    randomizer.address
  );

  await coreTokenPBAB.deployed();
  console.log(`PBAB GenArt721Core deployed at ${coreTokenPBAB.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactoryPBAB = new GenArt721MinterPBAB__factory(deployer);
  const genArt721MinterPBAB = await genArt721MinterFactoryPBAB.deploy(
    coreTokenPBAB.address
  );

  await genArt721MinterPBAB.deployed();
  console.log(`PBAB Minter deployed at ${genArt721MinterPBAB.address}`);

  // Allowlist the Minter on the Core contract.
  await coreTokenPBAB
    .connect(deployer)
    .addMintWhitelisted(genArt721MinterPBAB.address);
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await coreTokenPBAB
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress);
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  // Set Minter owner.
  await genArt721MinterPBAB.connect(deployer).setOwnerAddress(pbabTransferAddress);
  console.log(`Set the Minter owner to: ${pbabTransferAddress}.`);

  // Allowlist AB staff (testnet only)
  if (network.name == "ropsten" || network.name == "rinkeby") {
    // purplehat
    await coreTokenPBAB
      .connect(deployer)
      .addWhitelisted("0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63");
    // dogbot
    await coreTokenPBAB
      .connect(deployer)
      .addWhitelisted("0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0");
    // ben_thank_you
    await coreTokenPBAB
      .connect(deployer)
      .addWhitelisted("0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928");
    // mikespellcheck
    await coreTokenPBAB
      .connect(deployer)
      .addWhitelisted("0x48631d49245185cB38C01a31E0AFFfA75c133d9a");
    console.log(`Performing ${network.name} deployment, allowlisted AB staff.`);
  }

  // PBAB - should I be setting myself as the admin? deploy a new PBAB project on token?
  await coreTokenPBAB.connect(deployer).addProject("test_project", artistAddressPBAB, ethers.utils.parseEther("0.10"));
  await coreTokenPBAB.connect(deployer).updateProjectSecondaryMarketRoyaltyPercentage(0, 5);
  await coreTokenPBAB.connect(deployer).updateArtblocksRoyaltyAddressForContract()
  await coreTokenPBAB.connect(deployer).updateProjectAdditionalPayeeInfo(0, "0x24CdEE54439D3f25DE4cddE43e41B19FdAA90cE8", 20);

  await coreTokenPBAB.connect(deployer).toggleProjectIsActive(0);

  await coreTokenPBAB.connect(deployer).addMintWhitelisted(this.minterFilterA.address);

  await coreTokenPBAB.connect(deployer).updateProjectMaxInvocations(0, 15);

  coreTokenPBAB.connect(artistAddressPBAB).toggleProjectIsPaused(0);


  
  ///////////////////////////////////////
  // PBAB royalty override

  // DEPLOY
  const overrideFactoryPBAB = new GenArt721RoyaltyOverridePBAB__factory(deployer);
  const overridePBAB = await overrideFactoryPBAB.deploy();

  // set override on Royalty Registry
  const royaltyOverrideAddress_PBAB = getRoyaltyOverrideAddress_PBAB(
    network.name
  );

  //SETS THE MANIFOLD REGISTRY TO LOOKUP AB ROYALTY OVERRIDE FOR AB CORE
  await RoyaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
    coreTokenPBAB.address, // token address
    royaltyOverrideAddress_PBAB // royalty override address
  );
  console.log(
    `Royalty Registry override for new GenArt721Core set to: ` +
      `${royaltyOverrideAddress_PBAB}`
  );

  // set platform royalty payment address
    // configure platform royalty payment address so Royalty Registry works
    await overridePBAB.connect(
      deployer
    ).updatePlatformRoyaltyAddressForContract(
      coreTokenPBAB.address, // token address
      platformRoyaltyPaymentAddress // platform royalty payment address
    );
    console.log(
      `Platform Royalty Payment Address for newly deployed GenArt721Core ` +
        `set to: ${platformRoyaltyPaymentAddress} \n    (on the PBAB royalty ` +
        `override contract at ${royaltyOverrideAddress_PBAB})`
    );

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });