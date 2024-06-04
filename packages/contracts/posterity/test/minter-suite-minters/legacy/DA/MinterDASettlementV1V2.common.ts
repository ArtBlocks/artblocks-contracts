import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";
import { isCoreV3, deployAndGet, T_Config } from "../../../util/common";
import { completeAuctionWithoutSellingOut } from "./MinterDAExpSettlement/MinterDAExpSettlement.common";

/**
 * These tests are intended to check common DA w/Settlement V1 functionality.
 * The tests are intended to be run on the any DA Settlement V1 contract; for
 * example, if a linear DA Settlement were to be created, these tests would
 * be applicable to that contract.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 * @dev does not call specific type of DA Settlement common tests.
 */
export const MinterDASettlementV1V2_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("purchase_H4M", async function () {
    it("allows `purchase_H4M` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase_H4M(config.projectZero, {
          value: config.startingPrice,
        });
    });

    describe("payment splitting", async function () {
      beforeEach(async function () {
        const config = await loadFixture(_beforeEach);
        config.deadReceiver = await deployAndGet(
          config,
          "DeadReceiverMock",
          []
        );
        // pass config to tests in this describe block
        this.config = config;
      });

      it("requires successful payment to render provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // achieve a state that splits revenues at time of sale
        await completeAuctionWithoutSellingOut(config, config.projectZero);
        // update render provider address to a contract that reverts on receive
        // call appropriate core function to update render provider address
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.deadReceiver.address,
              config.accounts.additional.address,
              config.accounts.artist2.address,
              config.accounts.additional2.address
            );
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesAddress(config.deadReceiver.address);
        }
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              {
                value: config.startingPrice,
              }
            ),
          "Render Provider payment failed"
        );
      });

      it("requires successful payment to platform provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // only relevant for engine core contracts
        if (!config.isEngine) {
          console.log("skipping test for non-engine contract");
          return;
        }
        // achieve a state that splits revenues at time of sale
        await completeAuctionWithoutSellingOut(config, config.projectZero);
        // update render provider address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProviderSalesAddresses(
            config.accounts.artist.address,
            config.accounts.additional.address,
            config.deadReceiver.address,
            config.accounts.additional2.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              {
                value: config.startingPrice,
              }
            ),
          "Platform Provider payment failed"
        );
      });

      it("requires successful payment to artist", async function () {
        // get config from beforeEach
        const config = this.config;
        // achieve a state that splits revenues at time of sale
        await completeAuctionWithoutSellingOut(config, config.projectZero);
        // update artist address to a contract that reverts on receive
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProjectArtistAddress(
            config.projectZero,
            config.deadReceiver.address
          );
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              {
                value: config.startingPrice,
              }
            ),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // get config from beforeEach
        const config = this.config;
        // achieve a state that splits revenues at time of sale
        await completeAuctionWithoutSellingOut(config, config.projectZero);
        // update artist additional payee to a contract that reverts on receive
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.deadReceiver.address,
          // @dev 50% to additional, 50% to artist, to ensure additional is paid
          50,
          config.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for config test
          50,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect revert when trying to purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchaseTo(
              config.accounts.additional.address,
              config.projectZero,
              {
                value: config.startingPrice,
              }
            ),
          "Additional Payee payment failed"
        );
      });

      it("registers success when sending payment to valid artist additional payee", async function () {
        // get config from beforeEach
        const config = this.config;
        // achieve a state that splits revenues at time of sale
        await completeAuctionWithoutSellingOut(config, config.projectZero);
        // update artist additional payee to a contract that reverts on receive
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.accounts.additional.address,
          // @dev 50% to additional, 50% to artist, to ensure additional is paid
          50,
          config.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for config test
          50,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect success when purchasing
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(config.accounts.additional.address, config.projectZero, {
            value: config.startingPrice,
          });
      });

      it("handles zero platform and artist payment values", async function () {
        // get config from beforeEach
        const config = this.config;
        // update platform address to zero
        // route to appropriate core function
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderPrimarySalesPercentages(0, 0);
        } else {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateArtblocksPrimarySalesPercentage(0);
        }
        // update artist primary split to zero
        const proposedAddressesAndSplits = [
          config.projectZero,
          config.accounts.artist.address,
          config.accounts.additional.address,
          // @dev 100% to additional, 0% to artist
          100,
          config.accounts.additional2.address,
          // @dev split for secondary sales doesn't matter for config test
          50,
        ];
        await config.genArt721Core
          .connect(config.accounts.artist)
          .proposeArtistPaymentAddressesAndSplits(
            ...proposedAddressesAndSplits
          );
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .adminAcceptArtistAddressesAndSplits(...proposedAddressesAndSplits);
        // expect successful purchase
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        await config.minter
          .connect(config.accounts.user)
          .purchaseTo(config.accounts.additional.address, config.projectZero, {
            value: config.startingPrice,
          });
      });
    });
  });

  describe("additional payee payments", async function () {
    it("handles additional payee payments", async function () {
      const config = await loadFixture(_beforeEach);
      const valuesToUpdateTo = [
        config.projectZero,
        config.accounts.artist2.address,
        config.accounts.additional.address,
        50,
        config.accounts.additional2.address,
        51,
      ];
      await config.genArt721Core
        .connect(config.accounts.artist)
        .proposeArtistPaymentAddressesAndSplits(...valuesToUpdateTo);
      await config.genArt721Core
        .connect(config.accounts.deployer)
        .adminAcceptArtistAddressesAndSplits(...valuesToUpdateTo);

      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchase(config.projectZero, {
          value: config.startingPrice,
        });
    });
  });

  describe("purchaseTo", async function () {
    it("allows `purchaseTo` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchaseTo(config.accounts.additional.address, config.projectZero, {
          value: config.startingPrice,
        });
    });

    it("does not support toggling of `purchaseToDisabled`", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectZero),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);
      await config.minter
        .connect(config.accounts.user)
        .purchaseTo(config.accounts.artist.address, config.projectZero, {
          value: config.startingPrice,
        });
    });

    it("doesn't support `purchaseTo` toggling", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectZero),
        "Action not supported"
      );
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      const config = await loadFixture(_beforeEach);
      // achieve a state that splits revenues at time of sale.
      await completeAuctionWithoutSellingOut(config, config.projectZero);
      // attacker is must be privileged artist or admin, making config a somewhat
      // silly reentrancy attack. Still worth testing to ensure nonReentrant
      // modifier is working.
      const reentrancyMockFactory =
        await ethers.getContractFactory("ReentrancyMock");
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();
      // update platform payment address to the reentrancy mock contract
      // route to appropriate core function
      if (config.isEngine) {
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateProviderSalesAddresses(
            reentrancyMock.address,
            config.accounts.user.address,
            config.accounts.additional.address,
            config.accounts.additional2.address
          );
      } else {
        await config.genArt721Core
          .connect(config.accounts.deployer)
          .updateArtblocksPrimarySalesAddress(reentrancyMock.address);
      }
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during payment to render provider, where reentrency
        // attack occurs
        "Render Provider payment failed"
      );
      // attacker should be able to purchase ONE token at a time w/settlements
      numTokensToMint = BigNumber.from("1");
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      const config = await loadFixture(_beforeEach);
      // advance to time when auction is active
      await ethers.provider.send("evm_mine", [
        config.startTime + config.auctionStartTimeOffset,
      ]);

      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        config.accounts.artist,
        config.accounts.additional,
        config.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // create a transaction
      const unsignedTx = await config.minter.populateTransaction.purchase(
        config.projectZero
      );
      const transaction: SafeTransactionDataPartial = {
        to: config.minter.address,
        data: unsignedTx.data,
        value: config.higherPricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapterOwner2 = new EthersAdapter({
        ethers,
        signer: config.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapterOwner2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await config.accounts.artist.sendTransaction({
        to: safeAddress,
        value: config.higherPricePerTokenInWei,
      });
      const viewFunctionWithInvocations = (await isCoreV3(config.genArt721Core))
        ? config.genArt721Core.projectStateData
        : config.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        config.projectZero
      );
      const executeTxResponse =
        await safeSdk2.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        config.projectZero
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
