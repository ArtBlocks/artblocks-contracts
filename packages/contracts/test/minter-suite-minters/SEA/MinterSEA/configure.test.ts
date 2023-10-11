import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

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

      it("does not allow a base price of zero", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            0, // base price of zero
            config.bidIncrementPercentage
          ),
          revertMessages.onlyNonZero
        );
      });

      it("does not allow a min bid increment percentage of zero", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.artist).configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            0 // min bid increment percentage of zero
          ),
          revertMessages.onlyNonZero
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
        const ejectedTokenOwner =
          await config.genArt721Core.ownerOf(targetToken);
        expect(ejectedTokenOwner).to.equal(config.accounts.user.address);
      });
    });

    describe("tryPopulateNextToken", async function () {
      it("reverts when project not configured", async function () {
        const config = await loadFixture(_beforeEach);
        // project is unconfigured, so populate should revert
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .tryPopulateNextToken(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.onlyConfiguredProjects
        );
      });

      it("returns early if next token is already populated", async function () {
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
        // next token is already populated, so populate should return early, not revert
        await config.minter
          .connect(config.accounts.artist)
          .tryPopulateNextToken(
            config.projectZero,
            config.genArt721Core.address
          );
      });

      it("tries to populate if already configured", async function () {
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
        // function will now try and populate next token
        // @dev - we don't think it is possible to test the case where this
        // function populates the next token, so try will always return early,
        // and have no effect on state
        await config.minter
          .connect(config.accounts.artist)
          .tryPopulateNextToken(
            config.projectZero,
            config.genArt721Core.address
          );
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
        expect(minterConfigDetails.minterRefundGasLimit_).to.equal(7_001);
      });
    });

    describe("updateMinterTimeBufferSeconds", async function () {
      it("reverts when non-admin calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateMinterTimeBufferSeconds(ONE_HOUR),
          revertMessages.onlyMinterFilterACL
        );
      });

      it("reverts when value is zero", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateMinterTimeBufferSeconds(0),
          revertMessages.onlyNonZero
        );
      });

      it("updates state", async function () {
        const config = await loadFixture(_beforeEach);
        const initialMinterConfigDetails =
          await config.minter.minterConfigurationDetails();
        expect(initialMinterConfigDetails.minterTimeBufferSeconds).to.not.equal(
          61
        );
        await config.minter
          .connect(config.accounts.deployer)
          .updateMinterTimeBufferSeconds(61);
        const minterConfigDetails =
          await config.minter.minterConfigurationDetails();
        expect(minterConfigDetails.minterTimeBufferSeconds_).to.equal(61);
      });
    });
  });
});
