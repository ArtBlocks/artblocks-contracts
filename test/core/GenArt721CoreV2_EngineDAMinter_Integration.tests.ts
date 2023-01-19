import { Coder } from "@ethersproject/abi/lib/coders/abstract-coder";
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../util/constants";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../util/common";
import { GenArt721MinterV1V2PRTNR_Common } from "./GenArt721CoreV1V2PRTNR.common";

/**
 * These tests are intended to check integration of the V2-engine compatible DA minter
 * with the V2_PBAB core contract.
 * Some basic core tests, and basic functional tests to ensure purchase
 * does in fact mint tokens to purchaser.
 */
describe("GenArt721CoreV2_EngineDAMinter_Integration", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
    // deploy and configure core, randomizer, and minter
    this.randomizer = await deployAndGet.call(this, "BasicRandomizer", []);
    // V2_PBAB need additional arg for starting project ID
    this.genArt721Core = await deployAndGet.call(this, "GenArt721CoreV2_PBAB", [
      this.name,
      this.symbol,
      this.randomizer.address,
      0,
    ]);
    // add project
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("name", this.accounts.artist.address, 0);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);
    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
    // deploy + add minter
    this.minter = await deployAndGet.call(this, "GenArt721MinterDAExp_PBAB", [
      this.genArt721Core.address,
    ]);
    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minter.address);
    // configure minter
    this.defaultHalfLife = ONE_HOUR / 2;
    this.auctionStartTimeOffset = ONE_HOUR;
    if (!this.startTime) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      this.startTime = block.timestamp;
    }
    this.startTime = this.startTime + ONE_DAY;
    await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
    await this.minter
      .connect(this.accounts.deployer)
      .resetAuctionDetails(this.projectZero);
    // perform tests in fixed-price-mode
    await this.minter
      .connect(this.accounts.artist)
      .setAuctionDetails(
        this.projectZero,
        this.startTime + this.auctionStartTimeOffset,
        this.defaultHalfLife,
        this.pricePerTokenInWei,
        this.pricePerTokenInWei
      );
    await ethers.provider.send("evm_mine", [
      this.startTime + this.auctionStartTimeOffset,
    ]);
  });

  describe("common tests", async function () {
    await GenArt721MinterV1V2PRTNR_Common();
  });

  describe("core allowlisted ACL checks", function () {
    const expectedErrorMessage = "Only Core allowlisted";
    it("setAllowablePriceDecayHalfLifeRangeSeconds is gated", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAllowablePriceDecayHalfLifeRangeSeconds(60, 600),
        expectedErrorMessage
      );
    });
    it("resetAuctionDetails is gated", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .resetAuctionDetails(this.projectZero),
        expectedErrorMessage
      );
    });
  });

  describe("valid project ID checks", function () {
    const expectedErrorMessage = "Only existing projects";
    it("resetAuctionDetails is gated", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectOne),
        expectedErrorMessage
      );
    });
    it("setAuctionDetails is gated", async function () {
      await expectRevert(
        this.minter.connect(this.accounts.artist).setAuctionDetails(
          this.projectOne,
          0, // not relevant for this test, as it is checked later
          0, // not relevant for this test, as it is checked later
          0, // not relevant for this test, as it is checked later
          0 // not relevant for this test, as it is checked later
        ),
        expectedErrorMessage
      );
    });
  });

  describe("initial nextProjectId", function () {
    it("returns zero when initialized to zero nextProjectId", async function () {
      // one project has already been added, so should be one
      expect(await this.genArt721Core.nextProjectId()).to.be.equal(1);
    });

    it("returns >0 when initialized to >0 nextProjectId", async function () {
      const differentGenArt721Core = await deployAndGet.call(
        this,
        "GenArt721CoreV2_PBAB",
        [this.name, this.symbol, this.randomizer.address, 365]
      );
      expect(await differentGenArt721Core.nextProjectId()).to.be.equal(365);
    });
  });

  describe("purchase payments and gas", async function () {
    it("can create a token then funds distributed (no additional payee) [ @skip-on-coverage ]", async function () {
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(this.projectZeroInfo.invocations).to.equal("1");
      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8971085"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.017956").mul("-1")); // spent 1 ETH
    });

    it("can create a token then funds distributed (with additional payee) [ @skip-on-coverage ]", async function () {
      const additionalBalance = await this.accounts.additional.getBalance();
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      const additionalPayeePercentage = 10;
      this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          this.projectZero,
          this.accounts.additional.address,
          additionalPayeePercentage
        );
      this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      this.projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(this.projectZeroInfo.invocations).to.equal("1");

      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.09"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.019235").mul("-1")); // spent 1 ETH
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.8002178"));
    });

    it("can create a token then funds distributed (with additional payee getting 100%) [ @skip-on-coverage ]", async function () {
      const additionalBalance = await this.accounts.additional.getBalance();
      const artistBalance = await this.accounts.artist.getBalance();
      const ownerBalance = await this.accounts.user.getBalance();
      const deployerBalance = await this.accounts.deployer.getBalance();

      const additionalPayeePercentage = 100;
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectAdditionalPayeeInfo(
          this.projectZero,
          this.accounts.additional.address,
          additionalPayeePercentage
        );
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);

      // pricePerTokenInWei setup above to be 1 ETH
      await expect(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        })
      )
        .to.emit(this.genArt721Core, "Transfer")
        .withArgs(
          constants.ZERO_ADDRESS,
          this.accounts.user.address,
          this.projectZeroTokenZero
        );

      const projectZeroInfo = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(projectZeroInfo.invocations).to.equal("1");

      expect(
        (await this.accounts.deployer.getBalance()).sub(deployerBalance)
      ).to.equal(ethers.utils.parseEther("0.1"));
      expect(
        (await this.accounts.additional.getBalance()).sub(additionalBalance)
      ).to.equal(ethers.utils.parseEther("0.9"));
      expect(
        (await this.accounts.user.getBalance()).sub(ownerBalance)
      ).to.equal(ethers.utils.parseEther("1.017978").mul("-1")); // spent 1 ETH
      expect(
        (await this.accounts.artist.getBalance()).sub(artistBalance)
      ).to.equal(ethers.utils.parseEther("0.0097822").mul("-1"));
    });
  });
});
