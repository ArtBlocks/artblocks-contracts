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
  selloutMidAuction,
} from "./MinterDAExpSettlement.common";
import { MinterDASettlementV1V2_Common } from "../MinterDASettlementV1V2.common";

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3", // flagship V3 core
  "GenArt721CoreV3_Explorations", // V3 core explorations contract
  "GenArt721CoreV3_Engine", // V3 core engine contract
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

    describe.only("setAuctionDetails", async function () {
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
          ethers.BigNumber.from("50")
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

      it("does not allow modifications mid-auction", async function () {
        // advance to start time + 1 second
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset + 1,
        ]);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("30")
        );
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .setAuctionDetails(
              this.projectZero,
              future,
              this.defaultHalfLife,
              this.startingPrice,
              this.basePrice
            ),
          "No modifications mid-auction"
        );
      });

      it("does not allow base price of zero", async function () {
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("50")
        );
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .setAuctionDetails(
              this.projectZero,
              future,
              this.defaultHalfLife,
              this.startingPrice,
              ethers.BigNumber.from("0")
            ),
          "Base price must be non-zero"
        );
      });

      it("updates local cached maxInvocations values if using core contract values", async function () {
        // sync maxInvocations to core contract value
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // reduce maxInvocations in core contract
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 1);
        // set auction details again
        await this.minter
          .connect(this.accounts.deployer)
          .resetAuctionDetails(this.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("50")
        );
        // expect maxInvocations to be stale relative to core contract
        const initialProjectConfig = await this.minter.projectConfig(
          this.projectZero
        );
        expect(initialProjectConfig.maxInvocationsCoreCached).to.equal(15);
        await this.minter
          .connect(this.accounts.artist)
          .setAuctionDetails(
            this.projectZero,
            future,
            this.defaultHalfLife,
            this.startingPrice,
            this.basePrice
          );
        // expect maxInvocations to have been re-synced with core contract
        const afterProjectConfig = await this.minter.projectConfig(
          this.projectZero
        );
        expect(afterProjectConfig.maxInvocationsCoreCached).to.equal(1);
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

    describe("Invocations reduction on core mid-auction", async function () {
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

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("only artist", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.deployer)
            .manuallyLimitProjectMaxInvocations(
              this.projectZero,
              this.maxInvocations
            ),
          "Only Artist"
        );
      });

      it("reverts when setting minter local max invocations to value greater than core contract max invocations", async function () {
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              this.projectZero,
              this.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
      });

      it("reverts when setting minter local max invocations to value less than current invocations", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await expectRevert(
          this.minter
            .connect(this.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              this.projectZero,
              projectStateData.invocations - 1
            ),
          "Cannot set project max invocations to less than current invocations"
        );
      });

      it("allows setting minter local max invocations equal to current invocations", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        // no revert
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations
          );
      });

      it("updates state of projectConfig after manually limiting minter local max invocations to current invocations", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations
          );
        // projectConfig should reflect new max invocations
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.useLocalMaxInvocations).to.be.true;
        expect(projectConfig.maxHasBeenInvokedLocal).to.be.true;
        expect(projectConfig.maxInvocationsLocal).to.be.equal(
          projectStateData.invocations
        );
      });

      it("updates state of projectConfig after manually limiting minter local max invocations to current invocations + 1", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // projectConfig should reflect new max invocations
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.useLocalMaxInvocations).to.be.true;
        expect(projectConfig.maxHasBeenInvokedLocal).to.be.false;
        expect(projectConfig.maxInvocationsLocal).to.be.equal(
          projectStateData.invocations.add(ethers.BigNumber.from("1"))
        );
        // purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero, {
            value: this.startingPrice,
          }),
          "Maximum number of invocations reached"
        );
        // artist should be able to withdraw revenues
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero);
      });

      it("enforces local max invocations after manually limiting minter local max invocations", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // one more purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero, {
            value: this.startingPrice,
          }),
          "Maximum number of invocations reached"
        );
      });

      it("ignores local max invocations if re-syncs to core contract's max invocations", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // one more purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          this.minter.connect(this.accounts.user).purchase(this.projectZero, {
            value: this.startingPrice,
          }),
          "Maximum number of invocations reached"
        );
        // re-sync to core contract's max invocations
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: this.startingPrice,
          });
      });

      it("freezes price after local max invocations reached and revenues withdrawn", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations
          );
        // artist withdraws revenues
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero);
        // latest purchase price should be frozen
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // artist sets max invocations back to core contract's max invocations
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // advance in time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset * 10,
        ]);
        // purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: latestPurchasePrice,
          });
        // latest purchase price should still be the same as the frozen price
        const projectConfig2 = await this.minter.projectConfig(
          this.projectZero
        );
        const latestPurchasePrice2 = await projectConfig2.latestPurchasePrice;
        expect(latestPurchasePrice2).to.be.equal(latestPurchasePrice);
      });

      it("does NOT freeze price after local max invocations reached and revenues NOT withdrawn", async function () {
        await purchaseTokensMidAuction.call(this, this.projectZero);
        // limit invocations == current invocations
        const projectStateData = await this.genArt721Core.projectStateData(
          this.projectZero
        );
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            this.projectZero,
            projectStateData.invocations
          );
        // artist does NOT withdraw revenues
        // latest purchase price should be NOT frozen
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // artist sets max invocations back to core contract's max invocations
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // advance in time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset * 10,
        ]);
        // purchase should be successful
        await this.minter
          .connect(this.accounts.user)
          .purchase(this.projectZero, {
            value: latestPurchasePrice,
          });
        // latest purchase price have continued to decrease since revenues were not withdrawn
        const projectConfig2 = await this.minter.projectConfig(
          this.projectZero
        );
        const latestPurchasePrice2 = await projectConfig2.latestPurchasePrice;
        expect(latestPurchasePrice2).to.be.lt(latestPurchasePrice);
      });

      it("allows withdrawals even when sellout not known locally, and not using local max invocations", async function () {
        // reduce max invocations to 2
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 2);
        // make minter aware of core max invocations
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await this.minter
          .connect(this.accounts.user)
          .purchase_H4M(this.projectZero, {
            value: this.startingPrice,
          });
        // reduce max invocations to 1 on core contract
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 1);
        // minter state is stale due to caching
        let projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.maxHasBeenInvokedCoreCached).to.be.false; // incorrect state due to caching
        expect(projectConfig.maxInvocationsCoreCached).to.be.equal(2); // incorrect state due to caching
        expect(projectConfig.useLocalMaxInvocations).to.be.false;
        // minter should allow withdrawls because it syncs with core contract maxInvocations
        // during withdrawArtistAndAdminRevenues
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero);
        // minter state should be updated to reflect sellout
        projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.maxHasBeenInvokedCoreCached).to.be.true; // correct state after sync
        expect(projectConfig.maxInvocationsCoreCached).to.be.equal(1); // correct state after sync
        expect(projectConfig.useLocalMaxInvocations).to.be.false;
      });

      it("allows withdrawals even when sellout not known locally, and using local max invocations", async function () {
        // manually limit max invocations to 2 on the minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await this.minter
          .connect(this.accounts.user)
          .purchase_H4M(this.projectZero, {
            value: this.startingPrice,
          });
        // reduce max invocations to 1 on core contract
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 1);
        // minter state is stale due to caching
        let projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.maxHasBeenInvokedLocal).to.be.false; // incorrect state due to caching
        expect(projectConfig.maxInvocationsLocal).to.be.equal(2); // incorrect state due to caching
        expect(projectConfig.useLocalMaxInvocations).to.be.true;
        // minter should allow withdrawls because it syncs with core contract maxInvocations
        // during withdrawArtistAndAdminRevenues (i.e. updates local max invocations from being in illogical state)
        await this.minter
          .connect(this.accounts.artist)
          .withdrawArtistAndAdminRevenues(this.projectZero);
        // minter state should be updated to reflect sellout
        projectConfig = await this.minter.projectConfig(this.projectZero);
        expect(projectConfig.maxHasBeenInvokedLocal).to.be.true; // correct state after sync
        expect(projectConfig.maxInvocationsLocal).to.be.equal(1); // correct state after sync
        expect(projectConfig.useLocalMaxInvocations).to.be.true;
      });
    });

    describe("getPriceInfo", async function () {
      it("returns price of zero for unconfigured auction", async function () {
        // projectOne is not configured
        const priceInfo = await this.minter.getPriceInfo(this.projectOne);
        expect(priceInfo.isConfigured).to.be.false;
        expect(priceInfo.tokenPriceInWei).to.be.equal(0);
      });

      it("returns correct price before configured auction", async function () {
        const priceInfo = await this.minter.getPriceInfo(this.projectZero);
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.be.equal(this.startingPrice);
      });

      it("returns correct price after sellout", async function () {
        await selloutMidAuction.call(this, this.projectZero);
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset * 10,
        ]);
        // price should be the same as the sellout price
        const priceInfo = await this.minter
          .connect(this.accounts.artist)
          .getPriceInfo(this.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(latestPurchasePrice);
        expect(priceInfo.tokenPriceInWei).to.be.gt(this.basePrice);
      });

      it("returns correct price after sellout not known locally, when not using local max invocations", async function () {
        // reduce max invocations to 2
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 2);
        // make minter aware of core max invocations
        await this.minter
          .connect(this.accounts.artist)
          .setProjectMaxInvocations(this.projectZero);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await this.minter
          .connect(this.accounts.user)
          .purchase_H4M(this.projectZero, {
            value: this.startingPrice,
          });
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // reduce max invocations to 1 on core contract
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 1);
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset * 10,
        ]);
        // price should be the same as the sellout price
        const priceInfo = await this.minter
          .connect(this.accounts.artist)
          .getPriceInfo(this.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(latestPurchasePrice);
        expect(priceInfo.tokenPriceInWei).to.be.gt(this.basePrice);
      });

      it("returns correct price after sellout not known locally, when using local max invocations", async function () {
        // reduce max invocations to 2 on local minter
        await this.minter
          .connect(this.accounts.artist)
          .manuallyLimitProjectMaxInvocations(this.projectZero, 2);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await this.minter
          .connect(this.accounts.user)
          .purchase_H4M(this.projectZero, {
            value: this.startingPrice,
          });
        // update max invocations on core contract to 1, but minter should not know about it
        await this.genArt721Core
          .connect(this.accounts.artist)
          .updateProjectMaxInvocations(this.projectZero, 1);
        const projectConfig = await this.minter.projectConfig(this.projectZero);
        const selloutPrice = projectConfig.latestPurchasePrice;
        expect(projectConfig.maxHasBeenInvokedLocal).to.be.false; // minter does not know about sellout, so state is false
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          this.startTime + this.auctionStartTimeOffset * 10,
        ]);
        // get price info should handle the cache discrepancy and return the correct price,
        // which is the sellout price (latestPurchasePrice)
        const priceInfo = await this.minter.getPriceInfo(this.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(selloutPrice);
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
