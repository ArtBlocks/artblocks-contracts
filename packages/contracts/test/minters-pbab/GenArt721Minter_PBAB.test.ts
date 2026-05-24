import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getAccounts, assignDefaultConstants, T_Config } from "../util/common";

import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721Minter_PBAB", async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    config.higherPricePerTokenInWei = ethers.utils.parseEther("1.1");
    // deploy and configure contracts
    const randomizerFactory =
      await ethers.getContractFactory("BasicRandomizer");
    config.randomizer = await randomizerFactory.deploy();

    const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
    config.genArt721Core = await PBABFactory.connect(
      config.accounts.deployer
    ).deploy(config.name, config.symbol, config.randomizer.address, 0);

    const minterFactory = await ethers.getContractFactory(
      "GenArt721Minter_PBAB"
    );
    config.minter = await minterFactory.deploy(config.genArt721Core.address);

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        "project0",
        config.accounts.artist.address,
        config.pricePerTokenInWei
      );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        "project1",
        config.accounts.artist.address,
        config.pricePerTokenInWei
      );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        "project2",
        config.accounts.artist.address,
        config.pricePerTokenInWei
      );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectOne);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectTwo);

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addMintWhitelisted(config.minter.address);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectTwo, config.maxInvocations);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectTwo);

    // set token price for projects zero and one on minter
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectPricePerTokenInWei(
        config.projectZero,
        config.pricePerTokenInWei
      );
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectPricePerTokenInWei(
        config.projectOne,
        config.pricePerTokenInWei
      );

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    config.ERC20Mock = await ERC20Factory.connect(config.accounts.user).deploy(
      ethers.utils.parseEther("100")
    );
    return config;
  }

  // base tests
  describe("common tests", async function () {
    await GenArt721Minter_PBAB_Common(_beforeEach);
  });

  // no additional tests needed for config contract
});
