import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { isCoreV3 } from "../../../util/common";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";

import { Minter_Common } from "../../Minter.common";

// returns true if exponential auction params are all zero
const DALinAuctionParamsAreZero = (auctionParams) => {
  return (
    auctionParams.timestampStart == 0 &&
    auctionParams.timestampEnd == 0 &&
    auctionParams.startPrice == 0 &&
    auctionParams.basePrice == 0
  );
};

/**
 * These tests are intended to check common DALin functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterDALin_Common = async () => {
  describe("common minter tests", async () => {
    await Minter_Common();
  });

  describe("purchase", async function () {
    it("disallows purchase before auction begins", async function () {
      await ethers.provider.send("evm_mine", [this.startTime + ONE_HOUR / 2]);
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.startingPrice.toString(),
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
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: price.toString(),
            gasPrice: 0,
          });
        // Test that price isn't too low
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
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

    it("allows `purchaseTo` with price of zero", async function () {
      // set auction parameters to prices of zero
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await this.minter
        .connect(this.accounts.deployer)
        .setMinimumAuctionLengthSeconds(1);
      await this.minter.connect(this.accounts.artist).setAuctionDetails(
        this.projectZero,
        this.startTime + this.auctionStartTimeOffset,
        this.startTime + this.auctionStartTimeOffset + 1,
        1, // starting price of 1 wei
        0 // base price of zero
      );
      // advance to end of auction, resulting in a price of zero
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset + 1,
      ]);
      // expect mint success with call value of zero
      await this.minter
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.additional.address, this.projectZero, {});
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

    it("disallows auctions that start in past", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            0,
            this.startTime + 2 * ONE_HOUR,
            this.startingPrice,
            this.basePrice
          ),
        "Only future auctions"
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
      expect(DALinAuctionParamsAreZero(auctionParams)).to.be.true;
    });

    it("returns expected values after resetting values", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      const auctionParams = await this.minter
        .connect(this.accounts.deployer)
        .projectAuctionParameters(this.projectZero);
      expect(DALinAuctionParamsAreZero(auctionParams)).to.be.true;
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
      const minterType = await this.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? this.accounts.deployer
          : this.accounts.artist;
      // reduce maxInvocations to 2 on core
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
      // sync max invocations on minter
      await this.minter
        .connect(accountToTestWith)
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

    it("blocks minting after a project max has been invoked", async function () {
      const minterType = await this.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? this.accounts.deployer
          : this.accounts.artist;
      // reduce maxInvocations to 2 on core
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
      // sync max invocations on minter
      await this.minter
        .connect(accountToTestWith)
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
      // expect revert when trying to mint another token
      await expectRevert(
        this.minter.connect(this.accounts.user).purchase(this.projectZero, {
          value: this.startingPrice,
        }),
        "Maximum number of invocations reached"
      );
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
