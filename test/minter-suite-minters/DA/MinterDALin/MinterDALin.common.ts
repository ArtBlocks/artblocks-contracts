import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { isCoreV3 } from "../../../util/common";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";

import { Minter_Common } from "../../Minter.common";

/**
 * These tests are intended to check common DALin functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterDALin_Common = async () => {
  describe("common minter tests", async () => {
    Minter_Common();
  });

  describe("purchase", async function () {
    it("disallows purchase before auction begins", async function () {
      await ethers.provider.send("evm_mine", [this.startTime + ONE_HOUR / 2]);
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.startingPrice.toString(),
          gasPrice: 0,
        }),
        "Auction not yet started"
      );
    });

    it("calculates the price correctly", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);

      const step = ONE_MINUTE * 8; // 480 seconds
      const numSteps = 15;
      for (let i = 1; i < numSteps; i++) {
        let userBalance = await this.accounts.user.getBalance();
        let a = ethers.BigNumber.from(i * step).mul(
          this.startingPrice.sub(this.basePrice).toString()
        );
        let t = ethers.BigNumber.from(a.toString());
        let price = this.startingPrice.sub(t.div(step * numSteps));
        let contractPriceInfo = await this.minter
          .connect(this.accounts.user)
          .getPriceInfo(this.projectZero);
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset + i * step,
        ]);
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: price.toString(),
            gasPrice: 0,
          });
        // Test that price isn't too low

        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero, {
            value: ((price.toBigInt() * BigInt(100)) / BigInt(101)).toString(),
            gasPrice: 0,
          }),
          "Must send minimum value to mint!"
        );
        let userDelta = (await this.accounts.user.getBalance()).sub(
          userBalance
        );
        expect(userDelta.mul("-1").lte(contractPriceInfo.tokenPriceInWei)).to.be
          .true;
      }
    });

    it("calculates the price before correctly", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          this.startTime + ONE_HOUR,
          this.startTime + 2 * ONE_HOUR,
          this.startingPrice,
          this.basePrice
        );

      let contractPriceInfo = await this.minter
        .connect(this.accounts.user)
        .getPriceInfo(this.projectZero);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(this.startingPrice);
    });

    it("calculates the price after correctly ", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          this.startTime + ONE_HOUR,
          this.startTime + 2 * ONE_HOUR,
          this.startingPrice,
          this.basePrice
        );

      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset + 2 * ONE_HOUR,
      ]);

      let contractPriceInfo = await this.minter
        .connect(this.accounts.user)
        .getPriceInfo(this.projectZero);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(this.basePrice);
    });
  });

  describe("setAuctionDetails", async function () {
    it("cannot be modified mid-auction", async function () {
      await ethers.provider.send("evm_mine", [this.startTime + ONE_HOUR]);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_MINUTE,
            this.startTime + 2 * ONE_HOUR,
            this.startingPrice,
            this.basePrice
          ),
        "No modifications mid-auction"
      );
    });

    it("allows artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          this.startTime + ONE_MINUTE,
          this.startTime + 2 * ONE_HOUR,
          this.startingPrice,
          this.basePrice
        );
    });

    it("disallows whitelisted and non-artist to set auction details", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_MINUTE,
            this.startTime + 2 * ONE_HOUR,
            this.startingPrice,
            this.basePrice
          ),
        "Only Artist"
      );

      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_MINUTE,
            this.startTime + 2 * ONE_HOUR,
            this.startingPrice,
            this.basePrice
          ),
        "Only Artist"
      );
    });

    it("disallows higher resting price than starting price", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_MINUTE,
            this.startTime + 2 * ONE_HOUR,
            this.basePrice,
            this.startingPrice
          ),
        "Auction start price must be greater than auction end price"
      );
    });
  });

  describe("projectAuctionParameters", async function () {
    it("returns expected populated values", async function () {
      const auctionParams = await this.minter.projectAuctionParameters(
        this.projectZero
      );
      expect(auctionParams.timestampStart).to.be.equal(
        this.startTime + this.auctionStartTimeOffset
      );
      expect(auctionParams.timestampEnd).to.be.equal(
        this.startTime + this.auctionStartTimeOffset + ONE_HOUR * 2
      );
      expect(auctionParams.startPrice).to.be.equal(this.startingPrice);
      expect(auctionParams.basePrice).to.be.equal(this.basePrice);
    });

    it("returns expected initial values", async function () {
      const auctionParams = await this.minter
        .connect(this.accounts.deployer)
        .projectAuctionParameters(this.projectOne);
      expect(auctionParams.timestampStart).to.be.equal(0);
      expect(auctionParams.timestampEnd).to.be.equal(0);
      expect(auctionParams.startPrice).to.be.equal(0);
      expect(auctionParams.basePrice).to.be.equal(0);
    });

    it("returns expected values after resetting values", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      const auctionParams = await this.minter
        .connect(this.accounts.deployer)
        .projectAuctionParameters(this.projectZero);
      expect(auctionParams.timestampStart).to.be.equal(0);
      expect(auctionParams.timestampEnd).to.be.equal(0);
      expect(auctionParams.startPrice).to.be.equal(0);
      expect(auctionParams.basePrice).to.be.equal(0);
    });
  });

  describe("projectMaxHasBeenInvoked", async function () {
    it("returns expected value for project zero", async function () {
      const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
        this.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("returns true after a project is minted out", async function () {
      // reduce maxInvocations to 2 on core
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
      // sync max invocations on minter
      await this.minter
        .connect(this.accounts.deployer)
        .setProjectMaxInvocations(this.projectZero);
      // mint a token
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.startingPrice,
      });
      // expect projectMaxHasBeenInvoked to be true
      const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
        this.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.true;
    });
  });

  describe("resetAuctionDetails", async function () {
    it("allows whitelisted to reset auction details", async function () {
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero)
      )
        .to.emit(this.minter, "ResetAuctionDetails")
        .withArgs(this.projectZero);
    });

    it("disallows artist to reset auction details", async function () {
      const expectedErrorMsg = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .resetAuctionDetails(this.projectZero),
        expectedErrorMsg
      );
    });

    it("disallows non-whitelisted non-artist to reset auction details", async function () {
      const expectedErrorMsg = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .resetAuctionDetails(this.projectZero),
        expectedErrorMsg
      );
    });

    it("invalidates unpaused, ongoing auction (prevents price of zero)", async function () {
      // prove this.projectZero is mintable
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.startingPrice,
      });
      // resetAuctionDetails for this.projectZero
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // prove this.projectZero is no longer mintable
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.startingPrice,
        }),
        "Only configured auctions"
      );
      // prove this.projectZero is no longer mintable with zero value
      // (always true given prior check, but paranoid so adding test)
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero),
        "Only configured auctions"
      );
    });
  });

  describe("enforce and broadcasts min auction length", async function () {
    it("enforces min/max auction length constraint", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect revert when creating a new project with min/max reversed
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_HOUR * 2,
            this.startTime + ONE_HOUR,
            this.startingPrice,
            this.basePrice
          ),
        "Auction end must be greater than auction start"
      );
    });

    it("enforces min auction length constraint", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect revert when creating a new project with
      const invalidLengthSeconds = 60;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + ONE_HOUR,
            this.startTime + ONE_HOUR + invalidLengthSeconds,
            this.startingPrice,
            this.basePrice
          ),
        "Auction length must be at least minimumAuctionLengthSeconds"
      );
    });

    it("emits event when min auction length is updated", async function () {
      const newLengthSeconds = 3601;
      // emits event when minimum auction length is updated
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .setMinimumAuctionLengthSeconds(newLengthSeconds)
      )
        .to.emit(this.minter, "MinimumAuctionLengthSecondsUpdated")
        .withArgs(newLengthSeconds);
    });

    it("validate setMinimumAuctionLengthSeconds ACL", async function () {
      const expectedErrorMsg = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setMinimumAuctionLengthSeconds(600),
        expectedErrorMsg
      );
    });
  });
};
