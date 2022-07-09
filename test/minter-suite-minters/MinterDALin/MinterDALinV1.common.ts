import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../util/GnosisSafeNetwork";

import { MinterDALin_Common } from "./MinterDALin.common";

/**
 * These tests are intended to check common DALinV1 functionality.
 * The tests are intended to be run on the DALinV1 contract (not the V0 contract).
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterDALinV1_Common = async () => {
  describe("common DALin tests", async () => {
    MinterDALin_Common();
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

    it("does not support toggling of `purchaseToDisabled`", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(this.projectZero),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.user)
        .purchaseTo(this.accounts.artist.address, this.projectZero, {
          value: this.startingPrice,
        });
    });

    it("doesn't support `purchaseTo` toggling", async function () {
      await expectRevert(
        this.minter
          .connect(this.accounts.artist)
          .togglePurchaseToDisabled(this.projectZero),
        "Action not supported"
      );
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
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
};
