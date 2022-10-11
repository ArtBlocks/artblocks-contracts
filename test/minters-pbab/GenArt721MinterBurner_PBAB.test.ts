import { ethers } from "hardhat";
import { getAccounts, assignDefaultConstants } from "../util/common";
import { BigNumber } from "ethers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";

import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721MinterBurner_PBAB", async function () {
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
      "GenArt721MinterBurner_PBAB"
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
    this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectOne);
    this.genArt721Core
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

  describe("setBurnERC20DuringPurchase", async function () {
    it("only allows admin to update which ERC20 tokens are burned", async function () {
      const onlyAdminErrorMessage = "can only be set by admin";
      // doesn't allow artist
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setBurnERC20DuringPurchase(this.ERC20Mock.address, true),
        onlyAdminErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setBurnERC20DuringPurchase(this.ERC20Mock.address, true),
        onlyAdminErrorMessage
      );
      // does allow isWhitelisted deployer
      await this.minter
        .connect(this.accounts.deployer)
        .setBurnERC20DuringPurchase(this.ERC20Mock.address, true);
    });

    it("does not burn tokens by default", async function () {
      const balanceBefore: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.user).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.user).purchase(this.projectZero);
      // artist balance of ERC20 token should be > than before
      const balanceAfter: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it("does burn tokens when configured to burn", async function () {
      // admin configures to burn tokens
      await this.minter
        .connect(this.accounts.deployer)
        .setBurnERC20DuringPurchase(this.ERC20Mock.address, true);

      const balanceBefore: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.user).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.user).purchase(this.projectZero);
      // artist balance of ERC20 token should be same as before
      const balanceAfter: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      expect(balanceAfter.eq(balanceBefore)).to.be.true;
    });

    it("does not burn tokens when un-set", async function () {
      // admin configures to burn tokens
      await this.minter
        .connect(this.accounts.deployer)
        .setBurnERC20DuringPurchase(this.ERC20Mock.address, true);

      // admin configures to not burn tokens
      await this.minter
        .connect(this.accounts.deployer)
        .setBurnERC20DuringPurchase(this.ERC20Mock.address, false);

      const balanceBefore: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectZero,
          "MOCK",
          this.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.user).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.user).purchase(this.projectZero);
      // artist balance of ERC20 token should be > than before
      const balanceAfter: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });
  });
});
