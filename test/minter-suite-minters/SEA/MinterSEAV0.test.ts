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
async function initializeProjectZeroTokenZeroAuction(config: T_Config) {
  // advance time to auction start time
  await ethers.provider.send("evm_mine", [config.startTime]);
  // someone initializes the auction
  const targetToken = BigNumber.from(config.projectZeroTokenZero.toString());
  await config.minter.initializeAuction(targetToken, {
    value: config.basePrice,
  });
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
  });
}
