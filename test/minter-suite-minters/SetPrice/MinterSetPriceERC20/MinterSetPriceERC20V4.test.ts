import { expect } from "chai";
import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";

import { MinterSetPriceERC20_Common } from "./MinterSetPriceERC20.common";
import { MinterSetPriceV1V2V3V4_Common } from "../MinterSetPriceV1V2V3V4.common";
import { MinterSetPriceV4_Common } from "../MinterSetPriceV4.common";

import { BigNumber } from "ethers";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
];

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V3 core contracts, both flagship and engine.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`MinterSetPriceERC20V4_${coreContractName}`, async function () {
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

      this.targetMinterName = "MinterSetPriceERC20V4";
      const minterFactory = await ethers.getContractFactory(
        this.targetMinterName
      );
      this.minter = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );
      this.isEngine = await this.minter.isEngine();

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
        .addApprovedMinter(this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectZero, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectOne, this.minter.address);
      await this.minterFilter
        .connect(this.accounts.deployer)
        .setMinterForProject(this.projectTwo, this.minter.address);

      // set token price for projects zero and one on minter
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectZero, this.pricePerTokenInWei);
      await this.minter
        .connect(this.accounts.artist)
        .updatePricePerTokenInWei(this.projectOne, this.pricePerTokenInWei);

      // mock ERC20 token
      const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
      this.ERC20Mock = await ERC20Factory.connect(this.accounts.user).deploy(
        ethers.utils.parseEther("100")
      );
    });

    describe("common MinterSetPrice (ETH) tests", async () => {
      await MinterSetPriceERC20_Common();
    });

    describe("common MinterSetPrice V1V2V3 tests", async function () {
      await MinterSetPriceV1V2V3V4_Common();
    });

    describe("common MinterSetPrice V4 tests", async function () {
      await MinterSetPriceV4_Common();
    });

    describe("updatePricePerTokenInWei", async function () {
      it("does not allow price update to be zero", async function () {
        // does allow artist
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .updatePricePerTokenInWei(this.projectZero, 0),
          "Price may not be 0"
        );
      });
    });

    describe("purchase", async function () {
      it("requires sufficient ERC20 token approval", async function () {
        // artist changes to Mock ERC20 token
        await this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "MOCK",
            this.ERC20Mock.address
          );
        // approve contract and able to mint with Mock token, but insufficient qty approved
        await this.ERC20Mock.connect(this.accounts.user).approve(
          this.minter.address,
          this.pricePerTokenInWei.sub(1)
        );
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero),
          "insufficient funds for intrinsic transaction cost"
        );
      });

      it("handles ERC20 splits when platform and artist have zero revenues", async function () {
        // artist changes to Mock ERC20 token
        await this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "MOCK",
            this.ERC20Mock.address
          );
        // approve contract and able to mint with Mock token
        await this.ERC20Mock.connect(this.accounts.user).approve(
          this.minter.address,
          this.pricePerTokenInWei
        );
        // update platform to zero percent
        if (this.isEngine) {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateProviderPrimarySalesPercentages(0, 0);
        } else {
          await this.genArt721Core
            .connect(this.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(0);
        }
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          // @dev 100% to additional, 0% to artist, to induce zero artist payment value
          100,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect successful purchase of token
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero);
      });

      it("Engine: handles ERC20 splits when every party receives revenues", async function () {
        if (!this.isEngine) {
          console.log("skipping Engine-specific test");
          return;
        }
        // artist changes to Mock ERC20 token
        await this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "MOCK",
            this.ERC20Mock.address
          );
        // approve contract and able to mint with Mock token
        await this.ERC20Mock.connect(this.accounts.user).approve(
          this.minter.address,
          this.pricePerTokenInWei
        );
        // update 10 and 11 percent to render provider and engine platform provider, respectively
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateProviderPrimarySalesPercentages(10, 11);
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional2.address,
          // @dev 49% to additional, 51% to artist, to induce payment to all parties
          49,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        const artistOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.artist.address
        );
        const additional2OriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional2.address
        );
        const deployerOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.deployer.address
        );
        // additional is platform provider on engine tests
        const additionalOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional.address
        );
        // expect successful purchase of token
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero);
        // confirm balances
        const artistNewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.artist.address
        );
        const additional2NewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional2.address
        );
        const deployerNewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.deployer.address
        );
        const additionalNewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional.address
        );
        // calculate balance changes
        const artistBalanceChange = artistNewBalance.sub(artistOriginalBalance);
        const additional2BalanceChange = additional2NewBalance.sub(
          additional2OriginalBalance
        );
        const deployerBalanceChange = deployerNewBalance.sub(
          deployerOriginalBalance
        );
        const additionalBalanceChange = additionalNewBalance.sub(
          additionalOriginalBalance
        );
        // calculate target balance changes
        const targetRenderProviderRevenue = this.pricePerTokenInWei
          .mul(10)
          .div(100);
        const targetPlatformProviderRevenue = this.pricePerTokenInWei
          .mul(11)
          .div(100);
        const remainingfunds = this.pricePerTokenInWei
          .sub(targetRenderProviderRevenue)
          .sub(targetPlatformProviderRevenue);
        const targetAdditional2Revenue = remainingfunds.mul(49).div(100);
        const targetArtistRevenue = remainingfunds.sub(
          targetAdditional2Revenue
        );
        // expect balance changes to be as expected
        expect(artistBalanceChange).to.equal(targetArtistRevenue);
        expect(additional2BalanceChange).to.equal(targetAdditional2Revenue);
        expect(deployerBalanceChange).to.equal(targetRenderProviderRevenue);
        expect(additionalBalanceChange).to.equal(targetPlatformProviderRevenue);
      });

      it("Flagship: handles ERC20 splits when every party receives revenues", async function () {
        if (this.isEngine) {
          console.log("skipping Flagship-specific test");
          return;
        }
        // artist changes to Mock ERC20 token
        await this.minter
          .connect(this.accounts.artist)
          .updateProjectCurrencyInfo(
            this.projectZero,
            "MOCK",
            this.ERC20Mock.address
          );
        // approve contract and able to mint with Mock token
        await this.ERC20Mock.connect(this.accounts.user).approve(
          this.minter.address,
          this.pricePerTokenInWei
        );
        // update 10 percent to render provider
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(10);
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional2.address,
          // @dev 49% to additional, 51% to artist, to induce payment to all parties
          49,
          this.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for this test
          50,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        const artistOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.artist.address
        );
        const additional2OriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional2.address
        );
        const deployerOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.deployer.address
        );
        // additional is platform provider on engine tests
        const additionalOriginalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional.address
        );
        // expect successful purchase of token
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero);
        // confirm balances
        const artistNewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.artist.address
        );
        const additional2NewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional2.address
        );
        const deployerNewBalance = await this.ERC20Mock.balanceOf(
          this.accounts.deployer.address
        );
        // calculate balance changes
        const artistBalanceChange = artistNewBalance.sub(artistOriginalBalance);
        const additional2BalanceChange = additional2NewBalance.sub(
          additional2OriginalBalance
        );
        const deployerBalanceChange = deployerNewBalance.sub(
          deployerOriginalBalance
        );
        // calculate target balance changes
        const targetRenderProviderRevenue = this.pricePerTokenInWei
          .mul(10)
          .div(100);
        const remainingfunds = this.pricePerTokenInWei.sub(
          targetRenderProviderRevenue
        );
        const targetAdditional2Revenue = remainingfunds.mul(49).div(100);
        const targetArtistRevenue = remainingfunds.sub(
          targetAdditional2Revenue
        );
        // expect balance changes to be as expected
        expect(artistBalanceChange).to.equal(targetArtistRevenue);
        expect(additional2BalanceChange).to.equal(targetAdditional2Revenue);
        expect(deployerBalanceChange).to.equal(targetRenderProviderRevenue);
      });
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

    describe("calculates gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const tx = await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectOne, {
            value: this.pricePerTokenInWei,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();

        console.log(
          "Gas cost for a successful ERC20 mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        if (this.isEngine) {
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.0141492")
          );
        } else {
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.0129174")
          );
        }
      });
    });

    describe("purchaseTo", async function () {});

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const coreType = await this.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!this.isEngine);
      });
    });
  });
}

// single-iteration tests

describe(`MinterSetPriceERC20V4 tests not dependent on tested cores`, async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
  });

  describe.only("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const minterFilterName = "MinterFilterV1";
      const minterName = "MinterSetPriceERC20V4";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter.call(
          this,
          coreContractName,
          "MinterFilterV1"
        );
      console.log(genArt721Core.address);
      const minterFactory = await ethers.getContractFactory(
        "MinterSetPriceERC20V4"
      );
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
