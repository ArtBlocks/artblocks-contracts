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
} from "../DAExp/helpers";
import { Common_Configure } from "../../common.configure";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDAExpHolderV5";
const TARGET_MINTER_VERSION = "v5.0.0";

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

      config.delegationRegistry = await deployAndGet(
        config,
        "DelegationRegistry",
        []
      );

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
        config.delegationRegistry.address,
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

      config.minterSetPrice = await deployAndGet(config, "MinterSetPriceV5", [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minterSetPrice.address);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectZero, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectOne, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });
      // switch config.projectZero back to MinterHolderV0
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          config.genArt721Core.address,
          [config.genArt721Core.address],
          [config.projectZero]
        );

      return config;
    }

    describe("Common Minter Configure Tests", async function () {
      await Common_Configure(_beforeEach);
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(2);
        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
            value: config.startingPrice,
          });
        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;
        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;
        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(syncedMaxInvocationsProjectConfig.maxInvocations).to.equal(15);
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
            2
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(2);

        // mint a token
        await config.minter
          .connect(config.accounts.artist)
          [
            "purchase(uint256,address,address,uint256)"
          ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
            value: config.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            3
          );

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(2);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });

      it("enforces project max invocations set on minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // revert during purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            [
              "purchase(uint256,address,address,uint256)"
            ](config.projectZero, config.genArt721Core.address, config.genArt721Core.address, config.projectZeroTokenZero.toNumber(), {
              value: config.startingPrice,
            }),
          revertMessages.maximumInvocationsReached
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
            2
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
        expect(maxInvocationsProjectConfig2.maxInvocations).to.equal(2);
        expect(maxInvocationsProjectConfig2.maxHasBeenInvoked).to.equal(false);
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

    describe("allowHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .allowHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("length of array args must match", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.lengthOfArraysMustMatch
        );
      });
    });

    describe("removeHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .removeHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("only allows equal length array args", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.lengthOfArraysMustMatch
        );
      });
    });

    describe("allowAndRemoveHoldersOfProjects", async function () {
      it("only allows artist to update allowed holders", async function () {
        const config = await loadFixture(_beforeEach);
        // user not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // additional not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.additional)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            ),
          revertMessages.onlyArtist
        );
        // artist allowed
        await config.minter
          .connect(config.accounts.artist)
          .allowAndRemoveHoldersOfProjects(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne],
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });
    });
  });
});
