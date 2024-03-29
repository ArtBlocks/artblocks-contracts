// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import {
  GenArt721CoreV3__factory,
  GenArt721RoyaltyOverride__factory,
  Randomizer__factory,
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

  // GET ROYALTY REGISTRY & ENGINE CONTRACTS
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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Randomizer contract.
  const randomizerFactory = new Randomizer__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  /////// UNCOMMENT THIS (FOR MAINNET DEPLOYMENT)
  // const coreToken = await ethers.getContractAt(
  //   genArt721CoreV3RegistryABI,
  //   '0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270'
  // );

  /////// COMMENT THIS OUT (FOR MAINNET DEPLOYMENT)  VV
  // DEPLOY NEW CORE & CREATE PROJECT FOR TEST TOKEN MINTING
  const tokenName = "Token Placeholder";
  const tokenTicker = "TOKN";
  const artblocksRoyaltiesAddress =
    "0xdddD4e84E9B742236543Bc497F0b3fd2a47f34D8";
  const genArt721CoreFactory = new GenArt721CoreV3__factory(deployer);
  const coreToken = await genArt721CoreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizer.address
  );
  console.log(`Core token deployed at ${coreToken.address}`);

  //CREATE AND POPULATE NEW PROJECT - WITHOUT THIS, NO TOKEN PAYMENTS TO TEST AGAINST
  await coreToken
    .connect(deployer)
    .addProject(
      "test_project",
      deployer.address,
      ethers.utils.parseEther("0.01")
    );
  await coreToken
    .connect(deployer)
    .updateProjectSecondaryMarketRoyaltyPercentage(0, 0, { gasLimit: 500000 });
  await coreToken
    .connect(deployer)
    .updateProjectAdditionalPayeeInfo(
      0,
      "0x24CdEE54439D3f25DE4cddE43e41B19FdAA90cE8",
      0,
      { gasLimit: 500000 }
    );

  const minterFilterFactory = await ethers.getContractFactory("MinterFilter");
  const minterFilter = await minterFilterFactory.deploy(coreToken.address);
  console.log(`Minter filter deployed at ${minterFilter.address}`);
  const minterFactory = await ethers.getContractFactory(
    "GenArt721FilteredMinter"
  );
  const minter = await minterFactory.deploy(
    coreToken.address,
    minterFilter.address
  );
  console.log(`Minter  deployed at ${minter.address}`);

  await coreToken
    .connect(deployer)
    .toggleProjectIsActive(0, { gasLimit: 500000 });

  await coreToken
    .connect(deployer)
    .addMintWhitelisted(minterFilter.address, { gasLimit: 500000 });

  await coreToken
    .connect(deployer)
    .updateProjectMaxInvocations(0, 15, { gasLimit: 500000 });

  await coreToken
    .connect(deployer)
    .toggleProjectIsPaused(0, { gasLimit: 500000 });

  await minterFilter
    .connect(deployer)
    .addApprovedMinter(minter.address, { gasLimit: 500000 });

  await minterFilter
    .connect(deployer)
    .setMinterForProject(0, minter.address, { gasLimit: 500000 });
  /////// COMMENT THIS OUT (FOR MAINNET DEPLOYMENT)  ^^

  ///////////////////////////////////////
  // Royalty Override

  //DEPLOY OVERRIDE
  const overrideFactory = new GenArt721RoyaltyOverride__factory(deployer);
  const override = await overrideFactory.deploy();

  await sleep(8000);

  //SETS THE MANIFOLD REGISTRY TO LOOKUP AB ROYALTY OVERRIDE FOR AB CORE
  await royaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
    coreToken.address, // token address
    override.address, // royalty override address
    { gasLimit: 500000 }
  );
  console.log(
    `Royalty Registry override for new AB GenArt721Core set to: ` +
      `${override.address}`
  );

  // SET ROYALTY PAYMENT ADDRESS FOR CORE CONTRACT IN ROYALTY OVERRIDE CONTRACT
  // NOTE: admin must call this
  await override
    .connect(deployer)
    .updateArtblocksRoyaltyAddressForContract(
      coreToken.address,
      artblocksRoyaltiesAddress,
      { gasLimit: 500000 }
    );

  // MINT TOKEN, CALL REGISTRY & VERIFY THE DEPLOYMENT WAS SUCCESSFUL
  const token = await minter
    .connect(deployer)
    .purchase(0, { gasLimit: 500000 });

  console.log("Minted token: ", token);

  await sleep(20000);

  const res = await RoyaltyEngineContract.connect(deployer).getRoyaltyView(
    coreToken.address,
    0,
    ethers.utils.parseEther("1"),
    { gasLimit: 500000 }
  );

  console.log("Royalty payouts for a token minted for 1 ETH: ", res);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
