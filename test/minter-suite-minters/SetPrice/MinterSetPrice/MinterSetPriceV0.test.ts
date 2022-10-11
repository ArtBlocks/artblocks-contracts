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

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";

import { MinterSetPrice_ETH_Common } from "./MinterSetPrice.common";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
describe("MinterSetPriceV0_V1Core", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
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
      "GenArt721CoreV1",
      "MinterFilterV0"
    ));

    const minterFactory = await ethers.getContractFactory("MinterSetPriceV0");
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

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project2", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project3", this.accounts.artist.address, 0, false);

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
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

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

  describe("calculates gas", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      const tx = await this.minter1
        .connect(this.accounts.user)
        .purchase(this.projectZero, {
          value: this.pricePerTokenInWei,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a successful Ether mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );

      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.036859")); // assuming a cost of 100 GWEI
    });
  });

  describe("purchaseTo", async function () {
    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await this.minter1
        .connect(this.accounts.deployer)
        .togglePurchaseToDisabled(this.projectZero);
      await expectRevert(
        this.minter1
          .connect(this.accounts.user)
          .purchaseTo(this.accounts.additional.address, this.projectZero, {
            value: this.pricePerTokenInWei,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter1
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.user.address, this.projectZero, {
          value: this.pricePerTokenInWei,
        });
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter1
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectZero)
      )
        .to.emit(this.minter1, "PurchaseToDisabledUpdated")
        .withArgs(this.projectZero, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter1
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectZero)
      )
        .to.emit(this.minter1, "PurchaseToDisabledUpdated")
        .withArgs(this.projectZero, false);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // admin allows contract buys
      await this.minter1
        .connect(this.accounts.deployer)
        .toggleContractMintable(this.projectZero);
      // attacker deploys reentrancy contract
      const reentrancyMockFactory = await ethers.getContractFactory(
        "ReentrancyMock"
      );
      const reentrancyMock = await reentrancyMockFactory
        .connect(this.accounts.deployer)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter1.address,
            this.projectZero,
            this.higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = this.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(this.accounts.deployer)
          .attack(
            numTokensToMint,
            this.minter1.address,
            this.projectZero,
            this.higherPricePerTokenInWei,
            {
              value: this.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      // admin allows contract buys
      await this.minter1
        .connect(this.accounts.deployer)
        .toggleContractMintable(this.projectZero);
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // create a transaction
      const unsignedTx = await this.minter1.populateTransaction.purchase(
        this.projectZero
      );
      const transaction: SafeTransactionDataPartial = {
        to: this.minter1.address,
        data: unsignedTx.data,
        value: this.pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapteruser2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapteruser2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await this.accounts.artist.sendTransaction({
        to: safeAddress,
        value: this.pricePerTokenInWei,
      });
      const projectTokenInfoBefore = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectTokenInfoAfter = await this.genArt721Core.projectTokenInfo(
        this.projectZero
      );
      expect(projectTokenInfoAfter.invocations).to.be.equal(
        projectTokenInfoBefore.invocations.add(1)
      );
    });
  });
});
