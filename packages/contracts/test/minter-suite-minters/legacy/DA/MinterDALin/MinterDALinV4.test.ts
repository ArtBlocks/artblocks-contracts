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

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
  requireBigNumberIsClose,
} from "../../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../../util/constants";
import { MinterDALin_Common } from "./MinterDALin.common";
import { MinterDAV1V2V3_Common } from "../MinterDAV1V2V3.common";
import { MinterDAV4_Common } from "../MinterDAV4.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

const TARGET_MINTER_NAME = "MinterDALinV4";
const TARGET_MINTER_VERSION = "v4.1.0";

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

      config.startingPrice = ethers.utils.parseEther("10");
      config.higherPricePerTokenInWei = config.startingPrice.add(
        ethers.utils.parseEther("0.1")
      );
      config.basePrice = ethers.utils.parseEther("0.05");

      config.auctionStartTimeOffset = ONE_HOUR;

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

      if (!config.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        config.startTime = block.timestamp;
      }
      config.startTime = config.startTime + ONE_DAY;

      await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
      await config.minter
        .connect(config.accounts.deployer)
        .resetAuctionDetails(config.projectZero);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime + config.auctionStartTimeOffset,
          config.startTime + config.auctionStartTimeOffset + ONE_HOUR * 2,
          config.startingPrice,
          config.basePrice
        );
      await ethers.provider.send("evm_mine", [config.startTime]);
      return config;
    }

    describe("common DALin tests", async () => {
      await MinterDALin_Common(_beforeEach);
    });

    describe("common DA V1V2V3 tests", async function () {
      await MinterDAV1V2V3_Common(_beforeEach);
    });

    describe("common DA V4 tests", async function () {
      await MinterDAV4_Common(_beforeEach);
    });

    describe("setAuctionDetails", async function () {
      it("does not unsafely cast auction time start > type(uint64).max", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        const overflowStartTime = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("64")
        );
        const overflowEndTime = overflowStartTime.add(ONE_HOUR * 2);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              overflowStartTime,
              overflowEndTime,
              config.startingPrice,
              config.basePrice
            ),
          "SafeCast: value doesn't fit in 64 bits"
        );
      });
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .setProjectMaxInvocations(config.projectZero);
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

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

        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .setProjectMaxInvocations(config.projectZero);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(syncedMaxInvocations.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.maxInvocations - 1
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
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectConfig(config.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

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
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
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
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!config.isEngine);
      });
    });

    describe("purchase", async function () {
      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        const config = await loadFixture(_beforeEach);
        // set local max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        // switch to different minter
        const setPriceFactory =
          await ethers.getContractFactory("MinterSetPriceV4");
        const setPriceMinter = await setPriceFactory.deploy(
          config.genArt721Core.address,
          config.minterFilter.address
        );
        await config.minterFilter.addApprovedMinter(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, setPriceMinter.address);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // switch back to original minter
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, config.minter.address);
        // purchase a token on the original minter
        // advance to start of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
            }),
          "Maximum invocations reached"
        );
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("calculate gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);

        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        console.log(
          "Gas cost for a successful Linear DA mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        // skip gas tests for engine, flagship is sufficient to identify gas cost changes
        if (!config.isEngine) {
          requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0138687"));
        }
      });
    });
  });
}

// single-iteration tests with mock core contract(s)
describe(`${TARGET_MINTER_NAME} tests using mock core contract(s)`, async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    return config;
  }

  describe("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter(
          config,
          coreContractName,
          "MinterFilterV1"
        );
      console.log(genArt721Core.address);
      const minterFactory = await ethers.getContractFactory(TARGET_MINTER_NAME);
      // we should revert during deployment because the core contract returns an incorrect number of return values
      // for the given coreType response
      await expectRevert(
        minterFactory.deploy(genArt721Core.address, minterFilter.address, {
          gasLimit: 30000000,
        }),
        "Unexpected revenue split bytes"
      );
    });
  });
});
