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

/**
 * These tests are intended to check common MinterSetPriceV4 functionality.
 * The tests are intended to be run on the any MinterSetPriceV4 contract (not other version contracts).
 * (config includes V2ERC20 contracts)
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPriceV4_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("purchase_H4M", async function () {
    it("allows `purchase_H4M` by default", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.user)
        ["purchase_H4M(uint256)"](config.projectZero, {
          value: config.pricePerTokenInWei,
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
            ["purchase(uint256)"](config.projectZero, {
              value: config.pricePerTokenInWei,
            }),
          "Render Provider payment failed"
        );
      });
      it("requires successful payment to platform provider", async function () {
        // get config from beforeEach
        const config = this.config;
        // update render provider address to a contract that reverts on receive
        // only relevant for engine core contracts
        if (config.isEngine) {
          await config.genArt721Core
            .connect(config.accounts.deployer)
            .updateProviderSalesAddresses(
              config.accounts.artist.address,
              config.accounts.additional.address,
              config.deadReceiver.address,
              config.accounts.additional2.address
            );
          await expectRevert(
            config.minter
              .connect(config.accounts.user)
              [
                "purchaseTo(address,uint256)"
              ](config.accounts.additional.address, config.projectZero, {
                value: config.pricePerTokenInWei,
              }),
            "Platform Provider payment failed"
          );
        } else {
          // @dev no-op for non-engine contracts
        }
      });

      it("requires successful payment to artist", async function () {
        // get config from beforeEach
        const config = this.config;
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
            ["purchase(uint256)"](config.projectZero, {
              value: config.pricePerTokenInWei,
            }),
          "Artist payment failed"
        );
      });

      it("requires successful payment to artist additional payee", async function () {
        // get config from beforeEach
        const config = this.config;
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
            ["purchase(uint256)"](config.projectZero, {
              value: config.pricePerTokenInWei,
            }),
          "Additional Payee payment failed"
        );
      });

      it("handles zero platform and artist payment values", async function () {
        // get config from beforeEach
        const config = this.config;
        // update platform to zero percent
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
          // @dev 100% to additional, 0% to artist, to induce zero artist payment
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
        await config.minter
          .connect(config.accounts.user)
          ["purchase(uint256)"](config.projectZero, {
            value: config.pricePerTokenInWei,
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

      await config.minter
        .connect(config.accounts.user)
        ["purchase(uint256)"](config.projectZero, {
          value: config.pricePerTokenInWei,
        });
    });
  });
};
