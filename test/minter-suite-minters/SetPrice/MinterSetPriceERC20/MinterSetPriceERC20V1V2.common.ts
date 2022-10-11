import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";

import { MinterSetPriceV1V2_Common } from "../MinterSetPriceV1V2.common";
import { isCoreV3 } from "../../../util/common";

/**
 * These tests are intended to check common MinterSetPriceERC20V1 functionality.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPriceERC20V1V2_Common = async () => {
  describe("common MinterSetPrice V1V2 minter tests", async () => {
    await MinterSetPriceV1V2_Common();
  });

  describe("gnosis safe V1V2", async function () {
    it("allows gnosis safe to purchase in ERC20", async function () {
      // artist changes to Mock ERC20 token
      await this.minter
        .connect(this.accounts.artist)
        .updateProjectCurrencyInfo(
          this.projectOne,
          "MOCK",
          this.ERC20Mock.address
        );
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        this.accounts.artist,
        this.accounts.additional,
        this.accounts.user
      );
      const safeAddress = safeSdk.getAddress();
      // create a transaction to approve contract to spend ERC20
      const unsignedApprovalTx =
        await this.ERC20Mock.populateTransaction.approve(
          this.minter.address,
          ethers.utils.parseEther("100")
        );
      const approvalTransaction: SafeTransactionDataPartial = {
        to: this.ERC20Mock.address,
        data: unsignedApprovalTx.data,
        value: "0x0",
      };
      const safeApprovalTransaction = await safeSdk.createTransaction(
        approvalTransaction
      );
      // signers sign and execute the approval transaction
      // artist signs
      await safeSdk.signTransaction(safeApprovalTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: this.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHashApprove = await safeSdk2.getTransactionHash(
        safeApprovalTransaction
      );
      const approveTxApproveResponse = await safeSdk2.approveTransactionHash(
        txHashApprove
      );
      await approveTxApproveResponse.transactionResponse?.wait();
      // fund the safe and execute transaction
      await this.ERC20Mock.connect(this.accounts.user).transfer(
        safeAddress,
        this.pricePerTokenInWei
      );
      const executeTxApproveResponse = await safeSdk2.executeTransaction(
        safeApprovalTransaction
      );
      await executeTxApproveResponse.transactionResponse?.wait();

      // create a purchase transaction
      const unsignedTx = await this.minter.populateTransaction.purchase(
        this.projectOne
      );
      const transaction: SafeTransactionDataPartial = {
        to: this.minter.address,
        data: unsignedTx.data,
        value: "0x0",
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the purchase transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // execute purchase transaction
      const viewFunctionWithInvocations = (await isCoreV3(this.genArt721Core))
        ? this.genArt721Core.projectStateData
        : this.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        this.projectOne
      );
      const executeTxResponse = await safeSdk2.executeTransaction(
        safeTransaction
      );
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        this.projectOne
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
