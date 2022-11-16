import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { isCoreV3, getTxResponseTimestamp } from "../../../util/common";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";

import { Minter_Common } from "../../Minter.common";

// returns true if exponential auction params are all zero
const DAExpAuctionParamsAreZero = (auctionParams) => {
  return (
    auctionParams.timestampStart == 0 &&
    auctionParams.priceDecayHalfLifeSeconds == 0 &&
    auctionParams.startPrice == 0 &&
    auctionParams.basePrice == 0
  );
};

/**
 * helper function that returns the expected price for a set of auction params
 * and a given timestamp. Emulates the pseudo-exponential decay formula defined
 * in the MinterDAExp contracts.
 */
function calcPriceFromAuctionDetailsAndTimestamp(auctionParams, timestamp) {
  const { timestampStart, priceDecayHalfLifeSeconds, startPrice, basePrice } =
    auctionParams;
  const secondsSinceStart = timestamp - timestampStart;
  const completedHalfLivesSinceStart = Math.floor(
    secondsSinceStart / priceDecayHalfLifeSeconds
  );
  // decay by number of full half-lives since start
  let price = startPrice.div(Math.pow(2, completedHalfLivesSinceStart));
  // linear interpolation between remaining partial half-life and next full half-life
  const partialHalfLifeSeconds = secondsSinceStart % priceDecayHalfLifeSeconds;
  const nextHalfLifePrice = price.div(2);
  price = price.sub(
    nextHalfLifePrice.mul(partialHalfLifeSeconds).div(priceDecayHalfLifeSeconds)
  );
  // ensure price never drops below base price
  if (price.lt(basePrice)) {
    return basePrice;
  }
  return price;
}

/**
 * helper function that:
 *  - mints a single token during auction, then reaches base price
 *  - artist withdraws revenues
 * results in a state where revenues are split at time of sale
 * @dev intended to be called with `this` bound to a test context
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports this test.
 */
export async function completeAuctionWithoutSellingOut(
  projectId: number
): Promise<void> {
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset,
  ]);
  // purchase one piece
  await this.minter.connect(this.accounts.user).purchase_H4M(projectId, {
    value: this.startingPrice,
  });
  // advance to end of auction
  // @dev 10 half-lives is enough to reach base price
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset + this.defaultHalfLife * 10,
  ]);
  // withdraw revenues
  await this.minter
    .connect(this.accounts.artist)
    .withdrawArtistAndAdminRevenues(projectId);
  // leave in a state where revenues are split at the time of the sale
}

/**
 * helper function that:
 *  - mints a single token during auction, then advances one minute
 *  - mints a another token during auction, then advances one minute
 * results in a state where refund may be executed for multiple tokens
 * @dev intended to be called with `this` bound to a test context
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports this test.
 */
export async function purchaseTokensMidAuction(
  projectId: number
): Promise<void> {
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset,
  ]);
  // purchase one piece, no gas cost
  let balanceBefore = await this.accounts.user.getBalance();
  await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
  await this.minter.connect(this.accounts.user).purchase_H4M(projectId, {
    value: this.startingPrice,
    gasPrice: 0,
  });
  // advance one minute
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset + ONE_MINUTE,
  ]);
  // purchase another piece, no gas cost
  await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
  await this.minter.connect(this.accounts.user).purchase_H4M(projectId, {
    value: this.startingPrice,
    gasPrice: 0,
  });
  let balanceAfter = await this.accounts.user.getBalance();
  expect(balanceBefore.sub(balanceAfter)).to.equal(this.startingPrice.mul(2));
  // advance one minute
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset + 2 * ONE_MINUTE,
  ]);
}

/**
 * helper function that:
 *  - sells out a project during an auction, before reaching base price
 * results in a state where revenues have not been withdrawn, but project has a
 * sellout price
 * @dev intended to be called with `this` bound to a test context
 * @dev reduces project max invocations to 2, so that the project will sell out
 * with a two purchases (ensuring that calculations involving
 * numRefundableInvocations are tested properly)
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports this test.
 */
export async function selloutMidAuction(projectId: number): Promise<void> {
  // reduce max invocations to 2
  await this.genArt721Core
    .connect(this.accounts.artist)
    .updateProjectMaxInvocations(projectId, 2);
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    this.startTime + this.auctionStartTimeOffset,
  ]);
  // purchase two pieces to achieve sellout
  for (let i = 0; i < 2; i++) {
    await this.minter.connect(this.accounts.user).purchase_H4M(projectId, {
      value: this.startingPrice,
    });
  }
  // leave in a state where sellout price is defined, but revenues have not been
  // withdrawn
}

/**
 * These tests are intended to check common DAExp functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterDAExpRefund_Common = async () => {
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
      for (let i = 1; i <= 5; i++) {
        let ownerBalance = await this.accounts.user.getBalance();
        let price = this.startingPrice;
        for (let j = 0; j < i; j++) {
          price = price.div(2);
        }
        // advance another half-life
        await ethers.provider.send("evm_mine", [
          this.startTime +
            this.auctionStartTimeOffset +
            i * this.defaultHalfLife,
        ]);
        // expect price is as expected
        const priceInfo = await this.minter.getPriceInfo(this.projectZero);
        expect(priceInfo.tokenPriceInWei.toString()).to.be.equal(
          price.toString()
        );
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
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
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
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          this.startingPrice,
          this.basePrice
        );

      await ethers.provider.send("evm_mine", [this.startTime + 5 * ONE_HOUR]);

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
        .setAllowablePriceDecayHalfLifeRangeSeconds(1, 100);
      await this.minter.connect(this.accounts.artist).setAuctionDetails(
        this.projectZero,
        this.startTime + this.auctionStartTimeOffset,
        1, // half-life of one second
        1, // starting price of 1 wei
        0 // base price of zero
      );
      // advance one half-life, >> bitshift of 1 should result in price of zero
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
      await ethers.provider.send("evm_mine", [
        this.startTime + 2 * this.auctionStartTimeOffset,
      ]);
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
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
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          this.startingPrice,
          this.basePrice
        );
    });

    it("disallows whitelisted and non-artist to set auction details", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
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
            this.startTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
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
            this.startTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
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
            this.defaultHalfLife,
            this.startingPrice,
            this.basePrice
          ),
        "Only future auctions"
      );
    });

    it("disallows starting price higher than latestPurchasePrice if num refundable invocations > 0", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect revert when setting starting price higher than latestPurchasePrice
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime = this.startTime + ONE_DAY;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            newStartTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
            latestPurchasePrice.add(1),
            this.basePrice
          ),
        "Auction start price must be less than or equal to previous auction price"
      );
    });

    it("allows starting price equal to latestPurchasePrice if num refundable invocations > 0", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect success when setting starting price equal to latestPurchasePrice
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime =
        this.startTime + this.auctionStartTimeOffset + ONE_DAY;
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          newStartTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          latestPurchasePrice,
          this.basePrice
        );
    });

    it("allows starting price less than latestPurchasePrice if num refundable invocations > 0", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect success when setting starting price equal to latestPurchasePrice
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime =
        this.startTime + this.auctionStartTimeOffset + ONE_DAY;
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          newStartTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          latestPurchasePrice.sub(1),
          this.basePrice
        );
    });

    it("emits event when auction details are updated", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      await expect(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + this.auctionStartTimeOffset,
            this.defaultHalfLife,
            this.startingPrice,
            this.basePrice
          )
      )
        .to.emit(this.minter, "SetAuctionDetails")
        .withArgs(
          this.projectZero,
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          this.startingPrice,
          this.basePrice
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
      expect(auctionParams.priceDecayHalfLifeSeconds).to.be.equal(
        this.defaultHalfLife
      );
      expect(auctionParams.startPrice).to.be.equal(this.startingPrice);
      expect(auctionParams.basePrice).to.be.equal(this.basePrice);
    });

    it("returns expected initial values", async function () {
      const auctionParams = await this.minter
        .connect(this.accounts.deployer)
        .projectAuctionParameters(this.projectOne);
      expect(DAExpAuctionParamsAreZero(auctionParams)).to.be.true;
    });

    it("returns expected values after resetting values", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      const auctionParams = await this.minter
        .connect(this.accounts.deployer)
        .projectAuctionParameters(this.projectZero);
      expect(DAExpAuctionParamsAreZero(auctionParams)).to.be.true;
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
      // max invocations automatically syncs during purchase on this minter
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
      // reduce maxInvocations to 2 on core
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, 1);
      // max invocations automatically syncs during purchase on this minter
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
    it("allows admin to reset auction details", async function () {
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero)
      )
        .to.emit(this.minter, "ResetAuctionDetails")
        .withArgs(this.projectZero, 0, 0);
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

  describe("enforce and broadcasts auction half-life", async function () {
    it("enforces half-life min/max constraint", async function () {
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMin = ONE_MINUTE;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + this.auctionStartTimeOffset,
            invalidHalfLifeSecondsMin,
            this.startingPrice,
            this.basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );

      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMax = ONE_DAY;
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            this.startTime + this.auctionStartTimeOffset,
            invalidHalfLifeSecondsMax,
            this.startingPrice,
            this.basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );
    });

    it("emits event when allowable half life range is updated", async function () {
      const newMinSeconds = 60;
      const newMaxSeconds = 6000;
      // emits event when allowable half life range is updated
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(
            newMinSeconds,
            newMaxSeconds
          )
      )
        .to.emit(this.minter, "AuctionHalfLifeRangeSecondsUpdated")
        .withArgs(newMinSeconds, newMaxSeconds);
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds guards", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(600, 60),
        "Maximum half life must be greater than minimum"
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(0, 600),
        "Half life of zero not allowed"
      );
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds ACL", async function () {
      const expectedErrorMsg = (await isCoreV3(this.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        this.minter
          .connect(this.accounts.additional)
          .setAllowablePriceDecayHalfLifeRangeSeconds(60, 600),
        expectedErrorMsg
      );
    });
  });

  describe("adminEmergencyReduceSelloutPrice", async function () {
    it("allows admin to reduce sellout price to allowed values at allowed times", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect admin to be able to reduce sellout price to allowed values
      await this.minter
        .connect(this.accounts.deployer)
        .adminEmergencyReduceSelloutPrice(
          this.projectZero,
          this.startingPrice.div(2)
        );
      await this.minter
        .connect(this.accounts.deployer)
        .adminEmergencyReduceSelloutPrice(this.projectZero, this.basePrice);
    });

    it("does not allow non-admin to reduce sellout price", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect revert
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .adminEmergencyReduceSelloutPrice(
            this.projectZero,
            this.startingPrice.div(2)
          ),
        "Only Core AdminACL allowed"
      );
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .adminEmergencyReduceSelloutPrice(
            this.projectZero,
            this.startingPrice.div(2)
          ),
        "Only Core AdminACL allowed"
      );
    });

    it("does not allow admin to increase sellout price", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect revert
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .adminEmergencyReduceSelloutPrice(
            this.projectZero,
            this.startingPrice.mul(2)
          ),
        "May only reduce sellout price"
      );
    });

    it("does not allow admin to decrease sellout price below auction base price", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect revert
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .adminEmergencyReduceSelloutPrice(
            this.projectZero,
            this.basePrice.sub(1)
          ),
        "May only reduce sellout price to base price or greater"
      );
    });

    it("does not allow admin to decrease sellout price after revenues claimed", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // withdraw revenues
      await this.minter
        .connect(this.accounts.artist)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // expect revert
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .adminEmergencyReduceSelloutPrice(this.projectZero, this.basePrice),
        "Only before revenues collected"
      );
    });

    it("updates minter state after successful call", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect admin to be able to reduce sellout price to allowed values
      await this.minter
        .connect(this.accounts.deployer)
        .adminEmergencyReduceSelloutPrice(this.projectZero, this.basePrice);
      // expect sellout price to be updated
      const priceInfo = await this.minter.getPriceInfo(this.projectZero);
      expect(priceInfo.tokenPriceInWei).to.equal(this.basePrice);
      // also check public struct
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      expect(projectConfig.selloutPrice).to.equal(this.basePrice);
    });

    it("emits event upon successful call", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect admin to be able to reduce sellout price to allowed values
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .adminEmergencyReduceSelloutPrice(this.projectZero, this.basePrice)
      )
        .to.emit(this.minter, "SelloutPriceUpdated")
        .withArgs(this.projectZero, this.basePrice);
    });
  });

  describe("withdrawArtistAndAdminRevenues", async function () {
    it("allows admin to withdraw revenues after sellout", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect successful withdrawal
      await this.minter
        .connect(this.accounts.deployer)
        .withdrawArtistAndAdminRevenues(this.projectZero);
    });

    it("allows artist to withdraw revenues after sellout", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect successful withdrawal
      await this.minter
        .connect(this.accounts.artist)
        .withdrawArtistAndAdminRevenues(this.projectZero);
    });

    it("does not allow non-admin non-artist to withdraw revenues after sellout", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect revert
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .withdrawArtistAndAdminRevenues(this.projectZero),
        "Only Artist or Admin ACL"
      );
    });

    it("updates revenue collected state after successful withdrawal", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect successful withdrawal
      await this.minter
        .connect(this.accounts.deployer)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // revenue collected state should be updated
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      expect(projectConfig.auctionRevenuesCollected).to.be.true;
    });

    it("updates artist balances to expected values after sellout", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await this.minter.getPriceInfo(this.projectZero);
      const originalBalanceArtist = await this.accounts.artist.getBalance();
      // expect successful withdrawal by admin (artist doesn't spend gas)
      await this.minter
        .connect(this.accounts.deployer)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // artist and admin balances should be updated
      const newBalanceArtist = await this.accounts.artist.getBalance();
      // artist should have received 90% of the sellout price * two tokens minted
      expect(newBalanceArtist).to.be.equal(
        originalBalanceArtist.add(
          priceInfo.tokenPriceInWei.mul(2).div(10).mul(9)
        )
      );
    });

    it("updates admin balances to expected values after sellout", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await this.minter.getPriceInfo(this.projectZero);
      const originalBalanceAdmin = await this.accounts.deployer.getBalance();
      // expect successful withdrawal by artist (admin doesn't spend gas)
      await this.minter
        .connect(this.accounts.artist)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // artist and admin balances should be updated
      const newBalanceAdmin = await this.accounts.deployer.getBalance();
      // admin should have received 10% of the sellout price * two tokens minted
      expect(newBalanceAdmin).to.be.equal(
        originalBalanceAdmin.add(priceInfo.tokenPriceInWei.mul(2).div(10))
      );
    });

    it("updates artist balances to expected values after reaching base price and no sellout", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await this.minter.getPriceInfo(this.projectZero);
      const originalBalanceArtist = await this.accounts.artist.getBalance();
      // expect successful withdrawal by admin (artist doesn't spend gas)
      await this.minter
        .connect(this.accounts.deployer)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // artist and admin balances should be updated
      const newBalanceArtist = await this.accounts.artist.getBalance();
      // artist should have received 90% of the sellout price * one token minted
      expect(newBalanceArtist).to.be.equal(
        originalBalanceArtist.add(
          priceInfo.tokenPriceInWei.mul(1).div(10).mul(9)
        )
      );
    });

    it("does not allow multiple withdraws", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect successful withdrawal
      await this.minter
        .connect(this.accounts.deployer)
        .withdrawArtistAndAdminRevenues(this.projectZero);
      // expect failed withdrawal after revenues already collected
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .withdrawArtistAndAdminRevenues(this.projectZero),
        "Revenues already collected"
      );
    });

    it("does not allow withdrawal if not sold out, not at base price", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase a single piece (not enough to sellout)
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // expect revert during withdrawal
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .withdrawArtistAndAdminRevenues(this.projectZero),
        "Active auction not yet sold out"
      );
    });

    it("does allow withdrawal if not sold out, but at base price", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // successfully withdraw revenues
      await this.minter
        .connect(this.accounts.artist)
        .withdrawArtistAndAdminRevenues(this.projectZero);
    });

    it("emits event when revenues collected", async function () {
      // sellout the project mid-auction
      await selloutMidAuction.call(this, this.projectZero);
      // expect proper event
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .withdrawArtistAndAdminRevenues(this.projectZero)
      )
        .to.emit(this.minter, "ArtistAndAdminRevenuesWithdrawn")
        .withArgs(this.projectZero);
    });

    it("does not allow withdrawal while in a reset auction state", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // expect revert while in a reset auction state
      await expectRevert(
        this.minter
          .connect(this.accounts.deployer)
          .withdrawArtistAndAdminRevenues(this.projectZero),
        "Only configured auctions"
      );
    });

    it("allows withdrawal after reset+reconfiguring", async function () {
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // populate new auction details, starting at previous purchase price
      const projectConfig = await this.minter.projectConfig(this.projectZero);
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      this.startTime = this.startTime + ONE_DAY;
      await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
      await this.minter
        .connect(this.accounts.artist)
        .setAuctionDetails(
          this.projectZero,
          this.startTime + this.auctionStartTimeOffset,
          this.defaultHalfLife,
          latestPurchasePrice,
          this.basePrice
        );
      // advance to end of auction
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          this.defaultHalfLife * 10,
      ]);
      // expect successful withdrawal
      await this.minter
        .connect(this.accounts.artist)
        .withdrawArtistAndAdminRevenues(this.projectZero);
    });
  });

  describe("claimRefund", async function () {
    it("allows refund a few blocks after purchase", async function () {
      await purchaseTokensMidAuction.call(this, this.projectZero);
      // user can claim refund
      await this.minter
        .connect(this.accounts.user)
        .claimRefund(this.projectZero);
    });

    it("sends proper refund value when calling mid-auction", async function () {
      const originalBalanceUser = await this.accounts.user.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction.call(this, this.projectZero);
      // user should only pay net price of token price at this time, after claiming refund
      // advance one minute
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset + 3 * ONE_MINUTE,
      ]);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const tx = await this.minter
        .connect(this.accounts.user)
        .claimRefund(this.projectZero, { gasPrice: 0 });
      const timestamp = await getTxResponseTimestamp(tx);
      const projectAuctionParameters =
        await this.minter.projectAuctionParameters(this.projectZero);
      // calculate net price of token at this time and compare to change in balance
      const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
        projectAuctionParameters,
        timestamp
      );
      console.log(expectedPrice);
      const newBalanceUser = await this.accounts.user.getBalance();
      expect(newBalanceUser).to.equal(
        originalBalanceUser.sub(expectedPrice.mul(2))
      );
    });

    it("sends proper refund value when calling after reaching resting price", async function () {
      const originalBalanceUser = await this.accounts.user.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction.call(this, this.projectZero);
      // user should only pay net price of token price at this time, after claiming refund
      // advance one minute
      // jump to end of auction (10 half-lives is sufficient)
      await ethers.provider.send("evm_mine", [
        this.startTime +
          this.auctionStartTimeOffset +
          10 * this.defaultHalfLife,
      ]);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const tx = await this.minter
        .connect(this.accounts.user)
        .claimRefund(this.projectZero, { gasPrice: 0 });
      const timestamp = await getTxResponseTimestamp(tx);
      const projectAuctionParameters =
        await this.minter.projectAuctionParameters(this.projectZero);
      // calculate net price of token at this time and compare to change in balance
      const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
        projectAuctionParameters,
        timestamp
      );
      const newBalanceUser = await this.accounts.user.getBalance();
      expect(newBalanceUser).to.equal(
        originalBalanceUser.sub(expectedPrice.mul(2))
      );
    });

    it("does not allow refund while in a reset state", async function () {
      await purchaseTokensMidAuction.call(this, this.projectZero);
      // admin reset the auction
      await this.minter
        .connect(this.accounts.deployer)
        .resetAuctionDetails(this.projectZero);
      // user cannot claim refund
      await expectRevert(
        this.minter.connect(this.accounts.user).claimRefund(this.projectZero),
        "Only configured auctions"
      );
    });
  });
};
