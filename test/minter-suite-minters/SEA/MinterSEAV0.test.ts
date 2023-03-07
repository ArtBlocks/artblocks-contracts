import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  ether,
} from "@openzeppelin/test-helpers";

import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
  requireBigNumberIsClose,
} from "../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../util/constants";

import { Minter_Common } from "../Minter.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  //   "GenArt721CoreV3_Explorations", // V3 core explorations contract
  //   "GenArt721CoreV3_Engine", // V3 core engine contract
  //   "GenArt721CoreV3_EngineFlex", // V3 core engine contract
];

const TARGET_MINTER_NAME = "MinterSEAV0";

// helper functions

// helper function to initialize a token auction on project zero
// @dev "user" account is the one who initializes the auction
async function initializeProjectZeroTokenZeroAuction(config: T_Config) {
  // advance time to auction start time - 1 second
  // @dev this makes next block timestamp equal to auction start time
  await ethers.provider.send("evm_mine", [config.startTime - 1]);
  // someone initializes the auction
  const targetToken = BigNumber.from(config.projectZeroTokenZero.toString());
  await config.minter
    .connect(config.accounts.user)
    .initializeAuction(targetToken, {
      value: config.basePrice,
    });
}

// helper function to initialize a token auction on project zero, and then
// advance time to the end of the auction, but do not settle the auction
async function initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(
  config: T_Config
) {
  await initializeProjectZeroTokenZeroAuction(config);
  // advance time to end of auction
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds,
  ]);
}

// helper function to initialize a token auction on project zero, advances to end
// of auction, then settles the auction
async function initializeProjectZeroTokenZeroAuctionAndSettle(
  config: T_Config
) {
  await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
  // settle the auction
  const targetToken = BigNumber.from(config.projectZeroTokenZero.toString());
  await config.minter.connect(config.accounts.user).settleAuction(targetToken);
}

/**
 * These tests intended to ensure config Filtered Minter integrates properly with
 * V3 core contracts, both flagship and explorations.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${TARGET_MINTER_NAME}_${coreContractName}`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);
      config.basePrice = config.pricePerTokenInWei;

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));

      // deploy and configure WETH token
      config.weth = await deployAndGet(config, "WETH9_", []);

      // deploy and configure minter
      config.targetMinterName = TARGET_MINTER_NAME;
      config.minter = await deployAndGet(config, config.targetMinterName, [
        config.genArt721Core.address,
        config.minterFilter.address,
        config.weth.address,
      ]);
      config.isEngine = await config.minter.isEngine();

      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);

      // configure project 1
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      await config.minter
        .connect(config.accounts.artist)
        .configureFutureAuctions(
          config.projectZero,
          config.startTime,
          config.defaultAuctionLengthSeconds,
          config.pricePerTokenInWei
        );

      return config;
    }
    describe("common minter tests", async () => {
      await Minter_Common(_beforeEach);
    });

    describe("Artist configuring", async function () {
      describe("setProjectMaxInvocations", async function () {
        it("allows artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .setProjectMaxInvocations(config.projectZero);
        });

        it("does not allow non-artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .setProjectMaxInvocations(config.projectZero),
            "Only Artist"
          );
        });

        it("reverts for unconfigured/non-existent project", async function () {
          const config = await loadFixture(_beforeEach);
          // trying to set config on unconfigured project (e.g. 99) should cause
          // revert on the underlying CoreContract
          expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .setProjectMaxInvocations(99),
            "Project ID does not exist"
          );
        });

        // @dev updating of state is checked in Minter_Common tests
      });

      describe("manuallyLimitProjectMaxInvocations", async function () {
        it("allows artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        });

        it("does not allow non-artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .manuallyLimitProjectMaxInvocations(config.projectZero, 2),
            "Only Artist"
          );
        });

        it("reverts for unconfigured/non-existent project", async function () {
          const config = await loadFixture(_beforeEach);
          // trying to set config on unconfigured project (e.g. 99) should cause
          // revert on the underlying CoreContract
          expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .manuallyLimitProjectMaxInvocations(99, 2),
            "Project ID does not exist"
          );
        });

        it("reverts if setting to less than current invocations", async function () {
          const config = await loadFixture(_beforeEach);
          // invoke one invocation on project zero
          await initializeProjectZeroTokenZeroAuction(config);
          // should revert when limiting to less than current invocations of one
          expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .manuallyLimitProjectMaxInvocations(config.projectZero, 0),
            "Cannot set project max invocations to less than current invocations"
          );
        });

        it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .manuallyLimitProjectMaxInvocations(
                config.projectZero,
                config.maxInvocations + 1
              ),
            "Cannot increase project max invocations above core contract set project max invocations"
          );
        });

        it("appropriately updates state after calling manuallyLimitProjectMaxInvocations", async function () {
          const config = await loadFixture(_beforeEach);
          // reduce local maxInvocations to 2 on minter
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          const localMaxInvocations = await config.minter
            .connect(config.accounts.artist)
            .projectConfig(config.projectZero);
          expect(localMaxInvocations.maxInvocations).to.equal(1);

          // mint a token on project zero (by initializing a new token auction)
          await initializeProjectZeroTokenZeroAuction(config);

          // expect projectMaxHasBeenInvoked to be true
          const hasMaxBeenInvoked =
            await config.minter.projectMaxHasBeenInvoked(config.projectZero);
          expect(hasMaxBeenInvoked).to.be.true;

          // increase invocations on the minter
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 3);

          // expect maxInvocations on the minter to be 3
          const localMaxInvocations2 = await config.minter
            .connect(config.accounts.artist)
            .projectConfig(config.projectZero);
          expect(localMaxInvocations2.maxInvocations).to.equal(3);

          // expect projectMaxHasBeenInvoked to now be false
          const hasMaxBeenInvoked2 =
            await config.minter.projectMaxHasBeenInvoked(config.projectZero);
          expect(hasMaxBeenInvoked2).to.be.false;

          // reduce invocations on the minter
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);

          // expect maxInvocations on the minter to be 1
          const localMaxInvocations3 = await config.minter
            .connect(config.accounts.artist)
            .projectConfig(config.projectZero);
          expect(localMaxInvocations3.maxInvocations).to.equal(1);

          // expect projectMaxHasBeenInvoked to now be true
          const hasMaxBeenInvoked3 =
            await config.minter.projectMaxHasBeenInvoked(config.projectZero);
          expect(hasMaxBeenInvoked3).to.be.true;
        });
      });

      describe("configureFutureAuctions", async function () {
        it("allows timestamp of zero", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              0,
              config.defaultAuctionLengthSeconds,
              config.basePrice
            );
        });

        it("allows future timestamp", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.startTime + 100,
              config.defaultAuctionLengthSeconds,
              config.basePrice
            );
        });

        it("does not allow past timestamp", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .configureFutureAuctions(
                config.projectZero,
                1, // gt 0 but not a future timestamp
                config.defaultAuctionLengthSeconds,
                config.basePrice
              ),
            "Only future start times or 0"
          );
        });

        it("does allow auction duration inside of minter-allowed range", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.startTime,
              config.defaultAuctionLengthSeconds + 1,
              config.basePrice
            );
        });

        it("does not allow auction duration outside of minter-allowed range", async function () {
          const config = await loadFixture(_beforeEach);
          // less than min
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .configureFutureAuctions(
                config.projectZero,
                config.startTime,
                1,
                config.basePrice
              ),
            "Auction duration out of range"
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .configureFutureAuctions(
                config.projectZero,
                config.startTime,
                1_000_000_000_000,
                config.basePrice
              ),
            "Auction duration out of range"
          );
        });

        it("does not allow auction base price of zero", async function () {
          const config = await loadFixture(_beforeEach);
          // less than min
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .configureFutureAuctions(
                config.projectZero,
                config.startTime,
                config.defaultAuctionLengthSeconds,
                0
              ),
            "Only base price gt 0"
          );
        });
      });
    });

    describe("Admin configuring", async function () {
      describe("updateAllowableAuctionDurationSeconds", async function () {
        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateAllowableAuctionDurationSeconds(100, 200);
        });

        it("does not allow non-admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .updateAllowableAuctionDurationSeconds(100, 200),
            "Only Core AdminACL allowed"
          );
        });

        it("requires max > min", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .updateAllowableAuctionDurationSeconds(100, 100),
            "Only max gt min"
          );
        });

        it("requires min > 0", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .updateAllowableAuctionDurationSeconds(0, 200),
            "Only min gt 0"
          );
        });

        it("updates state with changes", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateAllowableAuctionDurationSeconds(101, 201);
          const minterConfig = await config.minter.minterConfigurationDetails();
          expect(minterConfig.minAuctionDurationSeconds_).to.equal(101);
          expect(minterConfig.maxAuctionDurationSeconds_).to.equal(201);
        });
      });

      describe("updateMinterMinBidIncrementPercentage", async function () {
        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateMinterMinBidIncrementPercentage(5);
        });

        it("does not allow non-admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .updateMinterMinBidIncrementPercentage(5),
            "Only Core AdminACL allowed"
          );
        });

        it("requires > 0", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .updateMinterMinBidIncrementPercentage(0),
            "Only gt 0"
          );
        });

        it("updates state with changes", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateMinterMinBidIncrementPercentage(6);
          const minterConfig = await config.minter.minterConfigurationDetails();
          expect(minterConfig.minterMinBidIncrementPercentage_).to.equal(6);
        });
      });

      describe("updateMinterTimeBufferSeconds", async function () {
        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateMinterTimeBufferSeconds(300);
        });

        it("does not allow non-admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .updateMinterTimeBufferSeconds(300),
            "Only Core AdminACL allowed"
          );
        });

        it("requires > 0", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .updateMinterTimeBufferSeconds(0),
            "Only gt 0"
          );
        });

        it("updates state with changes", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateMinterTimeBufferSeconds(301);
          const minterConfig = await config.minter.minterConfigurationDetails();
          expect(minterConfig.minterTimeBufferSeconds_).to.equal(301);
        });
      });
    });

    describe("Artist/Admin configuring", async function () {
      describe("resetAuctionDetails", async function () {
        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(config.projectZero);
        });

        it("allows artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(config.projectZero);
        });

        it("does not allow non-[admin|artist] to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .resetAuctionDetails(config.projectZero),
            "Only Artist or Admin ACL"
          );
        });

        it("updates state with changes with no ongoing auction", async function () {
          const config = await loadFixture(_beforeEach);
          // no ongoing token auction for project zero
          await config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(config.projectZero);
          const projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.timestampStart).to.equal(0);
          expect(projectConfig.auctionDurationSeconds).to.equal(0);
          expect(projectConfig.basePrice).to.equal(0);
          // confirm that no ongoing token auction for project zero
          expect(projectConfig.auction.initialized).to.be.false;
        });

        it("updates state with changes with an ongoing auction", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize token auction for project zero to enter state with ongoing token auction
          await initializeProjectZeroTokenZeroAuction(config);
          // reset and check state
          await config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(config.projectZero);
          const projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.timestampStart).to.equal(0);
          expect(projectConfig.auctionDurationSeconds).to.equal(0);
          expect(projectConfig.basePrice).to.equal(0);
          // ongoing token auction for project zero should be unaffected
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          expect(projectConfig.auction.tokenId).to.equal(targetToken);
          expect(projectConfig.auction.initialized).to.be.true;
        });
      });
    });

    describe("togglePurchaseToDisabled", async function () {
      it("reverts when calling (Action not supported)", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .togglePurchaseToDisabled(config.projectZero),
          "Action not supported"
        );
      });
    });

    describe("settleAuction", async function () {
      it("reverts when auction not initialized", async function () {
        const config = await loadFixture(_beforeEach);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken),
          "Auction not initialized"
        );
      });

      it("reverts when auction not ended", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize an auction
        await initializeProjectZeroTokenZeroAuction(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken),
          "Auction not yet ended"
        );
      });

      it("returns early when attempting to settle token without an auction", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize an auction for token zero
        await initializeProjectZeroTokenZeroAuction(config);
        // attempt to settle token one (which has no auction)
        const targetToken = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        const tx = await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken);
        const receipt = await tx.wait();
        // no `AuctionSettled` event emitted (by requiring zero log length)
        expect(receipt.logs.length).to.equal(0);
      });

      it("settles a completed token auction, splits revenue, and emits event", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize an auction for token zero
        await initializeProjectZeroTokenZeroAuction(config);
        // settle token zero's auction
        // advance past end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        // record balances before settle tx
        const artistBalanceBefore = await config.accounts.artist.getBalance();
        const deployerBalanceBefore =
          await config.accounts.deployer.getBalance();

        // settle token zero's auction
        await expect(
          config.minter.connect(config.accounts.user).settleAuction(targetToken)
        )
          .to.emit(config.minter, "AuctionSettled")
          .withArgs(
            targetToken,
            config.accounts.user.address,
            config.basePrice
          );
        // validate balances after settle tx
        const artistBalanceAfter = await config.accounts.artist.getBalance();
        const deployerBalanceAfter =
          await config.accounts.deployer.getBalance();
        expect(artistBalanceAfter).to.equal(
          artistBalanceBefore.add(config.basePrice.mul(90).div(100))
        );
        expect(deployerBalanceAfter).to.equal(
          deployerBalanceBefore.add(config.basePrice.mul(10).div(100))
        );
      });

      it("returns early when attempting to settle an already-settled auction", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize an auction for token zero
        await initializeProjectZeroTokenZeroAuction(config);
        // settle token zero's auction
        // advance past end of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultAuctionLengthSeconds + 1,
        ]);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken);
        // attempt to settle token zero's auction again, which should return early
        const tx = await config.minter
          .connect(config.accounts.user)
          .settleAuction(targetToken);
        const receipt = await tx.wait();
        // no `AuctionSettled` event emitted (by requiring zero log length)
        expect(receipt.logs.length).to.equal(0);
      });
    });

    describe("initializeAuction", async function () {
      it("attempts to create bid if token auction is already initialized", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeProjectZeroTokenZeroAuction(config);
        // attempt to initialize token zero's auction again, which should be smart and create a bid
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const nextBidValue = config.basePrice.mul(110).div(100);
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .initializeAuction(targetToken, { value: nextBidValue })
        )
          .to.emit(config.minter, "AuctionBid")
          .withArgs(targetToken, config.accounts.user2.address, nextBidValue);
      });

      describe("CHECKS", async function () {
        it("reverts when attempting to initialize auction after project has reached max invocations", async function () {
          const config = await loadFixture(_beforeEach);
          // limit project zero to 0 invocations
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 0);
          // attempt to initialize token zero's auction, which should revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .initializeAuction(targetToken, { value: config.basePrice }),
            "Project max has been invoked"
          );
        });

        it("reverts when project is not configured", async function () {
          const config = await loadFixture(_beforeEach);
          // reset project zero's configuration
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // attempt to initialize token zero's auction, which should revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .initializeAuction(targetToken, { value: config.basePrice }),
            "Project not configured"
          );
        });

        it("reverts when start time is in the future", async function () {
          const config = await loadFixture(_beforeEach);
          // attempt to initialize token zero's auction, which should revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          // auction start time is in the future at end of _beforeEach fixture
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .initializeAuction(targetToken, { value: config.basePrice }),
            "Only gte project start time"
          );
        });

        it("reverts if prior to existing auction being settled", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // attempt to initialize token one's auction, which should revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .initializeAuction(targetToken, { value: config.basePrice }),
            "Prior auction not yet settled"
          );
        });

        it("does not revert if previous auction is settled", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuctionAndSettle(config);
          // initializing of token one's auction should be successful
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await config.minter
            .connect(config.accounts.user)
            .initializeAuction(targetToken, { value: config.basePrice });
        });

        it("reverts if minimum bid value is not sent", async function () {
          const config = await loadFixture(_beforeEach);
          // advance time to auction start time
          await ethers.provider.send("evm_mine", [config.startTime]);
          // initialize the auction with a msg.value less than minimum bid
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .initializeAuction(targetToken, {
                value: config.basePrice.sub(1),
              }),
            "Insufficient initial bid"
          );
        });

        it("reverts if incorrect target token ID", async function () {
          const config = await loadFixture(_beforeEach);
          // advance time to auction start time
          await ethers.provider.send("evm_mine", [config.startTime]);
          // initialize the auction with target token ID of 1, which should
          // revert because token zero is the next token to be minted
          const bidValue = config.basePrice.add(1);
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString() // <--- incorrect target token ID
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .initializeAuction(targetToken, {
                value: bidValue,
              }),
            "Incorrect target token ID"
          );
        });

        // handles edge case where different minter goes past minter max invocations
        // and then the original minter attempts to initialize an auction
        it("reverts when minter max invocations is exceeded on a different minter", async function () {
          const config = await loadFixture(_beforeEach);
          // limit minter to 1 invocation
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // switch to a different minter
          const minter2 = await deployAndGet(config, "MinterSetPriceV4", [
            config.genArt721Core.address,
            config.minterFilter.address,
          ]);
          await config.minterFilter
            .connect(config.accounts.deployer)
            .addApprovedMinter(minter2.address);
          await config.minterFilter
            .connect(config.accounts.artist)
            .setMinterForProject(config.projectZero, minter2.address);
          // mint a token with minter2
          await minter2
            .connect(config.accounts.artist)
            .updatePricePerTokenInWei(config.projectZero, 0);
          await minter2
            .connect(config.accounts.artist)
            .purchase(config.projectZero);
          // switch back to SEA minter
          await config.minterFilter
            .connect(config.accounts.artist)
            .setMinterForProject(config.projectZero, config.minter.address);
          // advance time to auction start time
          await ethers.provider.send("evm_mine", [config.startTime]);
          // initialize the auction with a msg.value 1 wei greater than minimum bid
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .initializeAuction(targetToken, {
                value: config.basePrice,
              }),
            "Maximum invocations reached"
          );
        });
      });

      describe("EFFECTS", function () {
        it("updates auction state correctly when initializing a new auction", async function () {
          const config = await loadFixture(_beforeEach);
          // advance time to auction start time
          // @dev we advance time to start time - 1 so that we can initialize the auction in a block
          // with timestamp equal to startTime
          await ethers.provider.send("evm_mine", [config.startTime - 1]);
          // initialize the auction with a msg.value 1 wei greater than minimum bid
          const bidValue = config.basePrice.add(1);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.user)
            .initializeAuction(targetToken, {
              value: bidValue,
            });
          // validate auction state
          const auction = await config.minter.projectActiveAuctionDetails(
            config.projectZero
          );
          expect(auction.tokenId).to.equal(targetToken);
          expect(auction.currentBid).to.equal(bidValue);
          expect(auction.currentBidder).to.equal(config.accounts.user.address);
          expect(auction.endTime).to.equal(
            config.startTime + config.defaultAuctionLengthSeconds
          );
          expect(auction.settled).to.equal(false);
          expect(auction.initialized).to.equal(true);
        });

        it("emits event when auction is initialized", async function () {
          const config = await loadFixture(_beforeEach);
          // advance time to auction start time - 1
          // @dev so next block has timestamp equal to startTime
          await ethers.provider.send("evm_mine", [config.startTime - 1]);
          // expect event when auction is initialized
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString() // <--- incorrect target token ID
          );
          await expect(
            config.minter
              .connect(config.accounts.user)
              .initializeAuction(targetToken, {
                value: config.basePrice,
              })
          )
            .to.emit(config.minter, "AuctionInitialized")
            .withArgs(
              targetToken,
              config.accounts.user.address,
              config.basePrice,
              config.startTime + config.defaultAuctionLengthSeconds
            );
        });
      });
    });

    describe("purchase", function () {
      it("is an inactive function", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.connect(config.accounts.user).purchase(0),
          "Inactive function"
        );
      });
    });

    describe("purchaseTo", function () {
      it("is an inactive function", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(config.accounts.user.address, 0),
          "Inactive function"
        );
      });
    });
  });
}
