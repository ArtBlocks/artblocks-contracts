import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure the PBAB MinterBurner integrates properly
 * with the PBAB core contract.
 */
const minter = "GenArt721MinterBurner_PBAB";
describe(minter, async function () {
  // base tests
  GenArt721Minter_PBAB_Common(minter);
  // additional tests
  const name = "Non Fungible Token";
  const symbol = "NFT";

  const firstTokenId = new BN("0");
  const secondTokenId = new BN("1");

  const pricePerTokenInWei = ethers.utils.parseEther("1");
  const higherPricePerTokenInWei = ethers.utils.parseEther("1.1");
  const projectZero = 0;
  const projectOne = 1;
  const projectTwo = 2;

  const projectMaxInvocations = 15;

  beforeEach(async function () {
    const [owner, newOwner, artist, additional, deployer] =
      await ethers.getSigners();
    this.accounts = {
      owner: owner,
      newOwner: newOwner,
      artist: artist,
      additional: additional,
      deployer: deployer,
    };
    const randomizerFactory = await ethers.getContractFactory(
      "BasicRandomizer"
    );
    this.randomizer = await randomizerFactory.deploy();

    const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
    this.token = await PBABFactory.connect(deployer).deploy(
      name,
      symbol,
      this.randomizer.address
    );

    const minterFactory = await ethers.getContractFactory(minter);
    this.minter = await minterFactory.deploy(this.token.address);

    await this.token
      .connect(deployer)
      .addProject("project0", artist.address, pricePerTokenInWei);

    await this.token
      .connect(deployer)
      .addProject("project1", artist.address, pricePerTokenInWei);

    await this.token
      .connect(deployer)
      .addProject("project2", artist.address, pricePerTokenInWei);

    await this.token.connect(deployer).toggleProjectIsActive(projectZero);
    await this.token.connect(deployer).toggleProjectIsActive(projectOne);
    await this.token.connect(deployer).toggleProjectIsActive(projectTwo);

    await this.token.connect(deployer).addMintWhitelisted(this.minter.address);

    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectZero, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectOne, projectMaxInvocations);
    await this.token
      .connect(artist)
      .updateProjectMaxInvocations(projectTwo, projectMaxInvocations);

    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectZero);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectOne);
    this.token.connect(this.accounts.artist).toggleProjectIsPaused(projectTwo);

    // set token price for projects zero and one on minter
    await this.token
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(projectZero, pricePerTokenInWei);
    await this.token
      .connect(this.accounts.artist)
      .updateProjectPricePerTokenInWei(projectOne, pricePerTokenInWei);

    // mock ERC20 token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    this.ERC20Mock = await ERC20Factory.deploy(ethers.utils.parseEther("100"));
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
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.owner).purchase(projectZero);
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
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.owner).purchase(projectZero);
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
      await this.token
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(projectZero, "MOCK", this.ERC20Mock.address);
      // approve contract and able to mint with Mock token, purchase
      await this.ERC20Mock.connect(this.accounts.owner).approve(
        this.minter.address,
        ethers.utils.parseEther("100")
      );
      await this.minter.connect(this.accounts.owner).purchase(projectZero);
      // artist balance of ERC20 token should be > than before
      const balanceAfter: BigNumber = await this.ERC20Mock.balanceOf(
        this.accounts.artist.address
      );
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });
  });
});
