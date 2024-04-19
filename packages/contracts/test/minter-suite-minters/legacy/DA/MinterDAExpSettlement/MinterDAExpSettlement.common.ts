import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  isCoreV3,
  getTxResponseTimestamp,
  deployAndGet,
  safeAddProject,
} from "../../../../util/common";

import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../../util/constants";

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
 * @dev intended to be called with `config` bound to a test context
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports config test.
 */
export async function completeAuctionWithoutSellingOut(
  config: T_Config,
  projectId: number
): Promise<void> {
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset,
  ]);
  // purchase one piece
  await config.minter.connect(config.accounts.user).purchase_H4M(projectId, {
    value: config.startingPrice,
  });
  // advance to end of auction
  // @dev 10 half-lives is enough to reach base price
  await ethers.provider.send("evm_mine", [
    config.startTime +
      config.auctionStartTimeOffset +
      config.defaultHalfLife * 10,
  ]);
  // withdraw revenues
  await config.minter
    .connect(config.accounts.artist)
    .withdrawArtistAndAdminRevenues(projectId);
  // leave in a state where revenues are split at the time of the sale
}

/**
 * helper function that:
 *  - mints a single token during auction, then advances one minute
 *  - mints a another token during auction, then advances one minute
 * results in a state where settlement may be executed for multiple tokens.
 * All transactions are executed with zero gas fee to help balance calculations
 * @dev intended to be called with `config` bound to a test context
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports config test.
 */
export async function purchaseTokensMidAuction(
  config: T_Config,
  projectId: number
): Promise<void> {
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset,
  ]);
  // purchase one piece, no gas cost
  let balanceBefore = await config.accounts.user.getBalance();
  await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
  await config.minter.connect(config.accounts.user).purchase_H4M(projectId, {
    value: config.startingPrice,
    gasPrice: 0,
  });
  // advance one minute
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset + ONE_MINUTE,
  ]);
  // purchase another piece, no gas cost
  await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
  await config.minter.connect(config.accounts.user).purchase_H4M(projectId, {
    value: config.startingPrice,
    gasPrice: 0,
  });
  let balanceAfter = await config.accounts.user.getBalance();
  expect(balanceBefore.sub(balanceAfter)).to.equal(config.startingPrice.mul(2));
  // advance one minute
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset + 2 * ONE_MINUTE,
  ]);
}

/**
 * helper function that:
 *  - sells out a project during an auction, before reaching base price
 * results in a state where revenues have not been withdrawn, but project has a
 * final price at which it sold out.
 * @dev intended to be called with `config` bound to a test context
 * @dev reduces project max invocations to 2, so that the project will sell out
 * with a two purchases (ensuring that calculations involving
 * numSettleableInvocations are tested properly)
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports config test.
 */
export async function selloutMidAuction(
  config: T_Config,
  projectId: number
): Promise<void> {
  // reduce max invocations to 2
  await config.genArt721Core
    .connect(config.accounts.artist)
    .updateProjectMaxInvocations(projectId, 2);
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset,
  ]);
  // purchase two pieces to achieve sellout
  for (let i = 0; i < 2; i++) {
    await config.minter.connect(config.accounts.user).purchase_H4M(projectId, {
      value: config.startingPrice,
    });
  }
  // leave in a state where project sold out, but revenues have not been
  // withdrawn
}

/**
 * helper function that:
 *  - sets local max invocations on minter to 2
 *  - sells out a project during an auction, before reaching base price
 * results in a state where revenues have not been withdrawn, but project has a
 * final price at which it sold out, due to local minter max invocations (not
 * core contract max invocations)
 * @dev intended to be called with `config` bound to a test context
 * @dev reduces minter-local project max invocations to 2, so that the project will sell out
 * with a two purchases (ensuring that calculations involving
 * numSettleableInvocations are tested properly)
 * @param projectId project ID to use for minting. assumes project exists and
 * is configured with a minter that supports config test.
 */
export async function selloutMidAuctionLocalMaxInvocations(
  config: T_Config,
  projectId: number
): Promise<void> {
  // reduce max invocations to 2 on the minter (not core contract)
  await config.minter
    .connect(config.accounts.artist)
    .manuallyLimitProjectMaxInvocations(projectId, 2);
  // advance to auction start time
  await ethers.provider.send("evm_mine", [
    config.startTime + config.auctionStartTimeOffset,
  ]);
  // purchase two pieces to achieve sellout
  for (let i = 0; i < 2; i++) {
    await config.minter.connect(config.accounts.user).purchase_H4M(projectId, {
      value: config.startingPrice,
    });
  }
  // leave in a state where project sold out, but revenues have not been
  // withdrawn
}

/**
 * These tests are intended to check common DAExp functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterDAExpSettlement_Common = async (
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
      for (let i = 1; i <= 5; i++) {
        let ownerBalance = await config.accounts.user.getBalance();
        let price = config.startingPrice;
        for (let j = 0; j < i; j++) {
          price = price.div(2);
        }
        // advance another half-life
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            i * config.defaultHalfLife,
        ]);
        // expect price is as expected
        const priceInfo = await config.minter.getPriceInfo(config.projectZero);
        expect(priceInfo.tokenPriceInWei.toString()).to.be.equal(
          price.toString()
        );
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
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
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
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );

      await ethers.provider.send("evm_mine", [config.startTime + 5 * ONE_HOUR]);

      let contractPriceInfo = await config.minter
        .connect(config.accounts.user)
        .getPriceInfo(config.projectZero);
      expect(contractPriceInfo.tokenPriceInWei).to.be.equal(config.basePrice);
    });

    it("enforces sending minimum required payment when calling `purchase`, with no previous purchases", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to start of auction
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // expect mint success with call value of starting price
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, { value: config.startingPrice });
      // expect mint revert with call value of much less than purchase price
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice.div(100),
          }),
        "Must send minimum value to mint"
      );
    });

    it("enforces sending minimum required payment when calling `purchase`, using previous purchase receipts", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to start of auction
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // expect mint success with call value of starting price
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, { value: config.startingPrice }); // advance to start of auction
      // advance to end of auction
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // expect mint success with call value of much less than purchase price,
      // because previous receipt funds the purchase
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, { value: 0 });
    });
  });

  describe("setAuctionDetails", async function () {
    it("cannot be modified mid-auction", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [
        config.startTime + 2 * config.auctionStartTimeOffset,
      ]);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
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
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );
    });

    it("disallows whitelisted and non-artist to set auction details", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
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
            config.startTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
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
            config.startTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
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
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          ),
        "Only future auctions"
      );
    });

    it("disallows starting price higher than latestPurchasePrice if num settleable invocations > 0", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert when setting starting price higher than latestPurchasePrice
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime = config.startTime + ONE_DAY;
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            newStartTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
            latestPurchasePrice.add(1),
            config.basePrice
          ),
        "Auction start price must be <= latest purchase price"
      );
    });

    it("allows starting price equal to latestPurchasePrice if num settleable invocations > 0", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect success when setting starting price equal to latestPurchasePrice
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime =
        config.startTime + config.auctionStartTimeOffset + ONE_DAY;
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          newStartTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          latestPurchasePrice,
          config.basePrice
        );
    });

    it("allows starting price less than latestPurchasePrice if num settleable invocations > 0", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect success when setting starting price equal to latestPurchasePrice
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime =
        config.startTime + config.auctionStartTimeOffset + ONE_DAY;
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          newStartTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          latestPurchasePrice.sub(1),
          config.basePrice
        );
    });

    it("emits event when auction details are updated", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await expect(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + config.auctionStartTimeOffset,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          )
      )
        .to.emit(config.minter, "SetAuctionDetails")
        .withArgs(
          config.projectZero,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
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
      expect(auctionParams.priceDecayHalfLifeSeconds).to.be.equal(
        config.defaultHalfLife
      );
      expect(auctionParams.startPrice).to.be.equal(config.startingPrice);
      expect(auctionParams.basePrice).to.be.equal(config.basePrice);
    });

    it("returns expected initial values", async function () {
      const config = await loadFixture(_beforeEach);
      const auctionParams = await config.minter
        .connect(config.accounts.deployer)
        .projectAuctionParameters(config.projectOne);
      expect(DAExpAuctionParamsAreZero(auctionParams)).to.be.true;
    });

    it("returns expected values after resetting values", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      const auctionParams = await config.minter
        .connect(config.accounts.deployer)
        .projectAuctionParameters(config.projectZero);
      expect(DAExpAuctionParamsAreZero(auctionParams)).to.be.true;
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
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // sync max invocations on minter
      await config.minter
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
      // max invocations automatically syncs during purchase on config minter
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

    it("returns false if value never cached on the minter", async function () {
      const config = await loadFixture(_beforeEach);
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // do NOT sync max invocations on minter
      // max invocations automatically syncs during purchase on config minter
      // mint a token
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
      // expect projectMaxHasBeenInvoked to be false, because it was never cached
      const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
        config.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.false;
    });

    it("blocks minting after a project max has been invoked, when caching maxInvocations on the minter", async function () {
      const config = await loadFixture(_beforeEach);
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // sync max invocations on minter
      await config.minter
        .connect(config.accounts.artist)
        .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
      // max invocations automatically syncs during purchase on config minter
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

    it("blocks minting after a project max has been invoked, when NOT caching maxInvocations on the minter", async function () {
      const config = await loadFixture(_beforeEach);
      // reduce maxInvocations to 2 on core
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 1);
      // do NOT sync max invocations on minter
      // max invocations automatically syncs during purchase on config minter
      // mint a token
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
      // expect projectMaxHasBeenInvoked to be false
      const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
        config.projectZero
      );
      expect(hasMaxBeenInvoked).to.be.false;
      // expect revert when trying to mint another token
      // note: config is a different revert message than when caching maxInvocations on the minter, because core is enforcing the maxInvocations
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          })
      );
    });
  });

  describe("resetAuctionDetails", async function () {
    it("allows admin to reset auction details", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero)
      )
        .to.emit(config.minter, "ResetAuctionDetails(uint256,uint256,uint256)")
        .withArgs(config.projectZero, 0, 0);
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

    it("does not allow resetting an unconfigured auction", async function () {
      const config = await loadFixture(_beforeEach);
      // reset auction details
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert after auction details have been reset and auction is unconfigured
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero),
        "Auction must be configured"
      );
    });

    it("does not allow resetting after revenues have been collected", async function () {
      const config = await loadFixture(_beforeEach);
      await completeAuctionWithoutSellingOut(config, config.projectZero);
      // expect revert after auction details have been reset and auction is unconfigured
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero),
        "Only before revenues collected"
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

  describe("enforce and broadcasts auction half-life", async function () {
    it("enforces half-life min/max constraint", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMin = ONE_MINUTE;
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + config.auctionStartTimeOffset,
            invalidHalfLifeSecondsMin,
            config.startingPrice,
            config.basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );

      // expect revert when creating a new project with
      const invalidHalfLifeSecondsMax = ONE_DAY;
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime + config.auctionStartTimeOffset,
            invalidHalfLifeSecondsMax,
            config.startingPrice,
            config.basePrice
          ),
        "Price decay half life must fall between min and max allowable values"
      );
    });

    it("emits event when allowable half life range is updated", async function () {
      const config = await loadFixture(_beforeEach);
      const newMinSeconds = 60;
      const newMaxSeconds = 6000;
      // emits event when allowable half life range is updated
      await expect(
        config.minter
          .connect(config.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(
            newMinSeconds,
            newMaxSeconds
          )
      )
        .to.emit(config.minter, "AuctionHalfLifeRangeSecondsUpdated")
        .withArgs(newMinSeconds, newMaxSeconds);
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds guards", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(600, 60),
        "Maximum half life must be greater than minimum"
      );
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .setAllowablePriceDecayHalfLifeRangeSeconds(0, 600),
        "Half life of zero not allowed"
      );
    });

    it("validate setAllowablePriceDecayHalfLifeRangeSeconds ACL", async function () {
      const config = await loadFixture(_beforeEach);
      const expectedErrorMsg = (await isCoreV3(config.genArt721Core))
        ? "Only Core AdminACL allowed"
        : "Only Core whitelisted";
      await expectRevert(
        config.minter
          .connect(config.accounts.additional)
          .setAllowablePriceDecayHalfLifeRangeSeconds(60, 600),
        expectedErrorMsg
      );
    });
  });

  describe("withdrawArtistAndAdminRevenues", async function () {
    it("allows admin to withdraw revenues after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect successful withdrawal
      await config.minter
        .connect(config.accounts.deployer)
        .withdrawArtistAndAdminRevenues(config.projectZero);
    });

    it("allows artist to withdraw revenues after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect successful withdrawal
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
    });

    it("does not allow non-admin non-artist to withdraw revenues after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect revert
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .withdrawArtistAndAdminRevenues(config.projectZero),
        "Only Artist or Admin ACL"
      );
    });

    it("updates revenue collected state after successful withdrawal", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect successful withdrawal
      await config.minter
        .connect(config.accounts.deployer)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      // revenue collected state should be updated
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      expect(projectConfig.auctionRevenuesCollected).to.be.true;
    });

    it("updates artist balances to expected values after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      const originalBalanceArtist = await config.accounts.artist.getBalance();
      // expect successful withdrawal by admin (artist doesn't spend gas)
      await config.minter
        .connect(config.accounts.deployer)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      // artist and admin balances should be updated
      const newBalanceArtist = await config.accounts.artist.getBalance();
      // target revenue is 90% of sellout price * two tokens minted, 80% if engine
      const targetRevenue = config.isEngine
        ? priceInfo.tokenPriceInWei.mul(2).div(10).mul(8)
        : priceInfo.tokenPriceInWei.mul(2).div(10).mul(9);
      // artist should have received target revenue
      expect(newBalanceArtist).to.be.equal(
        originalBalanceArtist.add(targetRevenue)
      );
    });

    it("updates admin balances to expected values after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      const originalBalanceAdmin = await config.accounts.deployer.getBalance();
      // expect successful withdrawal by artist (admin doesn't spend gas)
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      // artist and admin balances should be updated
      const newBalanceAdmin = await config.accounts.deployer.getBalance();
      // admin should have received 10% of the sellout price * two tokens minted
      expect(newBalanceAdmin).to.be.equal(
        originalBalanceAdmin.add(priceInfo.tokenPriceInWei.mul(2).div(10))
      );
    });

    it("updates platform provider balances to expected values after sellout", async function () {
      const config = await loadFixture(_beforeEach);
      if (!config.isEngine) {
        console.log("Skipping platform provider balance test for non-engine");
        return;
      }
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // record balances
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      // note: additional account is used as platform provider
      const originalBalancePlatformProvider =
        await config.accounts.additional.getBalance();
      // expect successful withdrawal by artist (admin doesn't spend gas)
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      // artist and platform provider balances should be updated
      const newBalancePlatformProvider =
        await config.accounts.additional.getBalance();
      // platform provider should have received 10% of the sellout price * two tokens minted
      expect(newBalancePlatformProvider).to.be.equal(
        originalBalancePlatformProvider.add(
          priceInfo.tokenPriceInWei.mul(2).div(10)
        )
      );
    });

    it("updates artist balances to expected values after reaching base price and no sellout", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // record balances
      const originalBalanceArtist = await config.accounts.artist.getBalance();
      // expect successful withdrawal by admin (artist doesn't spend gas)
      await config.minter
        .connect(config.accounts.deployer)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      expect(priceInfo.tokenPriceInWei).to.be.equal(config.basePrice);
      // artist and admin balances should be updated
      const newBalanceArtist = await config.accounts.artist.getBalance();
      // artist should have received expected portion of the sellout price * one token minted
      const targetArtistPercentage = config.isEngine ? 80 : 90;
      expect(newBalanceArtist).to.be.equal(
        originalBalanceArtist.add(
          priceInfo.tokenPriceInWei.mul(1).mul(targetArtistPercentage).div(100)
        )
      );
    });

    it("does not allow multiple withdraws", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect successful withdrawal
      await config.minter
        .connect(config.accounts.deployer)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      // expect failed withdrawal after revenues already collected
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(config.projectZero),
        "Revenues already collected"
      );
    });

    it("does not allow withdrawal if not sold out, not at base price", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase a single piece (not enough to sellout)
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // expect revert during withdrawal
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(config.projectZero),
        "Active auction not yet sold out"
      );
    });

    it("does allow withdrawal if not sold out, but at base price", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // successfully withdraw revenues
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
    });

    it("emits event when revenues collected", async function () {
      const config = await loadFixture(_beforeEach);
      // sellout the project mid-auction
      await selloutMidAuction(config, config.projectZero);
      // expect proper event
      await expect(
        config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(config.projectZero)
      )
        .to.emit(config.minter, "ArtistAndAdminRevenuesWithdrawn")
        .withArgs(config.projectZero);
    });

    it("does not allow withdrawal while in a reset auction state", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // expect revert while in a reset auction state
      await expectRevert(
        config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(config.projectZero),
        "Only configured auctions"
      );
    });

    it("allows withdrawal after reset+reconfiguring", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to auction start time
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      // purchase one piece
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
      // advance to end of auction
      // @dev 10 half-lives is enough to reach base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // populate new auction details, starting at previous purchase price
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      const newStartTime = config.startTime + ONE_DAY;
      await ethers.provider.send("evm_mine", [newStartTime - ONE_MINUTE]);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          newStartTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          latestPurchasePrice,
          config.basePrice
        );
      // advance to end of auction
      await ethers.provider.send("evm_mine", [
        newStartTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // expect successful withdrawal
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
    });
  });

  describe("reclaimProjectExcessSettlementFunds (single project)", async function () {
    it("allows settlement a few blocks after purchase", async function () {
      const config = await loadFixture(_beforeEach);
      await purchaseTokensMidAuction(config, config.projectZero);
      // user can claim settlement
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero);
    });

    it("sends proper settlement value when calling mid-auction", async function () {
      const config = await loadFixture(_beforeEach);
      const originalBalanceUser = await config.accounts.user.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction(config, config.projectZero);
      // user should only pay net price of token price at config time, after claiming settlement
      // advance one minute
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset + 3 * ONE_MINUTE,
      ]);
      // user purchase another token
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const tx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
          gasPrice: 0,
        });
      const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero, {
          gasPrice: 0,
        });
      const projectAuctionParameters =
        await config.minter.projectAuctionParameters(config.projectZero);
      // calculate net price of token at config time and compare to change in balance
      const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
        projectAuctionParameters,
        latestPurchaseTimestamp
      );
      const newBalanceUser = await config.accounts.user.getBalance();
      expect(newBalanceUser).to.equal(
        originalBalanceUser.sub(expectedPrice.mul(3))
      );
    });

    it("sends proper settlement value when calling after reaching resting price, but before token purchased at resting price", async function () {
      const config = await loadFixture(_beforeEach);
      const originalBalanceUser = await config.accounts.user.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction(config, config.projectZero);
      // user purchase another token
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const tx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
          gasPrice: 0,
        });
      const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
      // user should only pay net price of token price at config time, after claiming settlement
      // jump to end of auction (10 half-lives is sufficient)
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          10 * config.defaultHalfLife,
      ]);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero, {
          gasPrice: 0,
        });
      const projectAuctionParameters =
        await config.minter.projectAuctionParameters(config.projectZero);
      // calculate net price of token at config time and compare to change in balance
      const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
        projectAuctionParameters,
        latestPurchaseTimestamp
      );
      const newBalanceUser = await config.accounts.user.getBalance();
      expect(newBalanceUser).to.equal(
        originalBalanceUser.sub(expectedPrice.mul(3))
      );
    });

    it("sends proper settlement value when calling after reaching resting price, but after artist withdraws revenues at base price", async function () {
      const config = await loadFixture(_beforeEach);
      const originalBalanceUser = await config.accounts.user.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction(config, config.projectZero);
      // user purchase another token
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
          gasPrice: 0,
        });
      // user should only pay net price of token price at config time, after claiming settlement
      // jump to end of auction (10 half-lives is sufficient)
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          10 * config.defaultHalfLife,
      ]);
      // artist withdraws revenues, locking in base price as settlement net price
      await config.minter
        .connect(config.accounts.artist)
        .withdrawArtistAndAdminRevenues(config.projectZero);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero, {
          gasPrice: 0,
        });
      const projectAuctionParameters =
        await config.minter.projectAuctionParameters(config.projectZero);
      // calculate net price of token at config time and compare to change in balance
      const expectedPrice = projectAuctionParameters.basePrice;
      const newBalanceUser = await config.accounts.user.getBalance();
      expect(newBalanceUser).to.equal(
        originalBalanceUser.sub(expectedPrice.mul(3))
      );
    });

    it("allows settlement while in a reset state", async function () {
      const config = await loadFixture(_beforeEach);
      await purchaseTokensMidAuction(config, config.projectZero);
      // admin reset the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // user cannot claim settlement
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero);
    });
  });

  describe("reclaimProjectExcessSettlementFundsTo (for single project)", async function () {
    it("does not allow sending settlements to zero address", async function () {
      const config = await loadFixture(_beforeEach);
      await purchaseTokensMidAuction(config, config.projectZero);
      // user claims settlement, revert
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFundsTo(
            constants.ZERO_ADDRESS,
            config.projectZero
          ),
        "No claiming to the zero address"
      );
    });

    it("does not allow collecting settlements prior to user making a purchase", async function () {
      const config = await loadFixture(_beforeEach);
      // user claims settlement, revert
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFundsTo(
            config.accounts.user2.address,
            config.projectZero
          ),
        "No purchases made by this address"
      );
    });

    it("allows settlement a few blocks after purchase", async function () {
      const config = await loadFixture(_beforeEach);
      await purchaseTokensMidAuction(config, config.projectZero);
      // user can claim settlement
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFundsTo(
          config.accounts.user2.address,
          config.projectZero
        );
    });

    it("sends proper settlement value to `_to` when calling mid-auction", async function () {
      const config = await loadFixture(_beforeEach);
      const originalBalanceUser = await config.accounts.user.getBalance();
      const originalBalanceUser2 = await config.accounts.user2.getBalance();
      // purchase tokens (at zero gas cost)
      await purchaseTokensMidAuction(config, config.projectZero);
      // user should only pay net price of token price at config time, after claiming settlement
      // advance one minute
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset + 3 * ONE_MINUTE,
      ]);
      // user purchase another token
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      const tx = await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
          gasPrice: 0,
        });
      const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
      await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
      await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFundsTo(
          config.accounts.user2.address,
          config.projectZero,
          {
            gasPrice: 0,
          }
        );
      const projectAuctionParameters =
        await config.minter.projectAuctionParameters(config.projectZero);
      // calculate net price of token at config time and compare to change in balance
      const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
        projectAuctionParameters,
        latestPurchaseTimestamp
      );
      const newBalanceUser = await config.accounts.user.getBalance();
      const newBalanceUser2 = await config.accounts.user2.getBalance();
      // combine user 2 and user balances to simplify in/out comparison
      expect(originalBalanceUser.add(originalBalanceUser2)).to.equal(
        newBalanceUser.add(newBalanceUser2).add(expectedPrice.mul(3))
      );
      // user2 should have a net positive change in balance, since only received
      // settlement, not paid for token
      expect(newBalanceUser2).to.be.gt(originalBalanceUser2);
    });

    it("reverts if payment to address fails", async function () {
      const config = await loadFixture(_beforeEach);
      const deadReceiver = await deployAndGet(config, "DeadReceiverMock", []);
      await purchaseTokensMidAuction(config, config.projectZero);
      // user claims settlement, revert
      await expectRevert(
        config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFundsTo(
            deadReceiver.address,
            config.projectZero
          ),
        "Reclaiming failed"
      );
    });
  });

  describe("reclaimProjectsExcessSettlementFunds (array of projects)", async function () {
    describe("reclaimProjectsExcessSettlementFunds for single project", async function () {
      it("allows settlement a few blocks after purchase", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // user can claim settlement
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([config.projectZero]);
      });

      it("sends proper settlement value when calling mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        const originalBalanceUser = await config.accounts.user.getBalance();
        // purchase tokens (at zero gas cost)
        await purchaseTokensMidAuction(config, config.projectZero);
        // user should only pay net price of token price at config time, after claiming settlement
        // advance one minute
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset + 3 * ONE_MINUTE,
        ]);
        // user purchase another token
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
            gasPrice: 0,
          });
        const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([config.projectZero], {
            gasPrice: 0,
          });
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(config.projectZero);
        // calculate net price of token at config time and compare to change in balance
        const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
          projectAuctionParameters,
          latestPurchaseTimestamp
        );
        const newBalanceUser = await config.accounts.user.getBalance();
        expect(newBalanceUser).to.equal(
          originalBalanceUser.sub(expectedPrice.mul(3))
        );
      });

      it("sends proper settlement value when calling after reaching resting price, but before token purchased at resting price", async function () {
        const config = await loadFixture(_beforeEach);
        const originalBalanceUser = await config.accounts.user.getBalance();
        // purchase tokens (at zero gas cost)
        await purchaseTokensMidAuction(config, config.projectZero);
        // user purchase another token
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
            gasPrice: 0,
          });
        const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
        // user should only pay net price of token price at config time, after claiming settlement
        // jump to end of auction (10 half-lives is sufficient)
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            10 * config.defaultHalfLife,
        ]);
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([config.projectZero], {
            gasPrice: 0,
          });
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(config.projectZero);
        // calculate net price of token at config time and compare to change in balance
        const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
          projectAuctionParameters,
          latestPurchaseTimestamp
        );
        const newBalanceUser = await config.accounts.user.getBalance();
        expect(newBalanceUser).to.equal(
          originalBalanceUser.sub(expectedPrice.mul(3))
        );
      });

      it("sends proper settlement value when calling after reaching resting price, but after artist withdraws revenues at base price", async function () {
        const config = await loadFixture(_beforeEach);
        const originalBalanceUser = await config.accounts.user.getBalance();
        // purchase tokens (at zero gas cost)
        await purchaseTokensMidAuction(config, config.projectZero);
        // user purchase another token
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
            gasPrice: 0,
          });
        // user should only pay net price of token price at config time, after claiming settlement
        // jump to end of auction (10 half-lives is sufficient)
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            10 * config.defaultHalfLife,
        ]);
        // artist withdraws revenues, locking in base price as settlement net price
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([config.projectZero], {
            gasPrice: 0,
          });
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(config.projectZero);
        // calculate net price of token at config time and compare to change in balance
        const expectedPrice = projectAuctionParameters.basePrice;
        const newBalanceUser = await config.accounts.user.getBalance();
        expect(newBalanceUser).to.equal(
          originalBalanceUser.sub(expectedPrice.mul(3))
        );
      });

      it("allows settlement while in a reset state", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // admin reset the auction
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        // user cannot claim settlement
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([config.projectZero]);
      });
    });

    describe("reclaimProjectsExcessSettlementFunds for multiple projects", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        // add project one and configure auction
        await safeAddProject(
          config.genArt721Core,
          config.accounts.deployer,
          config.accounts.artist.address
        );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectOne, 15);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .toggleProjectIsPaused(config.projectOne);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter.connect(config.accounts.artist).setAuctionDetails(
          config.projectOne,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice.div(2) // lower base price to introduce more variation
        );
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does not allow collecting settlements prior to user making a purchase on one of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // user claims settlement, revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFunds([
              config.projectZero,
              config.projectOne,
            ]),
          "No purchases made by this address"
        );
      });

      it("does allow collecting settlements after user making a purchase on two of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // purchase token on project one
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, { value: config.startingPrice });
        // user successfully claims settlements
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds([
            config.projectZero,
            config.projectOne,
          ]);
      });

      it("does not allow collecting settlements if non-existing project is included", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // user successfully claims settlements
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFunds([
              config.projectZero,
              config.projectOne,
            ]),
          "No purchases made by this address"
        );
      });

      it("properly calculates settlement on two of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // record balance
        const originalBalanceUser = await config.accounts.user.getBalance();
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        /// purchase two tokens on each project
        for (let i = 0; i < 2; i++) {
          // purchase token on project zero
          await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
              gasPrice: 0,
            });
          // purchase token on project one
          await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectOne, {
              value: config.startingPrice,
              gasPrice: 0,
            });
        }
        // advance to a state at auction base price
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            config.defaultHalfLife * 11, // 11 half lives since base price of projectOne is half of projectZero
        ]);
        // artist withdraws revenue on both projects to lock in base price
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectOne);
        // user claims settlements to user2
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFunds(
            [config.projectZero, config.projectOne],
            {
              gasPrice: 0,
            }
          );
        // record new balances
        const newBalanceUser = await config.accounts.user.getBalance();
        // check that net change in balances is as expected
        expect(originalBalanceUser).to.equal(
          newBalanceUser
            .add(config.basePrice.mul(2)) // 2 tokens on projectZero for basePrice
            .add(config.basePrice.div(2).mul(2)) // 2 tokens on projectOne for basePrice/2
        );
        // check that net change in user balance is negative
        expect(newBalanceUser).to.be.lt(originalBalanceUser);
      });
    });
  });

  describe("reclaimProjectsExcessSettlementFundsTo (array of projects)", async function () {
    describe("reclaimProjectsExcessSettlementFundsTo for single project", async function () {
      it("does not allow sending settlements to zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // user claims settlement, revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(constants.ZERO_ADDRESS, [
              config.projectZero,
            ]),
          "No claiming to the zero address"
        );
      });

      it("does not allow collecting settlements prior to user making a purchase", async function () {
        const config = await loadFixture(_beforeEach);
        // user claims settlement, revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              config.accounts.user2.address,
              [config.projectZero]
            ),
          "No purchases made by this address"
        );
      });

      it("allows settlement a few blocks after purchase", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // user can claim settlement
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFundsTo(
            config.accounts.user2.address,
            [config.projectZero]
          );
      });

      it("sends proper settlement value to `_to` when calling mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        const originalBalanceUser = await config.accounts.user.getBalance();
        const originalBalanceUser2 = await config.accounts.user2.getBalance();
        // purchase tokens (at zero gas cost)
        await purchaseTokensMidAuction(config, config.projectZero);
        // user should only pay net price of token price at config time, after claiming settlement
        // advance one minute
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset + 3 * ONE_MINUTE,
        ]);
        // user purchase another token
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
            gasPrice: 0,
          });
        const latestPurchaseTimestamp = await getTxResponseTimestamp(tx);
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFundsTo(
            config.accounts.user2.address,
            [config.projectZero],
            {
              gasPrice: 0,
            }
          );
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(config.projectZero);
        // calculate net price of token at config time and compare to change in balance
        const expectedPrice = calcPriceFromAuctionDetailsAndTimestamp(
          projectAuctionParameters,
          latestPurchaseTimestamp
        );
        const newBalanceUser = await config.accounts.user.getBalance();
        const newBalanceUser2 = await config.accounts.user2.getBalance();
        // combine user 2 and user balances to simplify in/out comparison
        expect(originalBalanceUser.add(originalBalanceUser2)).to.equal(
          newBalanceUser.add(newBalanceUser2).add(expectedPrice.mul(3))
        );
        // user2 should have a net positive change in balance, since only received
        // settlement, not paid for token
        expect(newBalanceUser2).to.be.gt(originalBalanceUser2);
      });

      it("reverts if payment to address fails", async function () {
        const config = await loadFixture(_beforeEach);
        const deadReceiver = await deployAndGet(config, "DeadReceiverMock", []);
        await purchaseTokensMidAuction(config, config.projectZero);
        // user claims settlement, revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(deadReceiver.address, [
              config.projectZero,
            ]),
          "Reclaiming failed"
        );
      });
    });

    describe("reclaimProjectsExcessSettlementFundsTo for multiple projects", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        // add project one and configure auction
        await safeAddProject(
          config.genArt721Core,
          config.accounts.deployer,
          config.accounts.artist.address
        );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .toggleProjectIsActive(config.projectOne);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectOne, 15);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .toggleProjectIsPaused(config.projectOne);
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(config.projectOne, config.minter.address);
        await config.minter.connect(config.accounts.artist).setAuctionDetails(
          config.projectOne,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice.div(2) // lower base price to introduce more variation
        );
        // pass config to tests in this describe block
        this.config = config;
      });

      it("does not allow collecting settlements prior to user making a purchase on one of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // user claims settlement, revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              config.accounts.user2.address,
              [config.projectZero, config.projectOne]
            ),
          "No purchases made by this address"
        );
      });

      it("does allow collecting settlements after user making a purchase on two of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // purchase token on project one
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectOne, { value: config.startingPrice });
        // user successfully claims settlements
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFundsTo(
            config.accounts.user2.address,
            [config.projectZero, config.projectOne]
          );
      });

      it("does not allow collecting settlements if non-existing project is included", async function () {
        // get config from beforeEach
        const config = this.config;
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase token on project zero
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, { value: config.startingPrice });
        // user successfully claims settlements
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .reclaimProjectsExcessSettlementFundsTo(
              config.accounts.user2.address,
              [config.projectZero, config.projectOne]
            ),
          "No purchases made by this address"
        );
      });

      it("properly calculates settlement on two of two projects", async function () {
        // get config from beforeEach
        const config = this.config;
        // record balances
        const originalBalanceUser = await config.accounts.user.getBalance();
        const originalBalanceUser2 = await config.accounts.user2.getBalance();
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        /// purchase two tokens on each project
        for (let i = 0; i < 2; i++) {
          // purchase token on project zero
          await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
              gasPrice: 0,
            });
          // purchase token on project one
          await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
            "0x0",
          ]);
          await config.minter
            .connect(config.accounts.user)
            .purchase(config.projectOne, {
              value: config.startingPrice,
              gasPrice: 0,
            });
        }
        // advance to a state at auction base price
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            config.defaultHalfLife * 11, // 11 half lives since base price of projectOne is half of projectZero
        ]);
        // artist withdraws revenue on both projects to lock in base price
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectOne);
        // user claims settlements to user2
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectsExcessSettlementFundsTo(
            config.accounts.user2.address,
            [config.projectZero, config.projectOne],
            { gasPrice: 0 }
          );
        // record new balances
        const newBalanceUser = await config.accounts.user.getBalance();
        const newBalanceUser2 = await config.accounts.user2.getBalance();
        // check that net change in balances is as expected
        expect(originalBalanceUser.add(originalBalanceUser2)).to.equal(
          newBalanceUser
            .add(newBalanceUser2)
            .add(config.basePrice.mul(2)) // 2 tokens on projectZero for basePrice
            .add(config.basePrice.div(2).mul(2)) // 2 tokens on projectOne for basePrice/2
        );
        // check that net change in user2 balance is positive
        expect(newBalanceUser2).to.be.gt(originalBalanceUser2);
      });
    });
  });

  describe("getProjectExcessSettlementFunds", async function () {
    it("reverts when getting for zero address", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter.getProjectExcessSettlementFunds(
          config.projectZero,
          constants.ZERO_ADDRESS
        ),
        "No zero address"
      );
    });

    it("reverts when getting before a wallet purchases", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter.getProjectExcessSettlementFunds(
          config.projectZero,
          config.accounts.user.address
        ),
        "No purchases made by this address"
      );
    });

    it("returns expected values for project after purchases", async function () {
      const config = await loadFixture(_beforeEach);
      await purchaseTokensMidAuction(config, config.projectZero);
      const excessSettlementFunds =
        await config.minter.getProjectExcessSettlementFunds(
          config.projectZero,
          config.accounts.user.address
        );
      expect(excessSettlementFunds).to.be.gt(0);
      // reclaim funds
      const tx = await config.minter
        .connect(config.accounts.user)
        .reclaimProjectExcessSettlementFunds(config.projectZero);
      // log gas cost for debugging and performance evaluation studies
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a single reclaiming of excess settlement funds: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );
      // check that excess settlement funds are zero
      const excessSettlementFundsAfterReclaim =
        await config.minter.getProjectExcessSettlementFunds(
          config.projectZero,
          config.accounts.user.address
        );
      expect(excessSettlementFundsAfterReclaim).to.equal(0);
    });
  });

  describe("getProjectLatestPurchasePrice", async function () {
    it("retuns zero for project without any purchases", async function () {
      const config = await loadFixture(_beforeEach);
      const latestPurchasePrice =
        await config.minter.getProjectLatestPurchasePrice(config.projectZero);
      expect(latestPurchasePrice).to.equal(0);
    });

    it("retuns non-zero for project with purchases", async function () {
      const config = await loadFixture(_beforeEach);
      await selloutMidAuction(config, config.projectZero);
      const latestPurchasePrice =
        await config.minter.getProjectLatestPurchasePrice(config.projectZero);
      expect(latestPurchasePrice).to.be.gt(0);
    });
  });

  describe("getNumSettleableInvocations", async function () {
    it("retuns zero for project without any purchases", async function () {
      const config = await loadFixture(_beforeEach);
      const numSettleableInvocations =
        await config.minter.getNumSettleableInvocations(config.projectZero);
      expect(numSettleableInvocations).to.equal(0);
    });

    it("retuns non-zero for project with purchases", async function () {
      const config = await loadFixture(_beforeEach);
      await selloutMidAuction(config, config.projectZero);
      const numSettleableInvocations =
        await config.minter.getNumSettleableInvocations(config.projectZero);
      expect(numSettleableInvocations).to.be.gt(0);
    });
  });

  describe("getPriceInfo", async function () {
    it("returns sellout price after project sells out", async function () {
      const config = await loadFixture(_beforeEach);
      await selloutMidAuction(config, config.projectZero);
      // price should still be latestTokenPrice price, > auction base price
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      expect(priceInfo.tokenPriceInWei).to.equal(latestPurchasePrice);
      expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
    });

    it("returns sellout price after project sells out due to local max invocation limit", async function () {
      const config = await loadFixture(_beforeEach);
      await selloutMidAuctionLocalMaxInvocations(config, config.projectZero);
      // price should still be latestTokenPrice price, > auction base price
      const priceInfo = await config.minter.getPriceInfo(config.projectZero);
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      expect(priceInfo.tokenPriceInWei).to.equal(latestPurchasePrice);
      expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
    });
  });

  describe("togglePurchaseToDisabled", async function () {
    it("is not supported", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectZero),
        "Action not supported"
      );
    });
  });

  describe("Auction reset and configuration limits", async function () {
    it("allows new auction to be configured up to latestPurchasePrice", async function () {
      const config = await loadFixture(_beforeEach);
      // purchase a couple tokens (gas fee 0), do not sell out auction
      await purchaseTokensMidAuction(config, config.projectZero);
      // advance past end of auction, so auction reaches base price
      await ethers.provider.send("evm_mine", [
        config.startTime +
          config.auctionStartTimeOffset +
          config.defaultHalfLife * 10,
      ]);
      // admin resets the auction
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      // artist may not configure a new auction with a base price higher than the latest purchase price
      const projectConfig = await config.minter.projectConfig(
        config.projectZero
      );
      const latestPurchasePrice = projectConfig.latestPurchasePrice;
      expect(latestPurchasePrice).to.be.gt(config.basePrice);
      expect(latestPurchasePrice).to.be.lt(config.startingPrice);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.startTime +
              config.auctionStartTimeOffset +
              config.defaultHalfLife * 10 +
              ONE_MINUTE,
            config.defaultHalfLife,
            latestPurchasePrice.add(1),
            config.basePrice
          ),
        "Auction start price must be <= latest purchase price"
      );
      // artist may configure a new auction with a base price equal to the latest purchase price
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime +
            config.auctionStartTimeOffset +
            config.defaultHalfLife * 10 +
            ONE_MINUTE,
          config.defaultHalfLife,
          latestPurchasePrice,
          config.basePrice
        );
    });
  });
};
