import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import {
  configureProjectZeroAuction,
  configureProjectZeroAuctionAndAdvanceToStart,
  configureProjectZeroAuctionAndSellout,
  configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues,
  mintTokenOnDifferentMinter,
} from "./helpers";
import { Common_Configure } from "../../common.configure";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDAExpSettlementV3";
const TARGET_MINTER_VERSION = "v3.0.0";

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
  describe(`${TARGET_MINTER_NAME} Configure w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.defaultHalfLife = 60; // seconds
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    describe("Common Minter Configure Tests", async function () {
      await Common_Configure(_beforeEach);
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("is not implemented", async function () {
        const config = await loadFixture(_beforeEach);
        // function is not implemented
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.notImplemented
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // can no longer increase max invocations on this minter because a token has been purchased
      });

      it("enforces project max invocations set on minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        // revert during purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
            }),
          revertMessages.maximumInvocationsReached
        );
      });

      it("reverts if called after one or more purchases", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // revert when trying to set max invocations after a purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyBeforePurchases
        );
      });
    });

    describe("setAuctionDetails", async function () {
      it("does not allow non-artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultHalfLife,
              config.startingPrice,
              config.basePrice
            ),
          revertMessages.onlyArtist
        );
      });

      it("does allow artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        // expect to not revert
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
      });

      it("does not allow half seconds life lt min half life seconds", async function () {
        const config = await loadFixture(_beforeEach);
        const minHalfLife =
          await config.minter.minimumPriceDecayHalfLifeSeconds();
        // expect to not revert
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              minHalfLife.sub(1),
              config.startingPrice,
              config.basePrice
            ),
          revertMessages.halfLifeTooShort
        );
      });

      it("does allow half seconds life gte min half life seconds", async function () {
        const config = await loadFixture(_beforeEach);
        const minHalfLife =
          await config.minter.minimumPriceDecayHalfLifeSeconds();
        // expect to not revert
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            minHalfLife,
            config.startingPrice,
            config.basePrice
          );
      });

      it("Updates auction details state", async function () {
        const config = await loadFixture(_beforeEach);
        // get initial auction state, verify it's not initialized
        const initialAuctionDetails = await config.minter
          .connect(config.accounts.artist)
          .projectAuctionParameters(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(initialAuctionDetails.timestampStart).to.equal(0);
        expect(initialAuctionDetails.priceDecayHalfLifeSeconds).to.equal(0);
        expect(initialAuctionDetails.startPrice).to.equal(0);
        expect(initialAuctionDetails.basePrice).to.equal(0);
        // configure auction
        await configureProjectZeroAuction(config);
        // expect auction details to be set
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .projectAuctionParameters(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(auctionDetails.timestampStart).to.equal(config.startTime);
        expect(auctionDetails.priceDecayHalfLifeSeconds).to.equal(
          config.defaultHalfLife
        );
        expect(auctionDetails.startPrice).to.equal(config.startingPrice);
        expect(auctionDetails.basePrice).to.equal(config.basePrice);
      });

      it("Allows modifications pre-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction
        await configureProjectZeroAuction(config);
        // expect no revert when modifing auction details pre-auction
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
      });

      it("No modifications mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // expect revert when trying to modify auction details mid-auction
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultHalfLife,
              config.startingPrice,
              config.basePrice
            ),
          revertMessages.noMidAuction
        );
      });

      it("Only future auctions", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when setting auction start time to past
        await expectRevert(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            1, // timestamp 1 is in the past
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          ),
          revertMessages.onlyFutureAuctions
        );
      });

      it("Auction start price must be greater than auction end price", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when setting auction start price is <= auction end price
        await expectRevert(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            config.startingPrice.add(1) // start price is <= end price
          ),
          revertMessages.invalidDAPrices
        );
      });

      it("Syncs project max invocations to core if unconfigured", async function () {
        const config = await loadFixture(_beforeEach);
        // verify max invocations not initialized
        const maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(0);
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
        // configure auction
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
        // verify max invocations initialized
        const maxInvocationsProjectConfig2 =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig2.maxInvocations).to.equal(15);
        expect(maxInvocationsProjectConfig2.maxHasBeenInvoked).to.equal(false);
      });

      it("Maintains manually set project max invocations if already configured", async function () {
        const config = await loadFixture(_beforeEach);
        // manually limit max invocations < core max invocations
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // configure auction
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
        // verify max invocations remains manually set value
        const maxInvocationsProjectConfig2 =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig2.maxInvocations).to.equal(1);
        expect(maxInvocationsProjectConfig2.maxHasBeenInvoked).to.equal(false);
      });

      it("requires monatonically decreasing start price", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction, expect no revert because no latest purchase price
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // purchase a token to define a latestPurchasePrice
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // reset the auction
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        // re-configure a new auction with a start price that is not monatonically decreasing,
        // expect revert
        const lastPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        await expectRevert(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + ONE_DAY,
            config.defaultHalfLife,
            lastPurchasePrice.add(1), // too high
            config.basePrice
          ),
          revertMessages.onlyDecreasingPrice
        );
        // expect no revert when re-configuring with a start price that is monatonically decreasing
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + ONE_DAY,
            config.defaultHalfLife,
            lastPurchasePrice,
            config.basePrice
          );
      });

      it("does not allow base price of zero", async function () {
        const config = await loadFixture(_beforeEach);
        // expect revert when setting base price to zero
        await expectRevert(
          config.minter.connect(config.accounts.artist).setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultHalfLife,
            config.startingPrice,
            0 // base price of zero
          ),
          revertMessages.onlyNonZeroBasePrice
        );
      });
    });

    describe("setMinimumPriceDecayHalfLifeSeconds", async function () {
      it("is not callable by non-admin", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setMinimumPriceDecayHalfLifeSeconds(1),
          revertMessages.onlyMinterFilterACL
        );
      });

      it("is callable by minter filter admin", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .setMinimumPriceDecayHalfLifeSeconds(1);
      });

      it("doesn't allow half life of zero", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .setMinimumPriceDecayHalfLifeSeconds(0),
          revertMessages.noZeroHalfLife
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // verify initial condition
        const minHalfLifeInitial =
          await config.minter.minimumPriceDecayHalfLifeSeconds();
        expect(minHalfLifeInitial).to.not.equal(1);
        await config.minter
          .connect(config.accounts.deployer)
          .setMinimumPriceDecayHalfLifeSeconds(1);
        // verify state update
        const minHalfLife =
          await config.minter.minimumPriceDecayHalfLifeSeconds();
        expect(minHalfLife).to.equal(1);
      });
    });

    describe("resetAuctionDetails", async function () {
      it("is not callable by non-core admin", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("is callable by core admin", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("reverts after revenues are collected", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
          config
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyBeforeRevenuesWithdrawn
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction
        await configureProjectZeroAuction(config);
        // verify auction details are set
        const auctionDetails = await config.minter.projectAuctionParameters(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.timestampStart).to.equal(config.startTime);
        // no need to verify all auction details, just one is sufficient

        // reset auction details
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        // verify auction details are reset
        const auctionDetails2 = await config.minter.projectAuctionParameters(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails2.timestampStart).to.equal(0);
        expect(auctionDetails2.priceDecayHalfLifeSeconds).to.equal(0);
        expect(auctionDetails2.startPrice).to.equal(0);
        expect(auctionDetails2.basePrice).to.equal(0);
      });
    });

    describe("withdrawArtistAndAdminRevenues", async function () {
      it("is not callable by non-core admin or artist", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSellout(config);
        // expect revert when called by non-core admin or artist
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyCoreAdminACLOrArtist
        );
      });

      it("is callable by core admin", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSellout(config);
        // expect no revert
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("is callable by artist", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSellout(config);
        // expect no revert
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("is not callable more than once", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSellout(config);
        // no revert on initial call
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
        // expect revert when called by non-core admin or artist
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.revenuesAlreadyCollected
        );
      });

      it("refreshes max invocations from other mints on core", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // set max invocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // mint another token on a different Minter
        await mintTokenOnDifferentMinter(config);
        // can now call withdrawArtistAndAdminRevenues, because invocations
        // from other minter will be accounted for
        // @dev note that admin must be the caller here, because the artist
        // is banned from calling this function after "funny business" of
        // minting on other minter during live auction
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("requires admin to withdraw funds if funny business (e.g. minting on other minter during auction)", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // set max invocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // do some FUNNY BUSINESS! mint another token on a different Minter
        await mintTokenOnDifferentMinter(config);
        // artist may not call withdrawArtistAndAdminRevenues after "funny business"
        // of minting on other minter during live auction
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyCoreAdminACL
        );
        // admin may call withdrawArtistAndAdminRevenues
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("requires sellout if last purchase price is > base price", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // set max invocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // reverts because last purchase price is > base price and auction is
        // not sold out
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.auctionNotSoldOut
        );
      });

      it("calculates appropriate net revenues, sellout above base price", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // purchase a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const firstPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        // wait one minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        // purchase another token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // get latest purchase price
        const secondPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        // withdraw revenues
        const artistInitialBalance = await config.accounts.artist.getBalance();
        // payment addresses?
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
        const artistFinalBalance = await config.accounts.artist.getBalance();
        const expectedRevenue = config.isEngine
          ? secondPurchasePrice.mul(8).div(10).mul(2) // 80% to artist
          : secondPurchasePrice.mul(9).div(10).mul(2); // 90% to artist
        // expect artist to receive 90% of latest purchase price, times 2 for 2 tokens
        expect(expectedRevenue).to.be.gt(0);
        expect(secondPurchasePrice).to.be.gt(0);
        // expected numerical tolerance is ~2 wei for the two purchases
        expect(
          artistFinalBalance
            .sub(artistInitialBalance)
            .sub(expectedRevenue)
            .abs()
        ).to.be.lte(2);
        expect(secondPurchasePrice).to.be.lt(firstPurchasePrice);
        expect(secondPurchasePrice).to.be.gt(config.basePrice);
      });

      it("calculates appropriate net revenues, reached base price", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // purchase a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const firstPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        // wait one day and reach base price
        await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
        // withdraw revenues
        const artistInitialBalance = await config.accounts.artist.getBalance();
        // payment addresses?
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
        const artistFinalBalance = await config.accounts.artist.getBalance();
        const expectedRevenue = config.isEngine
          ? config.basePrice.mul(8).div(10) // 80% to artist
          : config.basePrice.mul(9).div(10); // 90% to artist
        // expect artist to receive 90% of base price
        expect(artistFinalBalance).to.be.gt(0);
        expect(artistFinalBalance.sub(artistInitialBalance)).to.equal(
          expectedRevenue
        );
        expect(firstPurchasePrice).to.be.gt(config.basePrice);
      });
    });
  });
});
