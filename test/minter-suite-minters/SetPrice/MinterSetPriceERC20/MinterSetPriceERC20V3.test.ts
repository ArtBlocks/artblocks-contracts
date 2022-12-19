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
import { MinterSetPriceV1V2_Common } from "../MinterSetPriceV1V2.common";
import { BigNumber } from "ethers";

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
  describe(`MinterSetPriceERC20V2_${coreContractName}`, async function () {
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

      this.targetMinterName = "MinterSetPriceERC20V3";
      const minterFactory = await ethers.getContractFactory(
        this.targetMinterName
      );
      this.minter = await minterFactory.deploy(
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

    describe("common MinterSetPrice V1V2 tests", async function () {
      await MinterSetPriceV1V2_Common();
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
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .updateArtblocksPrimarySalesPercentage(0);
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

    describe("additional payee payments with ERC20", async function () {
      it("handles additional payee payments with ERC20", async function () {
        const valuesToUpdateTo = [
          this.projectZero,
          this.accounts.artist.address,
          this.accounts.additional.address,
          50,
          this.accounts.additional2.address,
          51,
        ];
        await this.genArt721Core
          .connect(this.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
        await this.genArt721Core
          .connect(this.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);
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
          ethers.utils.parseEther("100")
        );
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero);
        // expect additional payee to receive 50% of artist revenues
        const additionalBalance = await this.ERC20Mock.balanceOf(
          this.accounts.additional.address
        );
        expect(additionalBalance).to.equal(
          this.pricePerTokenInWei
            .mul(BigNumber.from("90"))
            .div(BigNumber.from("100"))
            .mul(BigNumber.from("50"))
            .div(BigNumber.from("100"))
        );
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
        expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.012912"));
      });
    });

    describe("purchaseTo", async function () {});
  });
}
