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

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

import {
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import {
  MinterDAExpSettlement_Common,
  purchaseTokensMidAuction,
} from "./MinterDAExpSettlement.common";
import { MinterDASettlementV1V2_Common } from "../MinterDASettlementV1V2.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  // "GenArt721CoreV3_Explorations", // V3 core explorations contract
  // "GenArt721CoreV3_Engine", // V3 core engine contract
];

const TARGET_MINTER_NAME = "MinterDAExpSettlementV2";

/**
 * These tests intended to ensure this Filtered Minter integrates properly with
 * V3 core contracts, both flagship and explorations.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${TARGET_MINTER_NAME}_${coreContractName}`, async function () {
    beforeEach(async function () {
      // standard accounts and constants
      this.accounts = await getAccounts();
      await assignDefaultConstants.call(this);
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
        coreContractName,
        "MinterFilterV1"
      ));

      this.targetMinterName = TARGET_MINTER_NAME;
      this.minter = await deployAndGet.call(this, this.targetMinterName, [
        this.genArt721Core.address,
        this.minterFilter.address,
      ]);
      this.isEngine = await this.minter.isEngine();

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
      this.startTime = this.startTime + ONE_DAY * 2;

      await ethers.provider.send("evm_mine", [this.startTime - ONE_MINUTE]);
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

    describe("common DAEXPSettlement tests", async function () {
      await MinterDAExpSettlement_Common();
    });

    describe("common DA Settlement V1V2 tests", async function () {
      await MinterDASettlementV1V2_Common();
    });

    describe("setAuctionDetails", async function () {
      it("does not unsafely cast auction time start > type(uint64).max", async function () {
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        const overflowStartTime = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("64")
        );
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .setAuctionDetails(
              this.projectZero,
              overflowStartTime,
              this.defaultHalfLife,
              this.startingPrice,
              this.basePrice
            ),
          "SafeCast: value doesn't fit in 64 bits"
        );
      });

      it("allows auction to be updated before start time", async function () {
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("30")
        );
        await this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            future,
            this.defaultHalfLife,
            this.startingPrice,
            this.basePrice
          );
        // check that auction may be updated again
        await this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            future.sub(ethers.BigNumber.from("100")),
            this.defaultHalfLife,
            this.startingPrice,
            this.basePrice
          );
      });
    });

    describe("setProjectMaxInvocations", async function () {
      it("allows artist to call setProjectMaxInvocations", async function () {
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
      });

      it("does not allow deployer or user to call setProjectMaxInvocations", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.deployer)
            .setProjectMaxInvocations(this.projectZero),
          "Only Artist"
        );
        await expectRevert(
          this.minter
            .connect(this.accounts.user)
            .setProjectMaxInvocations(this.projectZero),
          "Only Artist"
        );
      });

      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);
        const projectMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectMaxInvocations(this.projectZero);
        expect(projectMaxInvocations).to.equal(1);

        // mint a token
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectMaxInvocations(this.projectZero);
        expect(syncedMaxInvocations).to.equal(15);
      });

      it("safely syncs hasMaxBeenInvoked during withdraw revenues function, respecting the manually configured limit", async function () {
        // reduce local maxInvocations to 2 on minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 1);
        const projectMaxInvocations = await this.minter
          .connect(this.accounts.artist)
          .projectMaxInvocations(this.projectZero);
        expect(projectMaxInvocations).to.equal(1);

        // mint a token
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await this.minter.projectMaxHasBeenInvoked(
          this.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // artist can withdraw funds because minter safely syncs hasMaxBeenInvoked in withdrawal function.
        // the safe sync will not increase the manually configured local maxInvocation limit on the minter.
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero);
      });
    });

    describe.only("Invocations reduction on core mid-auction", async function () {
      it("does not prevent revenue withdrawals if artist reduces max invocations to current invocations on core contract mid-auction", async function () {
        // models the following situation:
        // - auction is not sold out
        // artist reduces maxInvocations on core contract, completing the project
        // desired state:
        // - artist is able to withdraw revenue until end of auction
        // - "latestPurchasePrice" price should reflect the last purchased token
        // note: this test highlights a different behavior from DA w/Settlement V1 and V0. Although this would be suspicious behavior by the artist,
        // in V1 and V0, the artist could set maxInvocations to (invocations + 1) on core, purchase one token, and achieve the same effect.
        // This test, therefore, is simply to confirm the behavior of the V2 (and on) minter.
        const originalBalanceArtist = await this.accounts.artist.getBalance();
        const originalBalanceUser = await this.accounts.user.getBalance();

        // purchase a couple tokens (at zero gas fee), do not sell out auction
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // get current invocations on project
        const projectState = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        const invocations = projectState.invocations;
        // artist reduces invocations on core contract
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, invocations, {
            gasPrice: 0,
          });
        // artist should be able to withdraw revenue
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero, { gasPrice: 0 });
        // latestPurchasePrice is > base price
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.latestPurchasePrice).to.be.gt(
          projectConfig.basePrice
        );
        // advance past end of auction, so base price becomes base price
        await ethers.provider.send("evm_mine", [
          this.startTime +
            this.auctionStartTimeOffset +
            this.defaultHalfLife * 10,
        ]);
        // user should be able to withdraw settlement as if sellout price was auction latest purchase price
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.minter
          .connect(this.accounts.user)
          .reclaimProjectExcessSettlementFunds(this.projectZero, {
            gasPrice: 0,
          });
        // user balance should reflect proper settlement amount
        const newBalanceArtist = await this.accounts.artist.getBalance();
        const newBalanceUser = await this.accounts.user.getBalance();
        // artist should have received 90% of total revenue (10% went to Art Blocks), or 80% of total revenue if engine
        const targetArtistPercentage = this.isEngine ? 80 : 90;
        const roundingError = ethers.BigNumber.from("1"); // 1 wei rounding error, negligible
        const targetArtistRevenue = projectConfig.latestPurchasePrice
          .mul(targetArtistPercentage)
          .div(100)
          .mul(2); // 2 tokens purchased
        expect(newBalanceArtist).to.be.equal(
          originalBalanceArtist.add(targetArtistRevenue).add(roundingError)
        );
        const totalRevenue = projectConfig.latestPurchasePrice.mul(2); // 2 tokens purchased
        // user should have spent 100% of total revenue (100% came from this user)
        expect(newBalanceUser).to.be.equal(
          originalBalanceUser.sub(projectConfig.latestPurchasePrice.mul(2))
        );
      });

      it("does not prevent revenue withdrawals if artist reduces max invocations to current invocations on core contract mid-auction2", async function () {
        // models the following situation:
        // - auction is not sold out
        // - auction is reset by admin
        // artist reduces maxInvocations on core contract, completing the project
        // desired state:
        // - artist be able to withdraw revenue
        // - "latestPurchasePrice" price should reflect the last purchased token price
        // (overall this is a very odd situation to be in, but we want to make sure no
        // funds are lost or stuck in the contract)
        // note: this test highlights a different behavior from DA w/Settlement V1 and V0. Although this would be suspicious behavior by the artist,
        // in V1 and V0, the artist could set maxInvocations to (invocations + 1) on core, purchase one token, and achieve the same effect.
        // This test, therefore, is simply to confirm the behavior of the V2 (and on) minter.
        const originalBalanceArtist = await this.accounts.artist.getBalance();
        const originalBalanceUser = await this.accounts.user.getBalance();

        // purchase a couple tokens (at zero gas fee), do not sell out auction
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // admin resets auction
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        // get current invocations on project
        const projectState = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        const invocations = projectState.invocations;
        // artist reduces invocations on core contract
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, invocations, {
            gasPrice: 0,
          });
        // artist should be able to withdraw revenue
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero, { gasPrice: 0 });

        // latestPurchasePrice is > base price (base price is currently 0 after calling resetAuctionDetails)
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.latestPurchasePrice).to.be.gt(
          projectConfig.basePrice
        );
        // user should be able to withdraw settlement as if sellout price was latestPurchasePrice
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await this.minter
          .connect(this.accounts.user)
          .reclaimProjectExcessSettlementFunds(this.projectZero, {
            gasPrice: 0,
          });
        // user balance should reflect proper settlement amount
        const newBalanceArtist = await this.accounts.artist.getBalance();
        const newBalanceUser = await this.accounts.user.getBalance();
        // artist should have received 90% of total revenue (10% went to Art Blocks), or 80% of total revenue if engine
        const targetArtistPercentage = this.isEngine ? 80 : 90;
        const roundingError = ethers.BigNumber.from("1"); // 1 wei rounding error, negligible
        const targetArtistRevenue = projectConfig.latestPurchasePrice
          .mul(targetArtistPercentage)
          .div(100)
          .mul(2); // 2 tokens purchased
        expect(newBalanceArtist).to.be.equal(
          originalBalanceArtist.add(targetArtistRevenue).add(roundingError)
        );
        // user should have spent 100% of total revenue (100% came from this user)
        const totalRevenue = projectConfig.latestPurchasePrice.mul(2); // 2 tokens purchased
        expect(newBalanceUser).to.be.equal(
          originalBalanceUser.sub(projectConfig.latestPurchasePrice.mul(2))
        );
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
          "Gas cost for a successful Exponential DA mint: ",
          ethers.utils.formatUnits(txCost, "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        if (this.isEngine) {
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.015513")
          );
        } else {
          expect(txCost.toString()).to.equal(
            ethers.utils.parseEther("0.015513")
          );
        }
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const coreType = await this.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!this.isEngine);
      });
    });
  });
}

// single-iteration tests with mock core contract(s)
describe(`${TARGET_MINTER_NAME} tests using mock core contract(s)`, async function () {
  beforeEach(async function () {
    // standard accounts and constants
    this.accounts = await getAccounts();
    await assignDefaultConstants.call(this);
  });

  describe("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter.call(
          this,
          coreContractName,
          "MinterFilterV1"
        );
      console.log(genArt721Core.address);
      const minterFactory = await ethers.getContractFactory(TARGET_MINTER_NAME);
      // we should revert during deployment because the core contract returns an incorrect number of return values
      // for the given coreType response
      await expectRevert(
        minterFactory.deploy(genArt721Core.address, minterFilter.address, {
          gasLimit: 30000000,
        }),
        "Unexpected revenue split bytes"
      );
    });
  });
});
