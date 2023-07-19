import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  advanceToAuctionStartTime,
  initializeProjectZeroTokenZeroAuction,
  initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd,
  initializeProjectZeroTokenZeroAuctionAndSettle,
} from "./helpers";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import { BigNumber, constants } from "ethers";
import { genArt721CoreV0Sol } from "../../../../scripts/contracts/archive";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
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
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(1);

        // mint a token to next slot
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            0, // start timestamp
            600, // auction duration
            config.pricePerTokenInWei, // price
            5 // bid increment percentage
          );

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
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token to next slot
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            0, // start timestamp
            600, // auction duration
            config.pricePerTokenInWei, // price
            5 // bid increment percentage
          );

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            3
          );

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectOne,
            config.genArt721Core.address,
            1
          );

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(1);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });

      it("enforces project max invocations set on minter", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        // revert during purchase
        // mint a token to next slot

        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            0, // start timestamp
            600, // auction duration
            config.pricePerTokenInWei, // price
            5 // bid increment percentage
          );
      });
    });

    describe("configureFutureAuctions", async function () {
      it("is not callable by non-artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            ),
          revertMessages.onlyArtist
        );
      });

      it("is callable by artist", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
      });

      it("allows a start time of zero", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            0,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
      });

      it("allows a start time in the future", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
      });

      it("does not allow a non-zero, past timestamp", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              1,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            ),
          revertMessages.onlyFutureAuctionsOrZero
        );
      });

      it("does not allow auction below configured minimum length", async function () {
        const config = await loadFixture(_beforeEach);
        const minAuctionLength =
          await config.minter.MIN_AUCTION_DURATION_SECONDS();
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              minAuctionLength - 1,
              config.basePrice,
              config.bidIncrementPercentage
            ),
          revertMessages.auctionTooShort
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // perform action
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        // validate state update
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(seaProjectConfig.timestampStart).to.equal(config.startTime);
        expect(seaProjectConfig.auctionDurationSeconds).to.equal(
          config.defaultAuctionLengthSeconds
        );
        expect(seaProjectConfig.minBidIncrementPercentage).to.equal(
          config.bidIncrementPercentage
        );
        expect(seaProjectConfig.nextTokenNumber).to.equal(
          config.projectZeroTokenZero.toNumber()
        );
        expect(seaProjectConfig.nextTokenNumberIsPopulated).to.equal(true);
        expect(seaProjectConfig.basePrice).to.equal(config.basePrice);
        // current auction should remain uninitialized with current bidder as zero address
        expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
          constants.AddressZero
        );
      });
    });

    describe("resetFutureAuctionDetails", async function () {
      it("is callable by core admin", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.deployer)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("is callable by artist", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("is not callable by user", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .resetFutureAuctionDetails(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyCoreAdminACLOrArtist
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        // perform actions
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        // validate state update
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(seaProjectConfig.timestampStart).to.equal(0);
        expect(seaProjectConfig.auctionDurationSeconds).to.equal(0);
        expect(seaProjectConfig.minBidIncrementPercentage).to.equal(0);
        expect(seaProjectConfig.nextTokenNumber).to.equal(
          config.projectZeroTokenZero.toNumber()
        );
        expect(seaProjectConfig.nextTokenNumberIsPopulated).to.equal(true);
        expect(seaProjectConfig.basePrice).to.equal(0);
        // current auction should remain uninitialized with current bidder as zero address
        expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
          constants.AddressZero
        );
      });
    });

    describe("ejectNextTokenTo", async function () {
      it("is not callable by artist", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .ejectNextTokenTo(
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            ),
          revertMessages.onlyCoreAdminACL
        );
      });

      it("is callable by core admin", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        await config.minter
          .connect(config.accounts.deployer)
          .ejectNextTokenTo(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.artist.address
          );
      });

      it("does not eject when project is configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        // project is configured, so eject should revert
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            ),
          revertMessages.onlyUnconfiguredProjects
        );
      });

      it("reverts when no next token", async function () {
        const config = await loadFixture(_beforeEach);
        // project is unconfigured, but has no next token
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            ),
          revertMessages.noNextToken
        );
      });

      it("updates state, performs NFT transfer", async function () {
        const config = await loadFixture(_beforeEach);
        // perform action
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        await config.minter
          .connect(config.accounts.deployer)
          .ejectNextTokenTo(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        // validate effects
        const seaProjectConfig =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(seaProjectConfig.nextTokenNumber).to.equal(0);
        expect(seaProjectConfig.nextTokenNumberIsPopulated).to.equal(false);
        // user should be the owner of project zero token zero
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const ejectedTokenOwner = await config.genArt721Core.ownerOf(
          targetToken
        );
        expect(ejectedTokenOwner).to.equal(config.accounts.user.address);
      });
    });

    describe("createBid", async function () {
      describe("initializes auction with bid", async function () {
        it("reverts if project not configured", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address),
            revertMessages.onlyConfiguredProjects
          );
        });

        it("reverts if project start time is in future", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime + ONE_DAY * 365, // start time set in future
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );

          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address),
            revertMessages.onlyGteStartTime
          );
        });

        it("reverts if insufficient initial bid", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await advanceToAuctionStartTime(config);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.sub(1),
              }),
            revertMessages.insufficientInitialBid
          );
        });

        it("requires next token is populated", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          // set max invocations to 1 to hit max invocations quickly
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuctionAndSettle(config);
          // next token isn't populated, so we should revert
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice,
              }),
            revertMessages.onlyNextTokenPopulated
          );
        });

        it("requires correct token ID", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // expect revert when incorrect token is passed
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetToken.add(1), config.genArt721Core.address, {
                value: config.basePrice,
              }),
            revertMessages.incorrectTokenId
          );
        });

        it("updates state", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // perform action
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice,
            });
          const receipt = tx.wait();
          const auctionStartTimestamp = (
            await config.accounts.deployer.provider.getBlock(
              receipt.blockNumber
            )
          ).timestamp;
          const expectedAuctionEndTimestamp =
            auctionStartTimestamp + config.defaultAuctionLengthSeconds;
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            config.basePrice
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user.address
          );
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            expectedAuctionEndTimestamp
          );
          expect(
            seaProjectConfig.activeAuction.minBidIncrementPercentage
          ).to.equal(config.bidIncrementPercentage);
          expect(seaProjectConfig.activeAuction.settled).to.be.false;
          // project parameters
          expect(seaProjectConfig.nextTokenNumberIsPopulated).to.be.true;
          expect(seaProjectConfig.nextTokenNumber).to.equal(
            config.projectZeroTokenOne.toNumber()
          );
        });

        it("doesn't mint token to next slot if reached max invocations", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              0, // start at any time
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          // perform action
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice,
            });
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // verify next token is not populated
          expect(seaProjectConfig.nextTokenNumberIsPopulated).to.be.false;
        });
      });

      describe("places bid on existing auction (no initialization required)", async function () {
        it("reverts if incorrect token ID", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // expect revert when incorrect token is passed
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken.add(1), config.genArt721Core.address, {
                value: config.basePrice.mul(2),
              }),
            revertMessages.tokenNotBeingAuctioned
          );
        });

        it("reverts if auction already ended", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // expect revert since auction has ended
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.mul(2),
              }),
            revertMessages.auctionAlreadyEnded
          );
        });

        it("reverts if bid is not sufficiently higher than current bid", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // expect revert since bid is not sufficiently higher than current bid
          await expectRevert(
            config.minter
              .connect(config.accounts.user2)
              .createBid(targetToken, config.genArt721Core.address, {
                value: config.basePrice.add(1),
              }),
            revertMessages.bidTooLow
          );
        });

        it("updates auction state (no auction extension required)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // perform action
          const initialSeaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          const minNextBid = config.basePrice
            .mul(
              initialSeaProjectConfig.activeAuction.minBidIncrementPercentage
            )
            .div(100)
            .add(config.basePrice);
          await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: minNextBid,
            });
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            minNextBid
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user2.address
          );
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            initialSeaProjectConfig.activeAuction.endTime // no extension
          );
        });

        it("updates auction state (auction extension required)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // extend to 5 seconds before end of auction (5 for some testing margin)
          await ethers.provider.send("evm_mine", [
            config.startTime + config.defaultAuctionLengthSeconds - 5,
          ]);
          // perform action
          const initialSeaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          const minNextBid = config.basePrice
            .mul(
              initialSeaProjectConfig.activeAuction.minBidIncrementPercentage
            )
            .div(100)
            .add(config.basePrice);
          const tx = await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: minNextBid,
            });
          const receipt = tx.wait();
          const bidTimestamp = (
            await config.accounts.deployer.provider.getBlock(
              receipt.blockNumber
            )
          ).timestamp;
          // validate state update
          const seaProjectConfig =
            await config.minter.SEAProjectConfigurationDetails(
              config.projectZero,
              config.genArt721Core.address
            );
          // auction parameters
          expect(seaProjectConfig.activeAuction.tokenId).to.equal(
            config.projectZeroTokenZero.toNumber()
          );
          expect(seaProjectConfig.activeAuction.currentBid).to.equal(
            minNextBid
          );
          expect(seaProjectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user2.address
          );
          // new end time is gt initial end time
          expect(seaProjectConfig.activeAuction.endTime).to.be.gt(
            initialSeaProjectConfig.activeAuction.endTime
          );
          // auction was extended appropriate amount
          const minterConfigurationDetails =
            await config.minter.minterConfigurationDetails();
          expect(seaProjectConfig.activeAuction.endTime).to.equal(
            bidTimestamp + minterConfigurationDetails.minterTimeBufferSeconds_
          );
        });

        it("refunds previous bidder (no force transfer)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // record initial bidder's balance
          const initialBalance = await config.accounts.user.getBalance();
          // second bidder places bid, initiating refund to original bidder
          await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice.mul(2),
            });
          // validate refund
          const finalBalance = await config.accounts.user.getBalance();
          expect(finalBalance).to.equal(initialBalance.add(config.basePrice));
        });

        it("refunds previous bidder (fallback force transfer)", async function () {
          const config = await loadFixture(_beforeEach);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const deadReceiverBidder = await deployAndGet(
            config,
            "DeadReceiverBidderMock",
            []
          );
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            );
          await initializeProjectZeroTokenZeroAuction(config);
          // place bid with dead receiver mock
          const bid2Value = config.basePrice.mul(11).div(10);
          await deadReceiverBidder
            .connect(config.accounts.user2)
            .createBidOnAuctionSharedMinter(
              config.minter.address,
              targetToken,
              config.genArt721Core.address,
              {
                value: bid2Value,
              }
            );
          // verify that the dead receiver mock received the funds as ETH fallback
          // when they are outbid
          const deadReceiverBalanceBefore = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          const Bid3Value = bid2Value.mul(11).div(10);
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: Bid3Value,
            });
          const deadReceiverBalanceAfter = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          // change in balance should be equal to bid2Value
          expect(deadReceiverBalanceAfter).to.equal(
            deadReceiverBalanceBefore.add(bid2Value)
          );
        });
      });
    });
  });
});
