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
} from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { MinterDAExp_Common } from "./MinterDAExp.common";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V1 core contract.
 */
describe("MinterDAExpV0_V1Core", async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this, 3); // projectZero = 3 on V1 core
    this.startingPrice = ethers.utils.parseEther("10");
    this.higherPricePerTokenInWei = this.startingPrice.add(
      ethers.utils.parseEther("0.1")
    );
    this.basePrice = ethers.utils.parseEther("0.05");
    this.defaultHalfLife = ONE_HOUR / 2;
    this.auctionStartTimeOffset = ONE_HOUR;

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

    this.minter = await deployAndGet.call(this, "MinterDAExpV0", [
      this.genArt721Core.address,
      this.minterFilter.address,
    ]);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addProject("project1", this.accounts.artist.address, 0, false);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .toggleProjectIsActive(this.projectZero);

    await this.genArt721Core
      .connect(this.accounts.deployer)
      .addMintWhitelisted(this.minterFilter.address);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .updateProjectMaxInvocations(this.projectZero, 15);

    await this.genArt721Core
      .connect(this.accounts.artist)
      .toggleProjectIsPaused(this.projectZero);

    await this.minterFilter
      .connect(this.accounts.deployer)
      .addApprovedMinter(this.minter.address);
    await this.minterFilter
      .connect(this.accounts.deployer)
      .setMinterForProject(this.projectZero, this.minter.address);

    if (!this.startTime) {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      this.startTime = block.timestamp;
    }
    this.startTime = this.startTime + ONE_DAY;

    await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
    await this.minter
      .connect(this.accounts.deployer)
      .resetAuctionDetails(this.projectZero);
    await this.minter
      .connect(this.accounts.artist)
      .setAuctionDetails(
        this.projectZero,
        this.startTime + this.auctionStartTimeOffset,
        this.defaultHalfLife,
        this.startingPrice,
        this.basePrice
      );
    await ethers.provider.send("evm_mine", [this.startTime]);
  });

  describe("common tests", async function () {
    MinterDAExp_Common();
  });

  describe("calculate gas", async function () {
    it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);

      const tx = await this.minter
        .connect(this.accounts.user)
        .purchase(this.projectZero, {
          value: this.startingPrice,
        });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed).toString();
      console.log(
        "Gas cost for a successful Exponential DA mint: ",
        ethers.utils.formatUnits(txCost, "ether").toString(),
        "ETH"
      );

      expect(txCost.toString()).to.equal(ethers.utils.parseEther("0.0380107")); // assuming a cost of 100 GWEI
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.additional.address, this.projectZero, {
          value: this.startingPrice,
        });
    });

    it("disallows `purchaseTo` if disallowed explicitly", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.deployer)
        .togglePurchaseToDisabled(this.projectZero);
      await expectRevert(
        this.minter
          .connect(this.accounts.user)
          .purchaseTo(this.accounts.additional.address, this.projectZero, {
            value: this.startingPrice,
          }),
        "No `purchaseTo` Allowed"
      );
      // still allows `purchaseTo` if destination matches sender.
      await this.minter
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.user.address, this.projectZero, {
          value: this.startingPrice,
        });
    });

    it("emits event when `purchaseTo` is toggled", async function () {
      // emits true when changed from initial value of false
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectZero)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(this.projectZero, true);
      // emits false when changed from initial value of true
      await expect(
        this.minter
          .connect(this.accounts.deployer)
          .togglePurchaseToDisabled(this.projectZero)
      )
        .to.emit(this.minter, "PurchaseToDisabledUpdated")
        .withArgs(this.projectZero, false);
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      // admin allows contract buys
      await this.minter
        .connect(this.accounts.deployer)
        .toggleContractMintable(this.projectZero);
      // advance to time when auction is active
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
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
            this.minter.address,
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
            this.minter.address,
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
      await this.minter
        .connect(this.accounts.deployer)
        .toggleContractMintable(this.projectZero);
      // advance to time when auction is active
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);

      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // create a transaction
      const unsignedTx = await this.minter.populateTransaction.purchase(
        this.projectZero
      );
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: this.higherPricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await this.accounts.artist.sendTransaction({
        to: safeAddress,
        value: this.higherPricePerTokenInWei,
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
