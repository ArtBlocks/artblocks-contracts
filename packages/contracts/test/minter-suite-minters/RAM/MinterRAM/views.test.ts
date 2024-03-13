import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import {
  configureDefaultProjectZero,
  initializeMinBidInProjectZeroAuction,
  configureProjectZeroAuctionAndSelloutLiveAuction,
  selloutProjectZeroAuctionAndAdvanceToStateC,
  initializeMinBidInProjectZeroAuctionAndAdvanceToEnd,
  configureProjectZeroAuctionAndAdvanceToStartTime,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

// hard-coded minter constants
const MIN_AUCTION_DURATION_SECONDS = 10 * 60; // 10 minutes
const AUCTION_BUFFER_SECONDS = 5 * 60; // 5 minutes
const MAX_AUCTION_EXTRA_SECONDS = 60 * 60; // 60 minutes
const MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours
const ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 * 60 * 60; // 72 hours

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Views w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("getIsErrorE1", async function () {
      it("returns (false, 0) when no error", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // verify no error
        const isErrorE1 = await config.minter.getIsErrorE1(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(isErrorE1.isError).to.equal(false);
        expect(isErrorE1.numBidsToRefund).to.equal(0);
      });

      it("returns (true, numBidsToRefund) when error", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // induce E1 error, 1 bid to refund
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 14);
        // verify error
        const isErrorE1 = await config.minter.getIsErrorE1(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(isErrorE1.isError).to.equal(true);
        expect(isErrorE1.numBidsToRefund).to.equal(1);
        // induce E1 error, 15 bids to refund
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 0);
        // verify error
        const isErrorE1_15 = await config.minter.getIsErrorE1(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(isErrorE1_15.isError).to.equal(true);
        expect(isErrorE1_15.numBidsToRefund).to.equal(15);
      });
    });

    describe("minterConfigurationDetails", async function () {
      it("gets values as expected", async function () {
        const config = await loadFixture(_beforeEach);

        // verify minter config details
        const minterConfigDetails =
          await config.minter.minterConfigurationDetails();
        expect(minterConfigDetails.minAuctionDurationSeconds).to.equal(
          MIN_AUCTION_DURATION_SECONDS
        );
        expect(minterConfigDetails.auctionBufferSeconds).to.equal(
          AUCTION_BUFFER_SECONDS
        );
        expect(minterConfigDetails.maxAuctionExtraSeconds).to.equal(
          MAX_AUCTION_EXTRA_SECONDS
        );
        expect(
          minterConfigDetails.maxAuctionAdminEmergencyExtensionHours
        ).to.equal(MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS);
        expect(minterConfigDetails.adminArtistOnlyMintTimeSeconds).to.equal(
          ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS
        );
      });
    });

    describe("contractConfigurationDetails", async function () {
      it("gets values as expected", async function () {
        const config = await loadFixture(_beforeEach);

        // verify unconfigured state
        let contractConfigDetails =
          await config.minter.contractConfigurationDetails(
            config.genArt721Core.address
          );
        expect(contractConfigDetails.adminMintingConstraint).to.equal(0);
        // configure values and verify
        await config.minter
          .connect(config.accounts.deployer)
          .setContractConfig(config.genArt721Core.address, 1);
        contractConfigDetails =
          await config.minter.contractConfigurationDetails(
            config.genArt721Core.address
          );
        expect(contractConfigDetails.adminMintingConstraint).to.equal(1);
      });
    });

    describe("maxInvocationsProjectConfig", async function () {
      it("gets values as expected, unconfigured", async function () {
        const config = await loadFixture(_beforeEach);

        // verify unconfigured state to equal default solidity initial values
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(0);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
      });

      it("gets values as expected, configured directly", async function () {
        const config = await loadFixture(_beforeEach);
        // manually limit max invocations on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            5
          );
        // verify state
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(5);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
      });

      it("gets values as expected, configured auction (state A)", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await configureDefaultProjectZero(config);
        // verify state
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
      });

      it("gets values as expected, configured auction, non-sellout (state B)", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await initializeMinBidInProjectZeroAuction(config);
        // verify state
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
      });

      it("gets values as expected, configured auction, sellout (state B)", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // verify state
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(true);
      });

      it("gets values as expected, configured auction, sellout, state C", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // verify state
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(true);
      });

      it("gets values as expected, configured auction, non-sellout, state D", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state D
        await initializeMinBidInProjectZeroAuction(config);
        // advance time to end of auction + 72 hours, entering State D
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + ONE_HOUR * 72,
        ]);
        // verify state w/invocations available
        let maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
        // reduce max invocations on project to 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // verify state w/invocations unavailable
        maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        // max invocations is stale
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(15);
        // but hasMaxBeenInvoked is not stale
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(true);
      });
    });

    describe("getAuctionDetails", async function () {
      it("gets values as expected, unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify unconfigured state
        let auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // all initial values
        expect(auctionDetails.auctionTimestampStart).to.equal(0);
        expect(auctionDetails.auctionTimestampEnd).to.equal(0);
        expect(auctionDetails.basePrice).to.equal(0);
        expect(auctionDetails.numTokensInAuction).to.equal(0);
        expect(auctionDetails.numBids).to.equal(0);
        expect(auctionDetails.numBidsMintedTokens).to.equal(0);
        expect(auctionDetails.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetails.minBidSlotIndex).to.equal(0);
        expect(auctionDetails.allowExtraTime).to.equal(false);
        expect(auctionDetails.adminArtistOnlyMintPeriodIfSellout).to.equal(
          false
        );
        expect(auctionDetails.revenuesCollected).to.equal(false);
        expect(auctionDetails.projectMinterState).to.equal(0); // State A
      });

      it("gets values as expected, configured and live sellout", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // verify configured state
        let auctionDetails = await config.minter.getAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        // all initial values
        expect(
          parseInt(auctionDetails.auctionTimestampStart, 10)
        ).to.be.greaterThan(0);
        expect(
          parseInt(auctionDetails.auctionTimestampEnd, 10)
        ).to.be.greaterThan(0);
        expect(auctionDetails.basePrice).to.equal(config.basePrice);
        expect(auctionDetails.numTokensInAuction).to.equal(15);
        expect(auctionDetails.numBids).to.equal(15);
        expect(auctionDetails.numBidsMintedTokens).to.equal(0);
        expect(auctionDetails.numBidsErrorRefunded).to.equal(0);
        expect(auctionDetails.minBidSlotIndex).to.equal(0);
        expect(auctionDetails.allowExtraTime).to.equal(true);
        expect(auctionDetails.adminArtistOnlyMintPeriodIfSellout).to.equal(
          true
        );
        expect(auctionDetails.revenuesCollected).to.equal(false);
        expect(auctionDetails.projectMinterState).to.equal(1); // State B
      });
    });

    describe("projectMaxHasBeenInvoked", async function () {
      // @dev logic is tested in maxInvocationsProjectConfig, so no additional
      // tests are needed here, other than making sure the function calls unerlying lib
      it("calls underlying lib function", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // verify view function works as intended
        const maxHasBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(maxHasBeenInvoked).to.equal(false);
      });
    });

    describe("projectMaxInvocations", async function () {
      // @dev logic is tested in maxInvocationsProjectConfig, so no additional
      // tests are needed here, other than making sure the function calls unerlying lib
      it("calls underlying lib function", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // verify view function works as intended
        const maxInvocations = await config.minter.projectMaxInvocations(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(maxInvocations).to.equal(15);
      });
    });

    describe("isEngineView", async function () {
      // @dev logic  for SplitFundsLib is tested elsewhere, so minimal calls are
      // required here to ensure the minter routes calls appropriately to the lib
      it("returns appropriate value when not cached", async function () {
        const config = await loadFixture(_beforeEach);
        const isEngineTargetValue = await params.core.includes("Engine");
        const isEngine = await config.minter.isEngineView(
          config.genArt721Core.address
        );
        expect(isEngine).to.equal(isEngineTargetValue);
      });

      it("returns appropriate value when cached", async function () {
        const config = await loadFixture(_beforeEach);
        // induce cache by splitting funds
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // advance to auction end time + 72 hours
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + ONE_HOUR * 72,
        ]);
        // purchase to induce cache
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.basePrice,
          });
        // verify cached value
        const isEngineTargetValue = await params.core.includes("Engine");
        const isEngine = await config.minter.isEngineView(
          config.genArt721Core.address
        );
        expect(isEngine).to.equal(isEngineTargetValue);
      });
    });

    describe("getPriceInfo", async function () {
      it("returns appropriate value when unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify unconfigured state
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(false);
        expect(priceInfo.tokenPriceInWei).to.equal(0);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns appropriate value when configured, State A", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await configureDefaultProjectZero(config);
        // verify state
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns appropriate value when configured, State B, non-sellout", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await initializeMinBidInProjectZeroAuction(config);
        // verify state, non-sellout
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns appropriate value when configured, State B, sellout", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // verify state, sellout
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        // price should be next minimum bid
        const targetPrice = (
          await config.minter.getMinimumNextBid(
            config.projectZero,
            config.genArt721Core.address
          )
        ).minNextBidValueInWei;
        expect(priceInfo.tokenPriceInWei).to.equal(targetPrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns appropriate value when sellout, post-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // sellout auction above base price
        const slot8Price = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        // place 15 bids to sellout
        for (let i = 0; i < 15; i++) {
          await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 8, {
              value: slot8Price,
            });
        }
        // advance to post-auction
        // @dev one extra second to get to state C because view functions don't tick hardhat's clock
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // verify state, sellout
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        // price should be sellout price, which was slot 8 price
        expect(priceInfo.tokenPriceInWei).to.equal(slot8Price);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns appropriate value when not sellout, post-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // sellout auction above base price
        const slot8Price = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        // place 14 bids to not sellout
        for (let i = 0; i < 14; i++) {
          await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 8, {
              value: slot8Price,
            });
        }
        // advance to post-auction
        // @dev one extra second to get to state C because view functions don't tick hardhat's clock
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // verify state, sellout
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });
    });

    describe("getMinimumNextBid", async function () {
      it("reverts when unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify unconfigured reverts
        await expectRevert(
          config.minter.getMinimumNextBid(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.auctionNotConfigured
        );
      });

      it("returns appropriate value when configured, State A", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await configureDefaultProjectZero(config);
        // verify state
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(minNextBid.minNextBidSlotIndex).to.equal(0);
        expect(minNextBid.minNextBidValueInWei).to.equal(config.basePrice);
      });

      it("returns appropriate value when configured, State B, non-sellout", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await initializeMinBidInProjectZeroAuction(config);
        // verify state, non-sellout
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(minNextBid.minNextBidSlotIndex).to.equal(0);
        expect(minNextBid.minNextBidValueInWei).to.equal(config.basePrice);
      });

      it("returns appropriate value when configured, State B, sellout", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // verify state, sellout
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        // @dev must be sufficiently percent higher than slot 0, so slot 2 is the answer
        expect(minNextBid.minNextBidSlotIndex).to.equal(2);
        expect(minNextBid.minNextBidValueInWei).to.equal(
          await config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            2
          )
        );
      });

      it("reverts when sellout, post-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // advance another second to tick clock when testing view functions
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // expect revert when sellout, post-auction
        await expectRevert(
          config.minter.getMinimumNextBid(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.auctionEndedSellout
        );
      });

      it("returns appropriate value when not sellout, post-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction and advance to state C
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        // advance another second to tick clock when testing view functions
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        // verify state, not sellout
        const minNextBid = await config.minter.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(minNextBid.minNextBidSlotIndex).to.equal(0);
        expect(minNextBid.minNextBidValueInWei).to.equal(config.basePrice);
      });
    });

    describe("getLowestBidValue", async function () {
      it("reverts when no bid exists", async function () {
        const config = await loadFixture(_beforeEach);
        // verify revert when no bid exists, unconfigured
        await expectRevert(
          config.minter.getLowestBidValue(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.noBidsInAuction
        );
        // still reverts if auction is configured and live
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        await expectRevert(
          config.minter.getLowestBidValue(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.noBidsInAuction
        );
      });

      it("returns minimum bid value when bid exists", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await initializeMinBidInProjectZeroAuction(config);
        // verify state
        const lowestBidValue = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(lowestBidValue).to.equal(config.basePrice);
      });

      it("returns greater than base price if min bid is above base price", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // place a bid above base price
        const slot8Price = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          8
        );
        await config.minter
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 8, {
            value: slot8Price,
          });
        // verify state
        const lowestBidValue = await config.minter.getLowestBidValue(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(lowestBidValue).to.equal(slot8Price);
      });
    });

    describe("slotIndexToBidValue", async function () {
      it("reverts if slot index is out of range", async function () {
        const config = await loadFixture(_beforeEach);
        // verify revert when slot index is out of range
        await expectRevert(
          config.minter.slotIndexToBidValue(
            config.projectZero,
            config.genArt721Core.address,
            512
          ),
          revertMessages.onlySlotLtNumSlots
        );
      });

      it("does not revert if project is unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify no revert when project is unconfigured
        const slotValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          0
        );
        expect(slotValue).to.equal(0);
      });

      it("returns appropriate value when project is configured", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await configureDefaultProjectZero(config);
        // verify state
        let slotValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          0
        );
        expect(slotValue).to.equal(config.basePrice);
        // test slot value 64 has completed a double
        slotValue = await config.minter.slotIndexToBidValue(
          config.projectZero,
          config.genArt721Core.address,
          64
        );
        expect(slotValue).to.equal(config.basePrice.mul(2));
      });
    });

    describe("getProjectBalance", async function () {
      it("returns appropriate value when project is unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify state
        const projectBalance = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectBalance).to.equal(0);
      });

      it("returns appropriate value when project is configured", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        await configureDefaultProjectZero(config);
        // verify state
        const projectBalance = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectBalance).to.equal(0);
      });

      it("returns appropriate value when project is configured, sellout", async function () {
        const config = await loadFixture(_beforeEach);
        // sellout auction
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // verify state
        const projectBalance = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectBalance).to.equal(config.basePrice?.mul(15));
      });

      // @dev the above tests satisfy that the view function is working as intended.
      // state updates due to other actions are tested with the function(s) tests, not here.
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("reverts as not supported", async function () {
        const config = await loadFixture(_beforeEach);
        // verify revert
        await expectRevert(
          config.minter.syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.actionNotSupported
        );
      });
    });
  });
});
