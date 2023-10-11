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

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
  requireBigNumberIsClose,
} from "../../../../util/common";

import { MinterSetPrice_ETH_Common } from "./MinterSetPrice.common";
import { MinterSetPriceV1V2V3V4_Common } from "../MinterSetPriceV1V2V3V4.common";
import { MinterSetPriceV4_Common } from "../MinterSetPriceV4.common";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
  "GenArt721CoreV3_Engine_Flex", // V3 core Engine Flex contract
];

const TARGET_MINTER_NAME = "MinterSetPriceV4";
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
      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

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
      const minterFactory = await ethers.getContractFactory(
        config.targetMinterName
      );
      config.minter1 = await minterFactory.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );

      // support common tests and also give access to config.minter1 at config.minter
      config.minter = config.minter1;
      config.isEngine = await config.minter.isEngine();

      config.minter2 = await minterFactory.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
      config.minter3 = await minterFactory.deploy(
        config.genArt721Core.address,
        config.minterFilter.address
      );
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
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectTwo);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectTwo, config.maxInvocations);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectTwo);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter1.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter2.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter3.address);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter1.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectOne, config.minter2.address);
      // We leave project three with no minter on purpose

      // set token price for first two projects on minter one
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.pricePerTokenInWei
        );
      await config.minter1
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(config.projectOne, config.pricePerTokenInWei);
      return config;
    }

    describe("common MinterSetPrice (ETH) tests", async () => {
      await MinterSetPrice_ETH_Common(_beforeEach);
    });

    describe("common MinterSetPrice V1V2V3V4 tests", async function () {
      await MinterSetPriceV1V2V3V4_Common(_beforeEach);
    });

    describe("common MinterSetPrice V4 tests", async function () {
      await MinterSetPriceV4_Common(_beforeEach);
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
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
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
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
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
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.pricePerTokenInWei,
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

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        const tx = await config.minter1
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        console.log(
          "Gas cost for a successful Ether mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        // skip gas tests for engine, flagship is sufficient to identify gas cost changes
        if (!config.isEngine) {
          requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0129093"));
        }
      });
    });

    describe("purchaseTo", async function () {
      it("does not support toggling of `purchaseToDisabled`", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter1
            .connect(config.accounts.artist)
            .togglePurchaseToDisabled(config.projectZero),
          "Action not supported"
        );
        // still allows `purchaseTo`.
        await config.minter1
          .connect(config.accounts.user)
          .purchaseTo(config.accounts.artist.address, config.projectZero, {
            value: config.pricePerTokenInWei,
          });
      });

      it("doesn't support `purchaseTo` toggling", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter1
            .connect(config.accounts.artist)
            .togglePurchaseToDisabled(config.projectZero),
          "Action not supported"
        );
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!config.isEngine);
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
