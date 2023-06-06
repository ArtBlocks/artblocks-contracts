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
} from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";

import { Minter_Common } from "../Minter.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core engine contract
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
  await config.minter.connect(config.accounts.user).createBid(targetToken, {
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

      // deploy and configure minter
      config.targetMinterName = TARGET_MINTER_NAME;
      config.minter = await deployAndGet(config, config.targetMinterName, [
        config.genArt721Core.address,
        config.minterFilter.address,
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

      // configure project zero
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

        it("allows artist to call when project is paused", async function () {
          const config = await loadFixture(_beforeEach);
          // use project one, because it has not yet been configured on the minter
          await safeAddProject(
            config.genArt721Core,
            config.accounts.deployer,
            config.accounts.artist2.address
          );
          // make project active, but not unpaused, and configure minter
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .toggleProjectIsActive(config.projectOne);
          await config.minterFilter
            .connect(config.accounts.deployer)
            .setMinterForProject(config.projectOne, config.minter.address);
          // manually limit minter max invocations, which tries to mint a token to next slot
          await config.minter
            .connect(config.accounts.artist2)
            .manuallyLimitProjectMaxInvocations(config.projectOne, 50);
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
            .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
          const localMaxInvocations = await config.minter
            .connect(config.accounts.artist)
            .projectConfig(config.projectZero);
          expect(localMaxInvocations.maxInvocations).to.equal(2);

          // mint token 2 as next token on project zero (by initializing a new token auction)
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
            .manuallyLimitProjectMaxInvocations(config.projectZero, 2);

          // expect maxInvocations on the minter to be 2
          const localMaxInvocations3 = await config.minter
            .connect(config.accounts.artist)
            .projectConfig(config.projectZero);
          expect(localMaxInvocations3.maxInvocations).to.equal(2);

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

        it("emits event", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.artist)
              .configureFutureAuctions(
                config.projectZero,
                config.startTime,
                config.defaultAuctionLengthSeconds + 1,
                config.basePrice
              )
          )
            .to.emit(config.minter, "ConfiguredFutureAuctions")
            .withArgs(
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
            "Only non-zero"
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
            "Only non-zero"
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

        it("emits event with updated values", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateAllowableAuctionDurationSeconds(101, 201)
          )
            .to.emit(config.minter, "AuctionDurationSecondsRangeUpdated")
            .withArgs(101, 201);
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
            "Only non-zero"
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

        it("emits event", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateMinterMinBidIncrementPercentage(6)
          )
            .to.emit(config.minter, "MinterMinBidIncrementPercentageUpdated")
            .withArgs(6);
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
            "Only non-zero"
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

        it("emits event", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateMinterTimeBufferSeconds(301)
          )
            .to.emit(config.minter, "MinterTimeBufferUpdated")
            .withArgs(301);
        });
      });

      describe("updateRefundGasLimit", async function () {
        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateRefundGasLimit(10_000);
        });

        it("does not allow non-admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .updateRefundGasLimit(10_000),
            "Only Core AdminACL allowed"
          );
        });

        it("requires >= 7_000", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .updateRefundGasLimit(6_999),
            "Only gte 7_000"
          );
        });

        it("updates state with changes", async function () {
          const config = await loadFixture(_beforeEach);
          await config.minter
            .connect(config.accounts.deployer)
            .updateRefundGasLimit(10_000);
          const minterConfig = await config.minter.minterConfigurationDetails();
          expect(minterConfig.minterRefundGasLimit_).to.equal(10_000);
        });

        it("emits event", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateRefundGasLimit(10_000)
          )
            .to.emit(config.minter, "MinterRefundGasLimitUpdated")
            .withArgs(10_000);
        });
      });
    });

    describe("Artist/Admin configuring", async function () {
      describe("ejectNextTokenTo", async function () {
        it("does not allow artist to call", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.artist)
              .ejectNextTokenTo(
                config.projectZero,
                config.accounts.user.address
              ),
            "Only Core AdminACL allowed"
          );
        });

        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // admin ejects next token to user
          await config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(config.projectZero, config.accounts.user.address);
        });

        it("allows admin to call", async function () {
          const config = await loadFixture(_beforeEach);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // admin ejects next token to user
          await config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(config.projectZero, config.accounts.user.address);
        });

        it("does not allow when project is still configured", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .ejectNextTokenTo(
                config.projectZero,
                config.accounts.user.address
              ),
            "Only unconfigured projects"
          );
        });

        it("does not allow when a next token is not populated", async function () {
          const config = await loadFixture(_beforeEach);
          // artist sets minter max invocations to 1
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // token 1's auction is began
          await initializeProjectZeroTokenZeroAuction(config);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // confirm no next token
          const projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.nextTokenNumberIsPopulated).to.be.false;
          // expect failure when admin attempts to eject next token
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .ejectNextTokenTo(
                config.projectZero,
                config.accounts.user.address
              ),
            "No next token"
          );
        });

        it("ejects token to the `_to` address", async function () {
          const config = await loadFixture(_beforeEach);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // admin ejects next token to user
          await config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(config.projectZero, config.accounts.user.address);
          // confirm next token is owned by user
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const tokenOwner = await config.genArt721Core.ownerOf(targetToken);
          expect(tokenOwner).to.equal(config.accounts.user.address);
        });

        it("emits `ProjectNextTokenEjected` event", async function () {
          const config = await loadFixture(_beforeEach);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // admin ejects next token to user end event is emitted
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .ejectNextTokenTo(
                config.projectZero,
                config.accounts.user.address
              )
          )
            .to.emit(config.minter, "ProjectNextTokenEjected")
            .withArgs(config.projectZero);
        });

        it("updates state: sets next token is populated to false", async function () {
          const config = await loadFixture(_beforeEach);
          // artist resets auction details
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // confirm next token is populated
          let projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.nextTokenNumberIsPopulated).to.be.true;
          // admin ejects next token to user
          await config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(config.projectZero, config.accounts.user.address);
          // confirm next token is no longer populated
          projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.nextTokenNumberIsPopulated).to.be.false;
          // expect revert if admin attempts to eject next token again
          await expectRevert(
            config.minter
              .connect(config.accounts.deployer)
              .ejectNextTokenTo(
                config.projectZero,
                config.accounts.user.address
              ),
            "No next token"
          );
        });
      });

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
          expect(projectConfig.activeAuction.currentBidder).to.equal(
            constants.ZERO_ADDRESS
          );
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
          expect(projectConfig.activeAuction.tokenId).to.equal(targetToken);
          expect(projectConfig.activeAuction.currentBidder).to.equal(
            config.accounts.user.address
          );
        });

        it("emits event", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize token auction for project zero to enter state with ongoing token auction
          await initializeProjectZeroTokenZeroAuction(config);
          // reset and check state
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .resetAuctionDetails(config.projectZero)
          )
            .to.emit(config.minter, "ResetAuctionDetails")
            .withArgs(config.projectZero);
        });
      });
    });

    describe("tryPopulateNextToken", async function () {
      it("reverts when project is not configured", async function () {
        const config = await loadFixture(_beforeEach);
        // un-configure project zero
        await config.minter
          .connect(config.accounts.artist)
          .resetAuctionDetails(config.projectZero);
        // expect revert when trying to populate next token on project zero
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .tryPopulateNextToken(config.projectZero),
          "Project not configured"
        );
      });

      it("does not revert when project is configured, and next token is already populated", async function () {
        const config = await loadFixture(_beforeEach);
        // verify next token number is populated
        const projectConfig = await config.minter.projectConfigurationDetails(
          config.projectZero
        );
        expect(projectConfig.nextTokenNumberIsPopulated).to.be.true;
        // expect no revert when trying to populate next token on project zero,
        // when one is already populated
        await config.minter
          .connect(config.accounts.artist)
          .tryPopulateNextToken(config.projectZero);
      });

      // @dev do not think it is possible to test calling tryPopulateNextToken when a next token is not populated,
      // when max invocations is reached (as the minter attempts to auto-populate next token when max invocations
      // is changed). Therefore there is no test for that case, but the function remains in the contract in case
      // of an unforseen bug or emergency situation.
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
      it("reverts when no auction initialized on project (for clear error messaging)", async function () {
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
        // verify no state change
        const projectConfig = await config.minter.projectConfigurationDetails(
          config.projectZero
        );
        expect(projectConfig.activeAuction.currentBidder).to.be.equal(
          constants.ZERO_ADDRESS
        );
      });

      it("reverts when auction not ended", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize an auction
        await initializeProjectZeroTokenZeroAuction(config);
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const projectConfig = await config.minter.projectConfigurationDetails(
          config.projectZero
        );
        expect(projectConfig.activeAuction.tokenId).to.be.equal(targetToken);
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

      it("settles a completed token auction, splits revenue, emits event, and distributes token", async function () {
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
        // artist receives 90% of base price for non-engine, 80% for engine
        const expectedArtistBalance = config.isEngine
          ? artistBalanceBefore.add(config.basePrice.mul(80).div(100))
          : artistBalanceBefore.add(config.basePrice.mul(90).div(100));
        expect(artistBalanceAfter).to.equal(expectedArtistBalance);
        expect(deployerBalanceAfter).to.equal(
          deployerBalanceBefore.add(config.basePrice.mul(10).div(100))
        );
        // verify token is owned by user
        const tokenOwner = await config.genArt721Core.ownerOf(targetToken);
        expect(tokenOwner).to.equal(config.accounts.user.address);
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

    describe("createBid w/ auction initialization", async function () {
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
            .createBid(targetToken, { value: nextBidValue })
        )
          .to.emit(config.minter, "AuctionBid")
          .withArgs(targetToken, config.accounts.user2.address, nextBidValue);
      });

      it("emits `ProjectNextTokenUpdated` if new auction is initialized", async function () {
        const config = await loadFixture(_beforeEach);
        // advance time to auction start time
        await ethers.provider.send("evm_mine", [config.startTime]);
        // someone initializes the auction
        const targetTokenAuction = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const targetTokenNext = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(targetTokenAuction, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "ProjectNextTokenUpdated")
          .withArgs(config.projectZero, targetTokenNext);
      });

      describe("CHECKS", async function () {
        it("reverts when attempting to initialize auction after project has reached max invocations", async function () {
          const config = await loadFixture(_beforeEach);
          // limit project zero to 1 invocations (0 remaining)
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // attempt to initialize token zero's auction, which not revert, but also not mint a new token
          // to the project's next token slot
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          // advance to auction start time
          await ethers.provider.send("evm_mine", [config.startTime]);
          await config.minter
            .connect(config.accounts.artist)
            .createBid(targetToken, { value: config.basePrice });
          // confirm that the project's next token slot is not populated
          const projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.nextTokenNumberIsPopulated).to.be.false;
          expect(projectConfig.nextTokenNumber).to.equal(0);
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
              .createBid(targetToken, { value: config.basePrice }),
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
              .createBid(targetToken, { value: config.basePrice }),
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
              .createBid(targetToken, { value: config.basePrice }),
            "Token ID does not match auction"
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
            .createBid(targetToken, { value: config.basePrice });
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
            config.minter.connect(config.accounts.user).createBid(targetToken, {
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
            config.minter.connect(config.accounts.user).createBid(targetToken, {
              value: bidValue,
            }),
            "Incorrect target token ID"
          );
        });

        // handles edge case where different minter goes past minter max invocations
        // and then the original minter attempts to initialize an auction
        it("reverts when minter max invocations is exceeded on a different minter", async function () {
          const config = await loadFixture(_beforeEach);
          // limit minter to 2 invocations (1 remaining)
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
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
          // initialize the auction
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, {
              value: config.basePrice,
            });
          // confirm that new token was not minted to next token number
          const projectConfig = await config.minter.projectConfigurationDetails(
            config.projectZero
          );
          expect(projectConfig.nextTokenNumberIsPopulated).to.be.false;
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
            .createBid(targetToken, {
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
            config.minter.connect(config.accounts.user).createBid(targetToken, {
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

    describe("createBid", function () {
      describe("CHECKS", function () {
        it("does not revert if auction is not initialized (i.e. auto-initializes)", async function () {
          const config = await loadFixture(_beforeEach);
          // advance time to auction start time
          await ethers.provider.send("evm_mine", [config.startTime]);
          await config.minter.connect(config.accounts.user).createBid(0, {
            value: config.basePrice,
          });
        });

        it("reverts if different token is active", async function () {
          const config = await loadFixture(_beforeEach);
          // create an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // expect bid on different token to revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await expectRevert(
            config.minter.connect(config.accounts.user).createBid(targetToken, {
              value: config.basePrice.mul(11).div(10),
            }),
            "Token ID does not match auction"
          );
        });

        it("reverts if auction has ended", async function () {
          const config = await loadFixture(_beforeEach);
          // create an auction for token zero
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // expect bid on ended auction to revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter.connect(config.accounts.user).createBid(targetToken, {
              value: config.basePrice.mul(11).div(10),
            }),
            "Auction already ended"
          );
        });

        it("reverts if bid is not sufficiently greater than current bid", async function () {
          const config = await loadFixture(_beforeEach);
          // create an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // expect bid that is not sufficiently greater than current bid to revert
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          await expectRevert(
            config.minter.connect(config.accounts.user).createBid(targetToken, {
              value: config.basePrice.mul(105).div(100).sub(1),
            }),
            "Bid is too low"
          );
          // expect bid that meets minimum bid requirement to succeed
          // @dev default is 5% increase on contract
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, {
              value: config.basePrice.mul(105).div(100),
            });
        });

        it("reverts if need to initialize auction, but no next token number is available", async function () {
          const config = await loadFixture(_beforeEach);
          // artist limits number of tokens to 1
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // advance time to auction start time
          await initializeProjectZeroTokenZeroAuctionAndSettle(config);
          // expect bid on token two to revert
          const targetTokenOne = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              .createBid(targetTokenOne, {
                value: config.basePrice.mul(11).div(10),
              }),
            "No next token, check max invocations"
          );
        });
      });

      describe("EFFECTS", function () {
        it("updates auction state correctly when creating a new bid that does not extend auction", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // create a bid that does not extend auction
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const newBidValue = config.basePrice.mul(11).div(10);
          const bidder = config.accounts.user2;
          await config.minter.connect(bidder).createBid(targetToken, {
            value: newBidValue,
          });
          // validate auction state
          const auction = await config.minter.projectActiveAuctionDetails(
            config.projectZero
          );
          expect(auction.tokenId).to.equal(targetToken);
          expect(auction.currentBid).to.equal(newBidValue);
          expect(auction.currentBidder).to.equal(bidder.address);
          expect(auction.endTime).to.equal(
            config.startTime + config.defaultAuctionLengthSeconds
          );
          expect(auction.settled).to.equal(false);
        });

        it("updates auction state correctly when creating a new bid that does extend auction", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);

          // validate initial auction state
          const auctionInitial =
            await config.minter.projectActiveAuctionDetails(config.projectZero);
          expect(auctionInitial.endTime).to.equal(
            config.startTime + config.defaultAuctionLengthSeconds
          );

          // admin configure buffer time
          const bufferTime = 42;
          await config.minter
            .connect(config.accounts.deployer)
            .updateMinterTimeBufferSeconds(bufferTime);

          // create a bid that does extend auction
          const newBidTime =
            config.startTime + config.defaultAuctionLengthSeconds - 5; // <--- 5 seconds before auction end
          // @dev advance to 1 second before new bid time so bid is placed in block with new bid time
          await ethers.provider.send("evm_mine", [newBidTime - 1]);
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const newBidValue = config.basePrice.mul(11).div(10);
          const bidder = config.accounts.user2;
          await config.minter.connect(bidder).createBid(targetToken, {
            value: newBidValue,
          });
          // validate new auction state
          const auction = await config.minter.projectActiveAuctionDetails(
            config.projectZero
          );
          expect(auction.tokenId).to.equal(targetToken);
          expect(auction.currentBid).to.equal(newBidValue);
          expect(auction.currentBidder).to.equal(bidder.address);
          expect(auction.endTime).to.equal(newBidTime + bufferTime);
          expect(auction.settled).to.equal(false);
        });

        it("emits a AuctionBid event", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // expect new bid to emit a AuctionBid event
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const newBidValue = config.basePrice.mul(11).div(10);
          const bidder = config.accounts.user2;
          await expect(
            config.minter.connect(bidder).createBid(targetToken, {
              value: newBidValue,
            })
          )
            .to.emit(config.minter, "AuctionBid")
            .withArgs(targetToken, bidder.address, newBidValue);
        });

        it("returns bid funds to previous bidder when outbid", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // record initial bidder balance
          const initialBidderBalance = await config.accounts.user.getBalance();
          // create a bid that should return funds to previous bidder
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const newBidValue = config.basePrice.mul(11).div(10);
          await config.minter
            .connect(config.accounts.user2)
            .createBid(targetToken, {
              value: newBidValue,
            });
          // verify that revious bidder was returned funds
          const newInitialBidderBalance =
            await config.accounts.user.getBalance();
          expect(newInitialBidderBalance).to.equal(
            initialBidderBalance.add(config.basePrice)
          );
        });

        it("force-returns bid funds to previous bidder via SENDALL fallback when outbid to a dead receiver", async function () {
          const config = await loadFixture(_beforeEach);
          const deadReceiverBidder = await deployAndGet(
            config,
            "DeadReceiverBidderMock",
            []
          );
          // initialize an auction for token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // place bid with dead receiver mock
          const targetToken = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const bid2Value = config.basePrice.mul(11).div(10);
          await deadReceiverBidder
            .connect(config.accounts.user2)
            .createBidOnAuction(config.minter.address, targetToken, {
              value: bid2Value,
            });
          // verify that the dead receiver mock received the funds as ETH fallback
          // when they are outbid
          const deadReceiverBalanceBefore = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          const Bid3Value = bid2Value.mul(11).div(10);
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, {
              value: Bid3Value,
            });
          const deadReceiverBalanceAfter = await ethers.provider.getBalance(
            deadReceiverBidder.address
          );
          // change in balance should be equal to bid2Value
          expect(
            deadReceiverBalanceAfter.sub(deadReceiverBalanceBefore)
          ).to.equal(bid2Value);
        });
      });
    });

    describe("settleAuctionAndCreateBid", function () {
      it("requires settle token and bid token be in same project", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // expect revert when calling settleAuctionAndCreateBid with tokens from different projects
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const initializeTokenId = BigNumber.from(
          config.projectOneTokenZero.toString()
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user2)
            .settleAuctionAndCreateBid(settleTokenId, initializeTokenId, {
              value: config.basePrice,
            }),
          "Only tokens in same project"
        );
      });

      it("settles and initializes an auction", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // verify that the auction has not been settled
        const auction = await config.minter.projectActiveAuctionDetails(
          config.projectZero
        );
        expect(auction.settled).to.equal(false);
        // settle and initialize a new auction
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const initializeTokenId = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .settleAuctionAndCreateBid(settleTokenId, initializeTokenId, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "AuctionSettled")
          .withArgs(
            settleTokenId,
            config.accounts.user.address,
            config.basePrice
          );
        // verify that a new auction has been initialized for token ID 1
        const newAuction = await config.minter.projectActiveAuctionDetails(
          config.projectZero
        );
        expect(newAuction.tokenId).to.equal(initializeTokenId);
        expect(newAuction.currentBid).to.equal(config.basePrice);
        expect(newAuction.currentBidder).to.equal(
          config.accounts.user2.address
        );
        expect(newAuction.settled).to.equal(false);
        // minted next token and populated in project config
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.nextTokenNumberIsPopulated).to.equal(true);
        const targetNextTokenId = BigNumber.from(
          config.projectZeroTokenTwo.toString()
        );
        expect(
          projectConfig.nextTokenNumber + config.projectZero * 1_000_000
        ).to.equal(targetNextTokenId);
      });

      it("initializes new auction when frontrun by another settlement", async function () {
        const config = await loadFixture(_beforeEach);

        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // a different user settles the auction
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter.settleAuction(settleTokenId);
        // settle and initialize a new auction still initializes a new auction
        const initializeTokenId = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        // advance to new time
        const newTargetTime =
          config.startTime + config.defaultAuctionLengthSeconds + 100;
        await ethers.provider.send("evm_mine", [newTargetTime - 1]);
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .settleAuctionAndCreateBid(settleTokenId, initializeTokenId, {
              value: config.basePrice,
            })
        )
          .to.emit(config.minter, "AuctionInitialized")
          .withArgs(
            initializeTokenId,
            config.accounts.user2.address,
            config.basePrice,
            newTargetTime + config.defaultAuctionLengthSeconds
          );
        // minted next token and populated in project config
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.nextTokenNumberIsPopulated).to.equal(true);
        const targetNextTokenId = BigNumber.from(
          config.projectZeroTokenTwo.toString()
        );
        expect(
          projectConfig.nextTokenNumber + config.projectZero * 1_000_000
        ).to.equal(targetNextTokenId);
      });

      it("attempts to place new bid when frontrun by another settlement and auction initialization", async function () {
        const config = await loadFixture(_beforeEach);

        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // a different user settles the auction
        const settleTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter.settleAuction(settleTokenId);
        // a different user initializes a new auction
        const initializeTokenId = BigNumber.from(
          config.projectZeroTokenOne.toString()
        );
        await config.minter
          .connect(config.accounts.additional)
          .createBid(initializeTokenId, {
            value: config.basePrice,
          });
        // settle and initialize a new auction still attempts to place a new bid on the new auction
        // advance to new time
        const newValidBidValue = config.basePrice.mul(11).div(10);
        await expect(
          config.minter
            .connect(config.accounts.user2)
            .settleAuctionAndCreateBid(settleTokenId, initializeTokenId, {
              value: newValidBidValue,
            })
        )
          .to.emit(config.minter, "AuctionBid")
          .withArgs(
            initializeTokenId,
            config.accounts.user2.address,
            newValidBidValue
          );
      });
    });

    describe("handles next token well when project reaches max invocations", function () {
      it("auto-populates next token number when project max invocations are manually increased", async function () {
        const config = await loadFixture(_beforeEach);
        // set project max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // confirm that next token number is not populated
        const initialProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(initialProjectConfig.nextTokenNumberIsPopulated).to.equal(false);
        // artist increases max invocations
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        // confirm that next token number is populated
        const updatedProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(updatedProjectConfig.nextTokenNumberIsPopulated).to.equal(true);
      });

      it("auto-populates next token number when project max invocations are synced to core contract value", async function () {
        const config = await loadFixture(_beforeEach);
        // set project max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        // initialize and advance to end of auction for token zero
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // confirm that next token number is not populated
        const initialProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(initialProjectConfig.nextTokenNumberIsPopulated).to.equal(false);
        // artist increases max invocations to equal core contract value
        await config.minter
          .connect(config.accounts.artist)
          .setProjectMaxInvocations(config.projectZero);
        // confirm that next token number is populated
        const updatedProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(updatedProjectConfig.nextTokenNumberIsPopulated).to.equal(true);
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

    describe("view functions", function () {
      describe("getTokenToBid", function () {
        it("reverts when project has already reached max invocations on core contract, and no active auction", async function () {
          const config = await loadFixture(_beforeEach);
          // set project max invocations to 1 on core contract
          await config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectMaxInvocations(config.projectZero, 1);
          // initialize auction, which mints token zero
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // view function to get next token ID should revert, since there is no next token, and current auction has
          // reached end time
          await expectRevert(
            config.minter.getTokenToBid(config.projectZero),
            "Next token not populated"
          );
        });

        it("reverts when project has already reached max invocations on minter, and no active auction", async function () {
          const config = await loadFixture(_beforeEach);
          // set project max invocations to 1 on minter
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // initialize auction, which mints token zero
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // view function to get next token ID should revert, since project has reached max invocations on minter
          await expectRevert(
            config.minter.getTokenToBid(config.projectZero),
            "Next token not populated"
          );
        });

        it("returns current token auction when project has already reached max invocations on core contract, but there is an active auction", async function () {
          const config = await loadFixture(_beforeEach);
          // set project max invocations to 1 on core contract
          await config.genArt721Core
            .connect(config.accounts.artist)
            .updateProjectMaxInvocations(config.projectZero, 1);
          // initialize auction, which mints token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // view function to get next token ID should revert, since project has reached max invocations
          const targetExpectedTokenId = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const returnedTokenId = await config.minter.getTokenToBid(
            config.projectZero
          );
          expect(returnedTokenId).to.equal(targetExpectedTokenId);
        });

        it("returns the next expected token ID when no auction ever initialized on project", async function () {
          const config = await loadFixture(_beforeEach);
          const targetExpectedTokenId = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const returnedExpectedTokenId = await config.minter.getTokenToBid(
            config.projectZero
          );
          expect(returnedExpectedTokenId).to.equal(targetExpectedTokenId);
        });

        it("returns the next expected token ID when active auction has reached end time", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize auction, which mints token zero
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          const targetExpectedTokenId = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          const returnedExpectedTokenId = await config.minter.getTokenToBid(
            config.projectZero
          );
          expect(returnedExpectedTokenId).to.equal(targetExpectedTokenId);
        });
      });

      describe("getNextTokenId", function () {
        it("reverts when next token is not populated", async function () {
          const config = await loadFixture(_beforeEach);
          // set project max invocations to 1
          await config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
          // initialize auction, which mints token zero
          await initializeProjectZeroTokenZeroAuction(config);
          // view function to get next token ID should revert, since project has reached max invocations
          // and next token is not populated
          await expectRevert(
            config.minter.getNextTokenId(config.projectZero),
            "Next token not populated"
          );
        });

        it("reverts when a project is not initialized", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter.getNextTokenId(config.projectOne),
            "Next token not populated"
          );
        });

        it("returns the next token ID when next token is populated", async function () {
          const config = await loadFixture(_beforeEach);
          // initialize auction, which mints token zero and populates next token
          await initializeProjectZeroTokenZeroAuction(config);
          const targetNextTokenId = BigNumber.from(
            config.projectZeroTokenOne.toString()
          );
          const returnedNextTokenId = await config.minter.getNextTokenId(
            config.projectZero
          );
          expect(returnedNextTokenId).to.equal(targetNextTokenId);
        });
      });

      describe("getPriceInfo", function () {
        it("returns currency symbol and address as ETH and 0x0, respecively", async function () {
          const config = await loadFixture(_beforeEach);
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.currencySymbol).to.equal("ETH");
          expect(returnedPriceInfo.currencyAddress).to.equal(
            constants.ZERO_ADDRESS
          );
        });

        it("returns as unconfigured if project is reset and no auction ever initialized", async function () {
          const config = await loadFixture(_beforeEach);
          // reset project
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // unconfigured price info should be returned
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.isConfigured).to.equal(false);
          expect(returnedPriceInfo.tokenPriceInWei).to.equal(0);
        });

        it("returns with auction base price if project is configured, but token auction never initialized", async function () {
          const config = await loadFixture(_beforeEach);
          // configured price info should be returned
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.isConfigured).to.equal(true);
          expect(returnedPriceInfo.tokenPriceInWei).to.equal(
            config.basePrice.toString()
          );
        });

        it("returns with auction base price if project is configured, and current token auction has reached end time", async function () {
          const config = await loadFixture(_beforeEach);
          await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
          // configured price info should be returned
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.isConfigured).to.equal(true);
          expect(returnedPriceInfo.tokenPriceInWei).to.equal(
            config.basePrice.toString()
          );
        });

        it("returns with current bid price + minimum bid increment if project is configured, and has active token auction", async function () {
          const config = await loadFixture(_beforeEach);
          await initializeProjectZeroTokenZeroAuction(config);
          // next bid should be at least 5% above current bid
          const minimumSubsequentBid = config.basePrice.mul(105).div(100);
          // configured price info should be returned
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.isConfigured).to.equal(true);
          expect(returnedPriceInfo.tokenPriceInWei).to.equal(
            minimumSubsequentBid.toString()
          );
        });

        it("returns with current bid price + minimum bid increment if project is NOT configured, and has active token auction", async function () {
          const config = await loadFixture(_beforeEach);
          await initializeProjectZeroTokenZeroAuction(config);
          // reset project
          await config.minter
            .connect(config.accounts.artist)
            .resetAuctionDetails(config.projectZero);
          // next bid should be at least 5% above current bid
          const minimumSubsequentBid = config.basePrice.mul(105).div(100);
          // configured price info should be returned
          const returnedPriceInfo = await config.minter.getPriceInfo(
            config.projectZero
          );
          expect(returnedPriceInfo.isConfigured).to.equal(true);
          expect(returnedPriceInfo.tokenPriceInWei).to.equal(
            minimumSubsequentBid.toString()
          );
        });
      });

      describe("projectActiveAuctionDetails", function () {
        it("reverts if no auction ever initialized on project", async function () {
          const config = await loadFixture(_beforeEach);
          await expectRevert(
            config.minter.projectActiveAuctionDetails(config.projectZero),
            "No auction exists on project"
          );
        });

        it("returns expected values when an auction exists", async function () {
          const config = await loadFixture(_beforeEach);
          await initializeProjectZeroTokenZeroAuction(config);
          const auctionDetails =
            await config.minter.projectActiveAuctionDetails(config.projectZero);
          expect(auctionDetails.tokenId).to.equal(
            config.projectZeroTokenZero.toString()
          );
        });
      });
    });

    describe("reentrancy", function () {
      describe("createBid_l34", function () {
        it("is nonReentrant", async function () {
          const config = await loadFixture(_beforeEach);
          const autoBidder = await deployAndGet(
            config,
            "ReentrancySEAAutoBidderMock",
            []
          );
          // initialize auction via the auto bidder
          await ethers.provider.send("evm_mine", [config.startTime - 1]);
          const targetTokenId = BigNumber.from(
            config.projectZeroTokenZero.toString()
          );
          const initialBidValue = config.basePrice;
          await autoBidder.attack(
            targetTokenId,
            config.minter.address,
            initialBidValue,
            { value: config.basePrice.mul(5) }
          );
          const autoBidderBalanceBeforeRefund =
            await ethers.provider.getBalance(autoBidder.address);
          // when outbid, check that auto bidder does not attain reentrancy or DoS attack
          const bid2Value = config.basePrice.mul(110).div(100);
          await config.minter
            .connect(config.accounts.user)
            .createBid(targetTokenId, { value: bid2Value });
          // verify that user is the leading bidder, not the auto bidder
          const auctionDetails =
            await config.minter.projectActiveAuctionDetails(config.projectZero);
          expect(auctionDetails.currentBidder).to.equal(
            config.accounts.user.address
          );
          // verify that the auto bidder received their bid back in ETH
          const autoBidderBalanceAfterRefund = await ethers.provider.getBalance(
            autoBidder.address
          );
          expect(
            autoBidderBalanceAfterRefund.sub(autoBidderBalanceBeforeRefund)
          ).to.equal(initialBidValue);
        });
      });

      describe("settleAuction", function () {
        it("nonReentrant commentary", async function () {
          console.log(
            "This nonReentrant modifier is implemented to achieve dual redundancy, and therefore is not tested with mock attacking contracts.",
            "Primary protection of the function is achieved by following a check-effects-interactions pattern.",
            "This is considered sufficient for the purposes of this test suite."
          );
        });
      });
    });

    describe("denial of service / extreme gas usage attack", function () {
      it("limits gas consumption when refunding bids with ETH", async function () {
        const config = await loadFixture(_beforeEach);
        // deploy gas limit bidder
        const gasLimitBidder = await deployAndGet(
          config,
          "GasLimitReceiverBidderMock",
          []
        );

        // initialize auction via the gas limit receiver mock
        await ethers.provider.send("evm_mine", [config.startTime - 1]);
        const targetTokenId = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        const initialBidValue = config.basePrice;
        await gasLimitBidder.createBidOnAuction(
          config.minter.address,
          targetTokenId,
          { value: initialBidValue }
        );
        const gasLimitBidderBalanceBeforeRefund =
          await ethers.provider.getBalance(gasLimitBidder.address);
        // when outbid, check that gas limit receiver does not use more than 200k gas
        const bid2Value = config.basePrice.mul(110).div(100);
        const tx = await config.minter
          .connect(config.accounts.user)
          .createBid(targetTokenId, { value: bid2Value });
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lte(200000);
        // verify state after bid 2 is as expected
        // verify that user is the leading bidder, not the auto bidder
        const auctionDetails = await config.minter.projectActiveAuctionDetails(
          config.projectZero
        );
        expect(auctionDetails.currentBidder).to.equal(
          config.accounts.user.address
        );
        // verify that the auto bidder received their bid back in ETH
        const gasLimitBidderBalanceAfterRefund =
          await ethers.provider.getBalance(gasLimitBidder.address);
        expect(
          gasLimitBidderBalanceAfterRefund.sub(
            gasLimitBidderBalanceBeforeRefund
          )
        ).to.equal(initialBidValue);
      });
    });
  });
}
