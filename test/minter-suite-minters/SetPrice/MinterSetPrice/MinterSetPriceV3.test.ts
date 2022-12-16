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
import { MinterSetPriceV1V2_Common } from "../MinterSetPriceV1V2.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
];

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V3 core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`MinterSetPriceV3_${coreContractName}`, async function () {
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

      this.targetMinterName = "MinterSetPriceV3";
      const minterFactory = await ethers.getContractFactory(
        this.targetMinterName
      );
      this.minter1 = await minterFactory.deploy(
        this.genArt721Core.address,
        this.minterFilter.address
      );

      // support common tests and also give access to this.minter1 at this.minter
      this.minter = this.minter1;

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

    describe("common MinterSetPrice V1V2 tests", async function () {
      await MinterSetPriceV1V2_Common();
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("allows user to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.user)
          .setProjectMaxInvocations(this.projectZero);
      });
    });

    describe("manuallySetProjectMaxInvocations", async function () {
      it("allows artist to call manuallySetProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .manuallySetProjectMaxInvocations(
            this.projectZero,
            this.maxInvocations - 1
          );
      });
      it("does not support manually setting project max invocations to be greater than the project max invocations set on the core contract", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .manuallySetProjectMaxInvocations(
              this.projectZero,
              this.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
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
        expect(txCost.toString()).to.equal(
          ethers.utils.parseEther("0.0128905")
        ); // assuming a cost of 100 GWEI
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
  });
}
