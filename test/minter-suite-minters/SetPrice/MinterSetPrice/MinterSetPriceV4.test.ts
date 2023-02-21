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

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";

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
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V3 core contracts, both flagship and explorations.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${TARGET_MINTER_NAME}_${coreContractName}`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);
      this.higherPricePerTokenInWei = this.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

      // deploy and configure minter filter and minter
      ({
        genArt721Core: this.genArt721Core,
        minterFilter: this.minterFilter,
        randomizer: this.randomizer,
      } = await deployCoreWithMinterFilter.call(
        this,
        coreContractName,
        "MinterFilterV1"
      ));

      this.targetMinterName = TARGET_MINTER_NAME;
      const minterFactory = await ethers.getContractFactory(
        this.targetMinterName
      );
      this.minter1 = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );

      // support common tests and also give access to this.minter1 at this.minter
      this.minter = this.minter1;
      this.isEngine = await this.minter.isEngine();

      this.minter2 = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      this.minter3 = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );
      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectTwo);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectZero, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectOne, this.maxInvocations);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .updateProjectMaxInvocations(this.projectTwo, this.maxInvocations);

      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectZero);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectOne);
      await this.genArt721Core
        .connect(this.accounts.artist)
        .toggleProjectIsPaused(this.projectTwo);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter1.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter2.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .addApprovedMinter(this.minter3.address);

      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter1.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectOne, this.minter2.address);
      // We leave project three with no minter on purpose

      // set token price for first two projects on minter one
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter1
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);
    });

    describe("common MinterSetPrice (ETH) tests", async () => {
      await MinterSetPrice_ETH_Common();
    });

    describe("common MinterSetPrice V1V2V3V4 tests", async function () {
      await MinterSetPriceV1V2V3V4_Common();
    });

    describe("common MinterSetPrice V4 tests", async function () {
      await MinterSetPriceV4_Common();
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);
        const localMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(syncedMaxInvocations.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("allows artist to call manuallyLimitProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            this.maxInvocations - 1
          );
      });
      it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              this.projectZero,
              this.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
      });
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);
        const localMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 3);

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await this.minter
          .connect(this.accounts.artist)
          .projectConfig(this.projectZero);
        expect(localMaxInvocations3.maxInvocations).to.equal(1);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });
    });

    describe("purchase", async function () {
      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        // set local max invocations to 1
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);
        // switch to different minter
        const setPriceFactory = await ethers.getContractFactory(
          "MinterSetPriceV4"
        );
        const setPriceMinter = await setPriceFactory.deploy(
          this.genArt721Core.address,
          this.minterFilter.address
        );
        await this.minterFilter.addApprovedMinter(setPriceMinter.address);
        await this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(0, setPriceMinter.address);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(this.accounts.artist)
          .updatePricePerTokenInWei(
            this.projectZero,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(this.accounts.artist)
          .purchase(this.projectZero);
        // switch back to original minter
        await this.minterFilter
          .connect(this.accounts.artist)
          .setMinterForProject(0, this.minter.address);
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
          "Maximum invocations reached"
        );
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const minterVersion = await this.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const tx = await this.minter1
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();
        console.log(
          "Gas cost for a successful Ether mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        if (this.isEngine) {
<<<<<<< HEAD
          if (coreContractName.includes("Flex")) {
            expect(txCost.toString()).to.equal(
              ethers.utils.parseEther("0.0141361")
            );
          } else {
            expect(txCost.toString()).to.equal(
              ethers.utils.parseEther("0.0141383")
            );
          }
=======
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.0141411")
          );
>>>>>>> main
        } else {
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.0129073")
          );
        }
      });
    });

    describe("purchaseTo", async function () {
      it("does not support toggling of `purchaseToDisabled`", async function () {
        await expectRevert(
          this.minter1
            .connect(this.accounts.artist)
            .togglePurchaseToDisabled(this.projectZero),
          "Action not supported"
        );
        // still allows `purchaseTo`.
        await this.minter1
          .connect(this.accounts.user)
          .purchaseTo(this.accounts.artist.address, this.projectZero, {
            value: this.pricePerTokenInWei,
          });
      });

      it("doesn't support `purchaseTo` toggling", async function () {
        await expectRevert(
          this.minter1
            .connect(this.accounts.artist)
            .togglePurchaseToDisabled(this.projectZero),
          "Action not supported"
        );
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const coreType = await this.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!this.isEngine);
      });
    });
  });
}

// single-iteration tests with mock core contract(s)
describe(`${TARGET_MINTER_NAME} tests using mock core contract(s)`, async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
  });

  describe("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter.call(
          this,
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
