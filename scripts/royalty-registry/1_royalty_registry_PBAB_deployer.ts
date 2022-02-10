// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import {
  GenArt721RoyaltyOverridePBAB__factory,
  Randomizer__factory,
  GenArt721CoreV2PBAB__factory,
  GenArt721MinterPBAB__factory,
} from "../contracts";
import royaltyRegistryABI from "../../contracts/libs/abi/RoyaltyRegistry.json";
import royaltyEngineV1ABI from "../../contracts/libs/abi/RoyaltyEngineV1.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  function getRoyaltyAddress(networkName: string, contract: string): string {
    // ref: https://royaltyregistry.xyz/lookup)
    if (networkName == "ropsten") {
      return contract === "registry"
        ? "0x9cac159ec266E76ed7377b801f3b5d2cC7bcf40d"
        : "0xFf5A6F7f36764aAD301B7C9E85A5277614Df5E26";
    }
    if (networkName == "rinkeby") {
      return contract === "registry"
        ? "0xc9198CbbB57708CF31e0caBCe963c98e60d333c3"
        : "0x8d17687ea9a6bb6efA24ec11DcFab01661b2ddcd";
    }
    if (networkName == "mainnet") {
      return contract === "registry"
        ? "0xaD2184FB5DBcfC05d8f056542fB25b04fa32A95D"
        : "0X0385603AB55642CB4DD5DE3AE9E306809991804F";
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // GET ROYALTY REGISTRY CONTRACT TO SET OVERRIDE ADDRESS
  const royaltyRegistryAddress = getRoyaltyAddress(network.name, "registry");
  const royaltyEngineAddress = getRoyaltyAddress(network.name, "engine");
  const royaltyRegistryContract = await ethers.getContractAt(
    royaltyRegistryABI,
    royaltyRegistryAddress
  );
  const RoyaltyEngineContract = await ethers.getContractAt(
    royaltyEngineV1ABI,
    royaltyEngineAddress
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Randomizer contract.
  const randomizerFactory = new Randomizer__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  /////// UNCOMMENT THIS (FOR MAINNET DEPLOYMENT)
  // const coreTokenPBAB = await ethers.getContractAt(
  //   genArt721CoreV2_PBAB_ABI,
  //   PBAB_client_core_contract_address
  // );

  /////// COMMENT THIS OUT (FOR MAINNET DEPLOYMENT)  VV
  const tokenNamePBAB = "Token Placeholder";
  const tokenTickerPBAB = "TOKN";
  const rendererProviderAddress = "0x1ea6EFF00AB9E00160214e641A24FCa30A83DF87"; // dummy AB royalties address
  const platformRoyaltyPaymentAddress =
    "0x4Ee9e3fc2Cb7bE2daF4e91f1b9b9F5DB3F225d53";

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
    .addMintWhitelisted(genArt721MinterPBAB.address, { gasLimit: 500000 });
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await coreTokenPBAB
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress, { gasLimit: 500000 });
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  await coreTokenPBAB
    .connect(deployer)
    .addProject(
      "test_project",
      deployer.address,
      ethers.utils.parseEther("0.10"),
      { gasLimit: 500000 }
    );
  await coreTokenPBAB
    .connect(deployer)
    .updateProjectSecondaryMarketRoyaltyPercentage(0, 5, { gasLimit: 500000 });
  await coreTokenPBAB
    .connect(deployer)
    .updateProjectAdditionalPayeeInfo(
      0,
      "0x24CdEE54439D3f25DE4cddE43e41B19FdAA90cE8",
      20,
      { gasLimit: 500000 }
    );

  await coreTokenPBAB
    .connect(deployer)
    .toggleProjectIsActive(0, { gasLimit: 500000 });

  await coreTokenPBAB
    .connect(deployer)
    .updateProjectMaxInvocations(0, 15, { gasLimit: 500000 });

  await coreTokenPBAB
    .connect(deployer)
    .toggleProjectIsPaused(0, { gasLimit: 500000 });
  /////// COMMENT THIS OUT (FOR MAINNET DEPLOYMENT)  ^^

  ///////////////////////////////////////
  // PBAB royalty override

  // DEPLOY
  const overrideFactoryPBAB = new GenArt721RoyaltyOverridePBAB__factory(
    deployer
  );
  const overridePBAB = await overrideFactoryPBAB.deploy();

  //SET THE MANIFOLD REGISTRY TO LOOKUP AB ROYALTY OVERRIDE FOR AB CORE
  // NOTE: admin must call this Royalty Lookup setter for each PBAB core contract
  await royaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
    coreTokenPBAB.address, // token address
    overridePBAB.address, // royalty override address
    { gasLimit: 500000 }
  );
  console.log(
    `Royalty Registry override for new GenArt721Core set to: ` +
      `${overridePBAB.address}`
  );

  // SET PLATFORM ROYALTY PAYMENT ADDRESS
  // configure platform royalty payment address so Royalty Registry works
  // NOTE: admin must call this for each PBAB core contract
  await overridePBAB.connect(deployer).updatePlatformRoyaltyAddressForContract(
    coreTokenPBAB.address, // token address
    platformRoyaltyPaymentAddress, // platform royalty payment address
    { gasLimit: 500000 }
  );
  console.log(
    `Platform Royalty Payment Address for newly deployed GenArt721Core ` +
      `set to: ${platformRoyaltyPaymentAddress} \n    (on the PBAB royalty ` +
      `override contract at ${overridePBAB.address})`
  );

  // MINT TOKEN, CALL REGISTRY & VERIFY THE DEPLOYMENT WAS SUCCESSFUL
  const token = await genArt721MinterPBAB
    .connect(deployer)
    .purchase(0, { value: ethers.utils.parseEther("0.10"), gasLimit: 50000 });

  console.log("Minted token: ", token);

  await sleep(20000);

  const res = await RoyaltyEngineContract.connect(deployer).getRoyaltyView(
    coreTokenPBAB.address,
    0,
    ethers.utils.parseEther("1"),
    { gasLimit: 500000 }
  );

  console.log(res);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
