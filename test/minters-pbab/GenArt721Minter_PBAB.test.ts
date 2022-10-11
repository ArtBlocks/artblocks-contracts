import { ethers } from "hardhat";
import { getAccounts, assignDefaultConstants } from "../util/common";

import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721Minter_PBAB", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    this.higherPricePerTokenInWei = ethers.utils.parseEther("1.1");
    // deploy and configure contracts
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
    this.genArt721Core = await PBABFactory.connect(
      this.accounts.deployer
    ).deploy(this.name, this.symbol, this.randomizer.address, 0);

    const minterFactory = await ethers.getContractFactory(
      "GenArt721Minter_PBAB"
    );
    this.minter = await minterFactory.deploy(this.genArt721Core.address);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "project0",
        this.accounts.artist.address,
        this.pricePerTokenInWei
      );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "project1",
        this.accounts.artist.address,
        this.pricePerTokenInWei
      );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject(
        "project2",
        this.accounts.artist.address,
        this.pricePerTokenInWei
      );

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectTwo);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minter.address);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectTwo);

    // set token price for projects zero and one on minter
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(
        this.projectZero,
        this.pricePerTokenInWei
      );
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(
        this.projectOne,
        this.pricePerTokenInWei
      );

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.connect(this.accounts.user).deploy(
      ethers.utils.parseEther("100")
    );
  });

  // base tests
  describe("common tests", async function () {
    await GenArt721Minter_PBAB_Common();
  });

  // no additional tests neeeded for this contract
});
