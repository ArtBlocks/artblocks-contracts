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
  initializeMinBidInProjectZeroAuction,
  mintTokenOnDifferentMinter,
  initializeMinBidInProjectZeroAuctionAndAdvanceToEnd,
  initializeMinBidInProjectZeroAuctionAndEnterExtraTime,
  initializeProjectZeroTokenZeroAuctionAndMint,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

// hard-coded minter constants
const MIN_AUCTION_DURATION_SECONDS = 10 * ONE_MINUTE; // 10 minutes
const AUCTION_BUFFER_SECONDS = 5 * ONE_MINUTE; // 5 minutes
const MAX_AUCTION_EXTRA_SECONDS = 60 * ONE_MINUTE; // 60 minutes
const MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours
const ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 * ONE_HOUR; // 72 hours

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // TODO uncomment all cores
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} View w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("constructor", async function () {
      it("populates values during deployment", async function () {
        const config = await loadFixture(_beforeEach);

        // verify minter filter address
        const minterFilterAddress = await config.minter.minterFilterAddress();
        expect(minterFilterAddress).to.equal(config.minterFilter.address);
      });
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("reverts", async function () {
        const config = await loadFixture(_beforeEach);

        // sync max invocations from core to minter
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.actionNotSupported
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("reverts when non-artist calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyArtist
        );
      });

      it("allows artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
      });

      it("reverts when not in State A", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeMinBidInProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyStateA
        );
      });

      it("updates project's max invocations", async function () {
        const config = await loadFixture(_beforeEach);
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
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(false);
      });

      it("updates num tokens in auction when invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(1);
      });

      it("updates num tokens in auction when no invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(0);
      });

      it("updates max invocation state when no invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(0);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(true);
      });

      it("updates state as expected when previous invocations exist", async function () {
        const config = await loadFixture(_beforeEach);
        await mintTokenOnDifferentMinter(config);
        // set max invocations to 1 allowed, but maxHasBeenInvoked = true
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        let localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(true);
        let auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(0);
        // set max invocations to 0 not allowed (exceeds max invocations on core)
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.invalidMaxInvocations
        );
        // set max invocations to 2 allowed, now maxHasBeenInvoked = false
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(2);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(false);
        auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(1);
      });
    });

    describe("updateRefundGasLimit", async function () {
      it("reverts non-admin calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateRefundGasLimit(6_999),
          revertMessages.onlyMinterFilterACL
        );
      });

      it("reverts if value < 7_000", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateRefundGasLimit(6_999),
          revertMessages.onlyGte7000
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .updateRefundGasLimit(7_001);
        // validate state update
        const minterConfigDetails =
          await config.minter.minterConfigurationDetails();
        expect(minterConfigDetails.minterRefundGasLimit).to.equal(7_001);
      });
    });

    describe("setContractConfig", async function () {
      it("reverts non-admin calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setContractConfig(config.genArt721Core.address, false, false),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("reverts when both args are true", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .setContractConfig(config.genArt721Core.address, true, true),
          revertMessages.onlyOneConstraint
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .setContractConfig(config.genArt721Core.address, true, false);
        // validate state update
        const contractConfigDetails =
          await config.minter.contractConfigurationDetails(
            config.genArt721Core.address
          );
        expect(contractConfigDetails.imposeConstraints).to.equal(true);
        expect(contractConfigDetails.requireAdminArtistOnlyMintPeriod).to.equal(
          true
        );
        expect(
          contractConfigDetails.requireNoAdminArtistOnlyMintPeriod
        ).to.equal(false);
      });
    });

    describe("adminAddEmergencyAuctionHours", async function () {
      it("reverts non-admin calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("reverts if not in state B", async function () {
        const config = await loadFixture(_beforeEach);
        // revert in State A
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyStateB
        );
        // revert in State C
        await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyStateB
        );
      });

      it("reverts if called during auction extra time", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeMinBidInProjectZeroAuctionAndEnterExtraTime(config);
        // revert due to extra time
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.notInExtraTime
        );
      });

      it("reverts if hours > 72", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminAddEmergencyAuctionHours(
              config.projectZero,
              config.genArt721Core.address,
              73
            ),
          revertMessages.onlyEmergencyLTMax
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // record auction end time
        const initialAuctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        const initialAuctionTimestampEnd =
          initialAuctionDetails.auctionTimestampEnd;
        // extend two hours
        await config.minter
          .connect(config.accounts.deployer)
          .adminAddEmergencyAuctionHours(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        // record updated auction end time
        const updatedAuctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        const updatedAuctionTimestampEnd =
          updatedAuctionDetails.auctionTimestampEnd;
        // validate state update
        expect(
          parseInt(initialAuctionTimestampEnd, 10) + 2 * ONE_HOUR
        ).to.equal(parseInt(updatedAuctionTimestampEnd, 10));
      });
    });

    describe("setAuctionDetails", async function () {
      it("reverts when non-artist calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + config.defaultAuctionLengthSeconds,
              config.basePrice,
              true,
              true
            ),
          revertMessages.onlyArtist
        );
      });

      it("reverts when called after State A", async function () {
        const config = await loadFixture(_beforeEach);
        // enter State B
        await initializeMinBidInProjectZeroAuction(config);
        // revert in State B
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + config.defaultAuctionLengthSeconds,
              config.basePrice,
              true,
              true
            ),
          revertMessages.onlyPreAuction
        );
      });

      it("reverts if auction duration < MIN_AUCTION_DURATION_SECONDS", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + MIN_AUCTION_DURATION_SECONDS - 1,
              config.basePrice,
              true,
              true
            ),
          revertMessages.auctionTooShortRAM
        );
      });

      it("refreshes auction state before setting num tokens in auction", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce core max invocations to 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // configure auction
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            true
          );
        // validate that one token is in auction
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(1);
      });

      it("requires min price of >= 0.05 ether", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + config.defaultAuctionLengthSeconds,
              ethers.utils.parseEther("0.049"),
              true,
              true
            ),
          revertMessages.onlyGTE0p05ETH
        );
      });

      it("only allows future start times", async function () {
        const config = await loadFixture(_beforeEach);
        // advance time to auction start time - 1 second
        await ethers.provider.send("evm_mine", [config.startTime - 1]);
        // revert when start time is not in the future
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime - 1,
              config.startTime + config.defaultAuctionLengthSeconds,
              config.basePrice,
              true,
              true
            ),
          revertMessages.onlyFutureAuctions
        );
      });

      it("enforces only admin-artist mint period constraint", async function () {
        const config = await loadFixture(_beforeEach);
        // allows either case if admin has not configured
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            true
          );
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            false
          );
        // set requireNoAdminArtistOnlyMintPeriod to true
        await config.minter
          .connect(config.accounts.deployer)
          .setContractConfig(config.genArt721Core.address, false, true);
        // revert when admin-artist only mint period not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + config.defaultAuctionLengthSeconds,
              config.basePrice,
              true,
              true
            ),
          revertMessages.onlyNoAdminArtistMintPeriod
        );
        // allows when admin-artist only mint period is false
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            false
          );
        // requireAdminArtistOnlyMintPeriod to true
        await config.minter
          .connect(config.accounts.deployer)
          .setContractConfig(config.genArt721Core.address, true, false);
        // revert when admin-artist only mint period not allowed
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.startTime + config.defaultAuctionLengthSeconds,
              config.basePrice,
              true,
              false
            ),
          revertMessages.onlyAdminArtistMintPeriod
        );
        // allows when admin-artist only mint period is true
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            true
          );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.startTime + config.defaultAuctionLengthSeconds,
            config.basePrice,
            true,
            true
          );
        // validate state update
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.auctionTimestampStart).to.equal(config.startTime);
        expect(auctionDetails.auctionTimestampEnd).to.equal(
          config.startTime + config.defaultAuctionLengthSeconds
        );
        expect(auctionDetails.basePrice).to.equal(config.basePrice);
        expect(auctionDetails.allowExtraTime).to.equal(true);
        expect(auctionDetails.adminArtistOnlyMintPeriodIfSellout).to.equal(
          true
        );
        expect(auctionDetails.numTokensInAuction).to.equal(
          config.maxInvocations
        );
      });
    });

    describe("reduceAuctionLength", async function () {
      it("reverts if non-artist calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds
            ),
          revertMessages.onlyArtist
        );
      });

      it("reverts if not in state B", async function () {
        const config = await loadFixture(_beforeEach);
        // revert in State A
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds
            ),
          revertMessages.onlyStateB
        );
      });

      it("reverts if admin previously added emergency hours", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // add emergency hours
        await config.minter
          .connect(config.accounts.deployer)
          .adminAddEmergencyAuctionHours(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        // revert when emergency hours previously set
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds
            ),
          revertMessages.noPerviousAdminExtension
        );
      });

      it("reverts if already in extension time", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuctionAndEnterExtraTime(config);
        // revert when in extension time
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds - 1
            ),
          revertMessages.notInExtraTime
        );
      });

      it("reverts if doesn't reduce auction length", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // revert when auction length not reduced
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + config.defaultAuctionLengthSeconds
            ),
          revertMessages.onlyReduceAuctionLength
        );
      });

      it("reverts if auction length < MIN_AUCTION_DURATION_SECONDS", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // revert when auction length < MIN_AUCTION_DURATION_SECONDS
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + MIN_AUCTION_DURATION_SECONDS - 1
            ),
          revertMessages.auctionTooShortRAM
        );
      });

      it("reverts if new end timestamp is not in future", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // advance well into the auction, beyond minimum duration
        await ethers.provider.send("evm_mine", [
          config.startTime + MIN_AUCTION_DURATION_SECONDS + 60,
        ]);
        // revert if new end timestamp is not in future
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .reduceAuctionLength(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + MIN_AUCTION_DURATION_SECONDS + 60
            ),
          revertMessages.onlyFutureEndTime
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State B
        await initializeMinBidInProjectZeroAuction(config);
        // record auction end time
        const initialAuctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        const initialAuctionTimestampEnd =
          initialAuctionDetails.auctionTimestampEnd;
        // reduce auction length
        await config.minter
          .connect(config.accounts.artist)
          .reduceAuctionLength(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime + config.defaultAuctionLengthSeconds - 60
          );
        // record updated auction end time
        const updatedAuctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        const updatedAuctionTimestampEnd =
          updatedAuctionDetails.auctionTimestampEnd;
        // validate state update
        expect(parseInt(initialAuctionTimestampEnd, 10) - 60).to.equal(
          parseInt(updatedAuctionTimestampEnd, 10)
        );
      });
    });

    describe("withdrawArtistAndAdminRevenues", async function () {
      it("reverts if not in State E", async function () {
        const config = await loadFixture(_beforeEach);
        // revert in State A
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyStateE
        );
        // revert in State B
        await initializeMinBidInProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyStateE
        );
        // advance time to end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds,
        ]);
        // revert in State C
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyStateE
        );
      });

      it("reverts if revenues already withdrawn", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State E
        await initializeProjectZeroTokenZeroAuctionAndMint(config);
        // withdraw revenues
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );
        // revert when revenues already withdrawn
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .withdrawArtistAndAdminRevenues(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.revenuesAlreadyWithdrawn
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to State E
        await initializeProjectZeroTokenZeroAuctionAndMint(config);
        // get project balance before
        const projectBalanceBefore = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectBalanceBefore).to.equal(config.basePrice);
        // record artist & admin balance before
        const artistBalanceBefore = await config.accounts.artist.getBalance();
        const adminBalanceBefore = await config.accounts.deployer.getBalance();
        // validate revenues collected state before
        const auctionDetailsBefore = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetailsBefore.revenuesCollected).to.equal(false);

        // withdraw revenues (with gas fee of zero)
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address,
            {
              gasPrice: 0,
            }
          );

        // get project balance after is zero
        const projectBalanceAfter = await config.minter.getProjectBalance(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectBalanceAfter).to.equal(0);
        // validate revenues collected state after
        const auctionDetailsAfter = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetailsAfter.revenuesCollected).to.equal(true);
        // record artist & admin balance after
        const artistBalanceAfter = await config.accounts.artist.getBalance();
        const adminBalanceAfter = await config.accounts.deployer.getBalance();
        // validate artist & admin balances
        expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(
          config.basePrice?.mul(90).div(100)
        );
        expect(adminBalanceAfter.sub(adminBalanceBefore)).to.equal(
          config.basePrice?.mul(10).div(100)
        );
      });
    });
  });
});
