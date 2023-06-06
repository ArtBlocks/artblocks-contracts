import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { isCoreV3, T_Config } from "../../../../util/common";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../../util/constants";

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
export const MinterDALin_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("common minter tests", async () => {
    await Minter_Common(_beforeEach);
  });

  describe("purchase", async function () {
    it("disallows purchase before auction begins", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [config.startTime + ONE_HOUR / 2]);
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice.toString(),
          }),
        "Auction not yet started"
      );
    });

    it("calculates the price correctly", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);

      const step = ONE_MINUTE * 8; // 480 seconds
      const numSteps = 15;
      for (let i = 1; i < numSteps; i++) {
        let userBalance = await config.accounts.user.getBalance();
        let a = ethers.BigNumber.from(i * step).mul(
          config.startingPrice.sub(config.basePrice).toString()
        );
        let t = ethers.BigNumber.from(a.toString());
        let price = config.startingPrice.sub(t.div(step * numSteps));
        let contractPriceInfo = await config.minter
          .connect(config.accounts.user)
          .getPriceInfo(config.projectZero);
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset + i * step,
        ]);
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: price.toString(),
            gasPrice: 0,
          });
        // Test that price isn't too low
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: (
                (price.toBigInt() * BigInt(100)) /
                BigInt(101)
              ).toString(),
              gasPrice: 0,
            }),
          "Must send minimum value to mint!"
        );
        let userDelta = (await config.accounts.user.getBalance()).sub(
          userBalance
        );
        expect(userDelta.mul("-1").lte(contractPriceInfo.tokenPriceInWei)).to.be
          .true;
      }
    });

    it("calculates the price before correctly", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime + ONE_HOUR,
          config.startTime + 2 * ONE_HOUR,
          config.startingPrice,
          config.basePrice
        );

      let contractPriceInfo = await config.minter
        .connect(config.accounts.user)
        .getPriceInfo(config.projectZero);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(
        config.startingPrice
      );
    });

    it("calculates the price after correctly ", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime + ONE_HOUR,
          config.startTime + 2 * ONE_HOUR,
          config.startingPrice,
          config.basePrice
        );

      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset + 2 * ONE_HOUR,
      ]);

      let contractPriceInfo = await config.minter
        .connect(config.accounts.user)
        .getPriceInfo(config.projectZero);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(config.basePrice);
    });

    it("allows `purchaseTo` with price of zero", async function () {
      const config = await loadFixture(_beforeEach);
      // set auction parameters to prices of zero
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await config.minter
        .connect(config.accounts.deployer)
        .setMinimumAuctionLengthSeconds(1);
      await config.minter.connect(config.accounts.artist).setAuctionDetails(
        config.projectZero,
        config.startTime + config.auctionStartTimeOffset,
        config.startTime + config.auctionStartTimeOffset + 1,
        1, // starting price of 1 wei
        0 // base price of zero
      );
      // advance to end of auction, resulting in a price of zero
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset + 1,
      ]);
      // expect mint success with call value of zero
      await config.minter
        .connect(config.accounts.user)
        .purchaseTo(config.accounts.additional.address, config.projectZero, {});
    });
  });

  describe("setAuctionDetails", async function () {
    it("cannot be modified mid-auction", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [config.startTime + ONE_HOUR]);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_MINUTE,
            config.startTime + 2 * ONE_HOUR,
            config.startingPrice,
            config.basePrice
          ),
        "No modifications mid-auction"
      );
    });

    it("allows artist to set auction details", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime + ONE_MINUTE,
          config.startTime + 2 * ONE_HOUR,
          config.startingPrice,
          config.basePrice
        );
    });

    it("disallows whitelisted and non-artist to set auction details", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_MINUTE,
            config.startTime + 2 * ONE_HOUR,
            config.startingPrice,
            config.basePrice
          ),
        "Only Artist"
      );

      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_MINUTE,
            config.startTime + 2 * ONE_HOUR,
            config.startingPrice,
            config.basePrice
          ),
        "Only Artist"
      );
    });

    it("disallows higher resting price than starting price", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_MINUTE,
            config.startTime + 2 * ONE_HOUR,
            config.basePrice,
            config.startingPrice
          ),
        "Auction start price must be greater than auction end price"
      );
    });

    it("disallows auctions that start in past", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            0,
            config.startTime + 2 * ONE_HOUR,
            config.startingPrice,
            config.basePrice
          ),
        "Only future auctions"
      );
    });
  });

  describe("projectAuctionParameters", async function () {
    it("returns expected populated values", async function () {
      const config = await loadFixture(_beforeEach);
      const auctionParams = await config.minter.projectAuctionParameters(
        config.projectZero
      );
      expect(auctionParams.timestampStart).to.be.equal(
        config.startTime + config.auctionStartTimeOffset
      );
      expect(auctionParams.timestampEnd).to.be.equal(
        config.startTime + config.auctionStartTimeOffset + ONE_HOUR * 2
      );
      expect(auctionParams.startPrice).to.be.equal(config.startingPrice);
      expect(auctionParams.basePrice).to.be.equal(config.basePrice);
    });

    it("returns expected initial values", async function () {
      const config = await loadFixture(_beforeEach);
      const auctionParams = await config.minter
        .connect(config.accounts.deployer)
        .projectAuctionParameters(config.projectOne);
      expect(DALinAuctionParamsAreZero(auctionParams)).to.be.true;
    });

    it("returns expected values after resetting values", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      const auctionParams = await config.minter
        .connect(config.accounts.deployer)
        .projectAuctionParameters(config.projectZero);
      expect(DALinAuctionParamsAreZero(auctionParams)).to.be.true;
    });
  });

  describe("projectMaxHasBeenInvoked", async function () {
    it("returns expected value for project zero", async function () {
      const config = await loadFixture(_beforeEach);
      const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
        config.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("returns true after a project is minted out", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // sync max invocations on minter
      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectZero);
      // mint a token
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
      // expect projectMaxHasBeenInvoked to be true
      const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
        config.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.true;
    });

    it("blocks minting after a project max has been invoked", async function () {
      const config = await loadFixture(_beforeEach);
      const minterType = await config.minter.minterType();
      const accountToTestWith =
        minterType.includes("V0") || minterType.includes("V1")
          ? config.accounts.deployer
          : config.accounts.artist;
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // sync max invocations on minter
      await config.minter
        .connect(accountToTestWith)
        .setProjectMaxInvocations(config.projectZero);
      // mint a token
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
      // expect projectMaxHasBeenInvoked to be true
      const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
        config.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.true;
      // expect revert when trying to mint another token
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          }),
        "Maximum number of invocations reached"
      );
    });
  });

  describe("resetAuctionDetails", async function () {
    it("allows whitelisted to reset auction details", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero)
      )
        .to.emit(config.minter, "ResetAuctionDetails")
        .withArgs(config.projectZero);
    });

    it("disallows artist to reset auction details", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedErrorMsg = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .resetAuctionDetails(config.projectZero),
        expectedErrorMsg
      );
    });

    it("disallows non-whitelisted non-artist to reset auction details", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedErrorMsg = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .resetAuctionDetails(config.projectZero),
        expectedErrorMsg
      );
    });

    it("invalidates unpaused, ongoing auction (prevents price of zero)", async function () {
      const config = await loadFixture(_beforeEach);
      // prove config.projectZero is mintable
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
      // resetAuctionDetails for config.projectZero
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // prove config.projectZero is no longer mintable
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          }),
        "Only configured auctions"
      );
      // prove config.projectZero is no longer mintable with zero value
      // (always true given prior check, but paranoid so adding test)
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero),
        "Only configured auctions"
      );
    });
  });

  describe("enforce and broadcasts min auction length", async function () {
    it("enforces min/max auction length constraint", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert when creating a new project with min/max reversed
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_HOUR * 2,
            config.startTime + ONE_HOUR,
            config.startingPrice,
            config.basePrice
          ),
        "Auction end must be greater than auction start"
      );
    });

    it("enforces min auction length constraint", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert when creating a new project with
      const invalidLengthSeconds = 60;
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + ONE_HOUR,
            config.startTime + ONE_HOUR + invalidLengthSeconds,
            config.startingPrice,
            config.basePrice
          ),
        "Auction length must be at least minimumAuctionLengthSeconds"
      );
    });

    it("emits event when min auction length is updated", async function () {
      const config = await loadFixture(_beforeEach);
      const newLengthSeconds = 3601;
      // emits event when minimum auction length is updated
      await expect(
        config.minter
          .connect(config.accounts.deployer)
          .setMinimumAuctionLengthSeconds(newLengthSeconds)
      )
        .to.emit(config.minter, "MinimumAuctionLengthSecondsUpdated")
        .withArgs(newLengthSeconds);
    });

    it("validate setMinimumAuctionLengthSeconds ACL", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedErrorMsg = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setMinimumAuctionLengthSeconds(600),
        expectedErrorMsg
      );
    });
  });
};
