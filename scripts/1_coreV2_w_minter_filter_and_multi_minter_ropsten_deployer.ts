import { ethers } from "hardhat";
import { Randomizer__factory } from "./contracts/factories/Randomizer__factory";
import { GenArt721CoreV2__factory } from "./contracts/factories/GenArt721CoreV2__factory";
import { MinterFilter__factory } from "./contracts/factories/MinterFilter__factory";
import { GenArt721FilteredMinter__factory } from "./contracts/factories/GenArt721FilteredMinter__factory";
import { GenArt721FilteredMinterETH__factory } from "./contracts/factories/GenArt721FilteredMinterETH__factory";
import { GenArt721FilteredMinterETHAuction__factory } from "./contracts/factories/GenArt721FilteredMinterETHAuction__factory";

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
  const genArt721CoreFactory = new GenArt721CoreV2__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Minter Filter GenArt721 Test",
    "FLTR",
    randomizer.address
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilter__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(genArt721Core.address);

  await minterFilter.deployed();
  console.log(`MinterFilter deployed at ${minterFilter.address}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const genArt721FilteredMinterFactory = new GenArt721FilteredMinter__factory(
    deployer
  );
  const genArt721FilteredMinter = await genArt721FilteredMinterFactory.deploy(
    genArt721Core.address,
    minterFilter.address
  );

  await genArt721FilteredMinter.deployed();
  console.log(
    `GenArt721FilteredMinter deployed at ${genArt721FilteredMinter.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const genArt721FilteredMinterETHFactory =
    new GenArt721FilteredMinterETH__factory(deployer);
  const genArt721FilteredMinterETH =
    await genArt721FilteredMinterETHFactory.deploy(
      genArt721Core.address,
      minterFilter.address
    );

  await genArt721FilteredMinterETH.deployed();
  console.log(
    `GenArt721FilteredMinterETH deployed at ${genArt721FilteredMinterETH.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const genArt721FilteredMinterETHAuctionFactory =
    new GenArt721FilteredMinterETHAuction__factory(deployer);
  const genArt721FilteredMinterETHAuction =
    await genArt721FilteredMinterETHAuctionFactory.deploy(
      genArt721Core.address,
      minterFilter.address
    );

  await genArt721FilteredMinterETHAuction.deployed();
  console.log(
    `GenArt721FilteredMinterETHAuction deployed at ${genArt721FilteredMinterETHAuction.address}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Whitelist the Minter Filter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .addMintWhitelisted(minterFilter.address);

  // Setup the Minter Filter to use the most basic minter as the default.
  await minterFilter
    .connect(deployer)
    .setDefaultMinter(genArt721FilteredMinter.address);

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // TESTNET VERIFICATION FUNCTIONALITY STARTS HERE
  // DO NOT DEPLOY THIS TO MAINNET
  //////////////////////////////////////////////////////////////////////////////

  // Whitelist AB staff (testnet only)
  const network = await ethers.provider.getNetwork();
  if (network.name == "ropsten") {
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
    // hype
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0xC76262A417C36a501200cc50462Bc6d73A0d04C2");

    // Deploy three test projects.
    // Initially, make the deployer the artist, in order to do some extra config
    // work. Later on, transfer the project ownership outside of the deployer.
    const pricePerTokenInWei = ethers.utils.parseEther("1");
    await genArt721Core
      .connect(deployer)
      .addProject("project_0", deployer.address, pricePerTokenInWei);
    await genArt721Core
      .connect(deployer)
      .addProject("project_1", deployer.address, pricePerTokenInWei);
    await genArt721Core
      .connect(deployer)
      .addProject("project_2", deployer.address, pricePerTokenInWei);

    // For projects 1 and 2 (not for project 0), set an explicit minter in the
    // Minter Filter contract. Project 0 should fall back to the default.
    await minterFilter
      .connect(deployer)
      .setMinterForProject(1, genArt721FilteredMinterETH.address);
    await minterFilter
      .connect(deployer)
      .setMinterForProject(2, genArt721FilteredMinterETHAuction.address);

    // Set maxInvocations for 3 test projects
    await genArt721Core.connect(deployer).updateProjectMaxInvocations(0, 1000);
    await genArt721Core.connect(deployer).updateProjectMaxInvocations(1, 1000);
    await genArt721Core.connect(deployer).updateProjectMaxInvocations(2, 1000);

    // Update maxInvocations for the 3 minters being used (one for each of the
    // three test projects).
    await genArt721FilteredMinter.connect(deployer).setProjectMaxInvocations(0);
    await genArt721FilteredMinterETH
      .connect(deployer)
      .setProjectMaxInvocations(1);
    await genArt721FilteredMinterETHAuction
      .connect(deployer)
      .setProjectMaxInvocations(2);

    // Activate 3 test projects.
    // NOTE: Unpausing must be done outside of this script, as the deployer
    //       is **not** the artist for the test projects.
    await genArt721Core.connect(deployer).toggleProjectIsActive(0);
    await genArt721Core.connect(deployer).toggleProjectIsActive(1);
    await genArt721Core.connect(deployer).toggleProjectIsActive(2);

    // Unpause 3 test projects.
    await genArt721Core.connect(deployer).toggleProjectIsPaused(0);
    await genArt721Core.connect(deployer).toggleProjectIsPaused(1);
    await genArt721Core.connect(deployer).toggleProjectIsPaused(2);

    // Transfer ownership of 3 test projects.
    // purplehat
    await genArt721Core
      .connect(deployer)
      .updateProjectArtistAddress(
        0,
        "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63"
      );
    await genArt721Core
      .connect(deployer)
      .updateProjectArtistAddress(
        1,
        "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63"
      );
    await genArt721Core
      .connect(deployer)
      .updateProjectArtistAddress(
        2,
        "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63"
      );
  }

  //////////////////////////////////////////////////////////////////////////////
  // TESTNET VERIFICATION FUNCTIONALITY ENDS HERE
  // DO NOT DEPLOY THIS TO MAINNET
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
