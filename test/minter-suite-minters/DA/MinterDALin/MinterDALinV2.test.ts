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
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { MinterDALin_Common } from "./MinterDALin.common";
import { MinterDAV1V2_Common } from "../MinterDAV1V2.common";
import { MinterDAV2_Common } from "../MinterDAV2.common";

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
  describe(`MinterDALinV2_${coreContractName}`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);
      this.startingPrice = ethers.utils.parseEther("10");
      this.higherPricePerTokenInWei = this.startingPrice.add(
        ethers.utils.parseEther("0.1")
      );
      this.basePrice = ethers.utils.parseEther("0.05");

      this.auctionStartTimeOffset = ONE_HOUR;

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

      this.minter = await deployAndGet.call(this, "MinterDALinV2", [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);

      await safeAddProject(
        this.genArt721Core,
        this.accounts.deployer,
        this.accounts.artist.address
      );

      await this.genArt721Core
        .connect(this.accounts.deployer)
        .toggleProjectIsActive(this.projectZero);

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
          this.startTime + this.auctionStartTimeOffset + ONE_HOUR * 2,
          this.startingPrice,
          this.basePrice
        );
      await ethers.provider.send("evm_mine", [this.startTime]);
    });

    describe("common DALin tests", async () => {
      await MinterDALin_Common();
    });

    describe("common DA V1V2 tests", async function () {
      await MinterDAV1V2_Common();
    });

    describe("common DA V2 tests", async function () {
      await MinterDAV2_Common();
    });

    describe("setAuctionDetails", async function () {
      it("does not unsafely cast auction time start > type(uint64).max", async function () {
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        const overflowStartTime = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("64")
        );
        const overflowEndTime = overflowStartTime.add(ONE_HOUR * 2);
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .setAuctionDetails(
              this.projectZero,
              overflowStartTime,
              overflowEndTime,
              this.startingPrice,
              this.basePrice
            ),
          "SafeCast: value doesn't fit in 64 bits"
        );
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
        const txCost = receipt.effectiveGasPrice
          .mul(receipt.gasUsed)
          .toString();

        console.log(
          "Gas cost for a successful Linear DA mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        expect(txCost.toString()).to.equal(
          ethers.utils.parseEther("0.0138498")
        ); // assuming a cost of 100 GWEI
      });
    });
  });
}
