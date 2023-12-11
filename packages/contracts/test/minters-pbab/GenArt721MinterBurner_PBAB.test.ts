import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getAccounts, assignDefaultConstants, T_Config } from "../util/common";
import { BigNumber } from "ethers";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";

import { GenArt721Minter_PBAB_Common } from "./GenArt721Minter_PBAB.common";

/**
 * These tests intended to ensure Filtered Minter integrates properly with V1
 * core contract.
 */
describe("GenArt721MinterBurner_PBAB", async function () {
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
      "GenArt721MinterBurner_PBAB"
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
    config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);
    config.genArt721Core
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

  describe("setBurnERC20DuringPurchase", async function () {
    it("only allows admin to update which ERC20 tokens are burned", async function () {
      const config = await loadFixture(_beforeEach);
      const onlyAdminErrorMessage = "can only be set by admin";
      // doesn't allow artist
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setBurnERC20DuringPurchase(config.ERC20Mock.address, true),
        onlyAdminErrorMessage
      );
      // doesn't allow additional
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setBurnERC20DuringPurchase(config.ERC20Mock.address, true),
        onlyAdminErrorMessage
      );
      // does allow isWhitelisted deployer
      await config.minter
        .connect(config.accounts.deployer)
        .setBurnERC20DuringPurchase(config.ERC20Mock.address, true);
    });

    it("does not burn tokens by default", async function () {
      const config = await loadFixture(_beforeEach);
      const balanceBefore: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );
      await config.minter
        .connect(config.accounts.user)
        .purchase(
          config.projectZero,
          config.pricePerTokenInWei,
          config.ERC20Mock.address
        );
      // artist balance of ERC20 token should be > than before
      const balanceAfter: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it("does burn tokens when configured to burn", async function () {
      const config = await loadFixture(_beforeEach);
      // admin configures to burn tokens
      await config.minter
        .connect(config.accounts.deployer)
        .setBurnERC20DuringPurchase(config.ERC20Mock.address, true);

      const balanceBefore: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );
      await config.minter
        .connect(config.accounts.user)
        .purchase(
          config.projectZero,
          config.pricePerTokenInWei,
          config.ERC20Mock.address
        );
      // artist balance of ERC20 token should be same as before
      const balanceAfter: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      expect(balanceAfter.eq(balanceBefore)).to.be.true;
    });

    it("does not burn tokens when un-set", async function () {
      const config = await loadFixture(_beforeEach);
      // admin configures to burn tokens
      await config.minter
        .connect(config.accounts.deployer)
        .setBurnERC20DuringPurchase(config.ERC20Mock.address, true);

      // admin configures to not burn tokens
      await config.minter
        .connect(config.accounts.deployer)
        .setBurnERC20DuringPurchase(config.ERC20Mock.address, false);

      const balanceBefore: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      // artist changes to Mock ERC20 token
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectCurrencyInfo(
          config.projectZero,
          "MOCK",
          config.ERC20Mock.address
        );
      // approve contract and able to mint with Mock token, purchase
      await config.ERC20Mock.connect(config.accounts.user).approve(
        config.minter.address,
        ethers.utils.parseEther("100")
      );
      await config.minter
        .connect(config.accounts.user)
        .purchase(
          config.projectZero,
          config.pricePerTokenInWei,
          config.ERC20Mock.address
        );
      // artist balance of ERC20 token should be > than before
      const balanceAfter: BigNumber = await config.ERC20Mock.balanceOf(
        config.accounts.artist.address
      );
      expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });
  });
});
