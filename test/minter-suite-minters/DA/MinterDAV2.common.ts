import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../util/GnosisSafeNetwork";
import { isCoreV3 } from "../../util/common";

/**
 * These tests are intended to check common DA V2 functionality.
 * The tests are intended to be run on the any DA V2 contract (not the V0 contracts).
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 * @dev does not call specific type of DA common tests (e.g MinterDALin_Common)
 */
export const MinterDAV2_Common = async () => {
  describe("purchase_H4M", async function () {
    it("allows `purchase_H4M` by default", async function () {
      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter
        .connect(this.accounts.user)
        .purchase_H4M(this.projectZero, {
          value: this.startingPrice,
        });
    });
  });

  describe("additional payee payments", async function () {
    it("handles additional payee payments", async function () {
      const valuesToUpdateTo = [
        this.projectZero,
        this.accounts.artist2.address,
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

      await ethers.provider.send("evm_mine", [
        this.startTime + this.auctionStartTimeOffset,
      ]);
      await this.minter.connect(this.accounts.user).purchase(this.projectZero, {
        value: this.startingPrice,
      });
    });
  });
};
