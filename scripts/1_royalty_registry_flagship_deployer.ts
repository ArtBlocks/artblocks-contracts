// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import { ethers } from "hardhat";
import { GenArt721CoreV3__factory, GenArt721RoyaltyOverride__factory, Randomizer__factory } from "./contracts";
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
  // Art Blocks Flagship

  /////// UNCOMMENT THIS FOR MAINNET - SET GenArt721Core CONTRACT TO CONST genArt721Core
  // const genArt721Core = await ethers.getContractAt(
  //   genArt721CoreV3RegistryABI,
  //   '0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270'
  // );
  //attach() --> need this to interact with prod-deployed contract & update the registry
  // 1. ABroyaltiesaddress...I need this. 2. core contract is deployed so use existing info & remove core deployment


  /////// UNCOMMENT THIS FOR TESTNET DEPLOYMENT & TESTING
  // DEPLOY NEW CORE & SET ADMIN
  const tokenName = "Token Placeholder";
  const tokenTicker = "TOKN";
  const artistAddress = "0x48631d49245185cB38C01a31E0AFFfA75c133d9a";   // deployer = artist
  const artblocksRoyaltiesAddress = "0xdddD4e84E9B742236543Bc497F0b3fd2a47f34D8"
  const genArt721CoreFactory = new GenArt721CoreV3__factory(deployer);
  const coreToken = await genArt721CoreFactory.deploy(
    tokenName,
    tokenTicker,
    randomizer.address
  );
  console.log(`Core token deployed at ${coreToken.address}`);

  //CREATE AND POPULATE NEW PROJECT - WITHOUT THIS, NO TOKEN PAYMENTS TO TEST AGAINST?
  await coreToken.connect(deployer).addProject("test_project", artistAddress, ethers.utils.parseEther("0.10"));
  await coreToken.connect(deployer).updateProjectSecondaryMarketRoyaltyPercentage(0, 5);
  await coreToken.connect(deployer).updateProjectAdditionalPayeeInfo(0, "0x24CdEE54439D3f25DE4cddE43e41B19FdAA90cE8", 20);

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

  await coreToken.connect(deployer).toggleProjectIsActive(0);

  await coreToken.connect(deployer).addMintWhitelisted(minterFilter.address);

  await coreToken.connect(deployer).updateProjectMaxInvocations(0, 15);

  await coreToken.connect(artistAddress).toggleProjectIsPaused(0);

  await minterFilter.connect(deployer).addApprovedMinter(minter.address);
  
  await minterFilter.connect(deployer).setMinterForProject(0, minter.address);



  ///////////////////////////////////////
  // Royalty Override

  //DEPLOY OVERRIDE
  const overrideFactory = new GenArt721RoyaltyOverride__factory(deployer);
  const override = await overrideFactory.deploy();


  //SETS THE MANIFOLD REGISTRY TO LOOKUP AB ROYALTY OVERRIDE FOR AB CORE
  await RoyaltyRegistryContract.connect(deployer).setRoyaltyLookupAddress(
    coreToken.address, // token address
    override.address // royalty override address
  );
  console.log(
    `Royalty Registry override for new AB GenArt721Core set to: ` +
      `${override.address}`
  );

  await override.connect(deployer).updateArtblocksRoyaltyAddressForContract(
    coreToken.address,
    artblocksRoyaltiesAddress
  )

  await minter.connect(deployer).purchase(0, { value: ethers.utils.parseEther("0.10") });

  //VERIFY THAT IT WORKED
    //call RoyaltyRegistryEngine --> check for royalties result. should give me BPS and addresses
  const res = await RoyaltyRegistryContract.connect(deployer).getRoyaltiesView();

  console.log(res);

  
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });