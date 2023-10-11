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
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployAndGet,
  deployCoreWithMinterFilter,
  safeAddProject,
  requireBigNumberIsClose,
} from "../../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../../util/constants";
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
 * These tests intended to ensure config Filtered Minter integrates properly with
 * V3 core contracts, both flagship and explorations.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${TARGET_MINTER_NAME}_${coreContractName}`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);
      config.startingPrice = ethers.utils.parseEther("10");
      config.higherPricePerTokenInWei = config.startingPrice.add(
        ethers.utils.parseEther("0.1")
      );
      config.basePrice = ethers.utils.parseEther("0.05");
      config.defaultHalfLife = ONE_HOUR / 2;
      config.auctionStartTimeOffset = ONE_HOUR;

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV1"
      ));

      config.targetMinterName = TARGET_MINTER_NAME;
      config.minter = await deployAndGet(config, config.targetMinterName, [
        config.genArt721Core.address,
        config.minterFilter.address,
      ]);
      config.isEngine = await config.minter.isEngine();

      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );

      await config.genArt721Core
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectZero);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .addApprovedMinter(config.minter.address);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(config.projectZero, config.minter.address);

      if (!config.startTime) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        config.startTime = block.timestamp;
      }
      config.startTime = config.startTime + ONE_DAY * 2;

      await ethers.provider.send("evm_mine", [config.startTime - ONE_MINUTE]);
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectZero,
          config.startTime + config.auctionStartTimeOffset,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );
      await ethers.provider.send("evm_mine", [config.startTime]);
      return config;
    }

    describe("common DAEXPSettlement tests", async function () {
      await MinterDAExpSettlement_Common(_beforeEach);
    });

    describe("common DA Settlement V1V2 tests", async function () {
      await MinterDASettlementV1V2_Common(_beforeEach);
    });

    describe("setAuctionDetails", async function () {
      it("does not unsafely cast auction time start > type(uint64).max", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        const overflowStartTime = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("64")
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              overflowStartTime,
              config.defaultHalfLife,
              config.startingPrice,
              config.basePrice
            ),
          "SafeCast: value doesn't fit in 64 bits"
        );
      });

      it("allows auction to be updated before start time", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("50")
        );
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            future,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
        // check that auction may be updated again
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            future.sub(ethers.BigNumber.from("100")),
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
      });

      it("does not allow modifications mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // advance to start time + 1 second
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset + 1,
        ]);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("30")
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              future,
              config.defaultHalfLife,
              config.startingPrice,
              config.basePrice
            ),
          "No modifications mid-auction"
        );
      });

      it("does not allow base price of zero", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("50")
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              future,
              config.defaultHalfLife,
              config.startingPrice,
              ethers.BigNumber.from("0")
            ),
          "Base price must be non-zero"
        );
      });

      it("updates local cached maxInvocations values if using core contract values", async function () {
        const config = await loadFixture(_beforeEach);
        // sync maxInvocations to core contract value
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.maxInvocations
          );
        // reduce maxInvocations in core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // set auction details again
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        const future = ethers.BigNumber.from("2").pow(
          ethers.BigNumber.from("50")
        );
        // expect maxInvocations to be stale relative to core contract
        const initialProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(initialProjectConfig.maxInvocations).to.equal(15);
        await config.minter
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            future,
            config.defaultHalfLife,
            config.startingPrice,
            config.basePrice
          );
        // expect maxInvocations to have been re-synced with core contract
        const afterProjectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(afterProjectConfig.maxInvocations).to.equal(1);
      });
    });

    describe("setProjectMaxInvocations", async function () {
      it("reverts when artist calls setProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .setProjectMaxInvocations(config.projectZero),
          "Not implemented"
        );
      });

      it("does not allow deployer or user to call setProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .setProjectMaxInvocations(config.projectZero),
          "Only Artist"
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .setProjectMaxInvocations(config.projectZero),
          "Only Artist"
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations (1 of 2)", async function () {
      it("only allows input _maxInvocations to be gt 0", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(config.projectZero, 0),
          "Only max invocations gt 0"
        );
      });

      it("reverts when attempting to reset maxHasBeenInvoked after it's been set to true locally", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const projectMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectMaxInvocations(config.projectZero);
        expect(projectMaxInvocations).to.equal(1);

        // mint a token
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // sync max invocations from core to minter
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations
            ),
          "Max invocations already reached"
        );
      });

      it("safely syncs hasMaxBeenInvoked during withdraw revenues function, respecting the manually configured limit", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        const projectMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .projectMaxInvocations(config.projectZero);
        expect(projectMaxInvocations).to.equal(1);

        // mint a token
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // artist can withdraw funds because minter safely syncs hasMaxBeenInvoked in withdrawal function.
        // the safe sync will not increase the manually configured local maxInvocation limit on the minter.
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
      });
    });

    describe("Invocations reduction on core mid-auction", async function () {
      it("does not prevent revenue withdrawals if artist reduces max invocations to current invocations on core contract mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        // models the following situation:
        // - auction is not sold out
        // artist reduces maxInvocations on core contract, completing the project
        // desired state:
        // - artist is able to withdraw revenue until end of auction
        // - "latestPurchasePrice" price should reflect the last purchased token
        // note: config test highlights a different behavior from DA w/Settlement V1 and V0. Although config would be suspicious behavior by the artist,
        // in V1 and V0, the artist could set maxInvocations to (invocations + 1) on core, purchase one token, and achieve the same effect.
        // This test, therefore, is simply to confirm the behavior of the V2 (and on) minter.
        const originalBalanceArtist = await config.accounts.artist.getBalance();
        const originalBalanceUser = await config.accounts.user.getBalance();

        // purchase a couple tokens (at zero gas fee), do not sell out auction
        await purchaseTokensMidAuction(config, config.projectZero);
        // get current invocations on project
        const projectState = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        const invocations = projectState.invocations;
        // artist reduces invocations on core contract
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, invocations, {
            gasPrice: 0,
          });
        // artist should be able to withdraw revenue
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero, { gasPrice: 0 });
        // latestPurchasePrice is > base price
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.latestPurchasePrice).to.be.gt(
          projectConfig.basePrice
        );
        // advance past end of auction, so base price becomes base price
        await ethers.provider.send("evm_mine", [
          config.startTime +
            config.auctionStartTimeOffset +
            config.defaultHalfLife * 10,
        ]);
        // user should be able to withdraw settlement as if sellout price was auction latest purchase price
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFunds(config.projectZero, {
            gasPrice: 0,
          });
        // user balance should reflect proper settlement amount
        const newBalanceArtist = await config.accounts.artist.getBalance();
        const newBalanceUser = await config.accounts.user.getBalance();
        // artist should have received 90% of total revenue (10% went to Art Blocks), or 80% of total revenue if engine
        const targetArtistPercentage = config.isEngine ? 80 : 90;
        const targetArtistRevenue = projectConfig.latestPurchasePrice
          .mul(targetArtistPercentage)
          .div(100)
          .mul(2); // 2 tokens purchased
        const roundingError = newBalanceArtist
          .sub(originalBalanceArtist.add(targetArtistRevenue))
          .abs();
        expect(roundingError).to.be.lt(
          ethers.BigNumber.from("3") // 2 wei is negligible
        );
        const totalRevenue = projectConfig.latestPurchasePrice.mul(2); // 2 tokens purchased
        // user should have spent 100% of total revenue (100% came from config user)
        expect(newBalanceUser).to.be.equal(
          originalBalanceUser.sub(projectConfig.latestPurchasePrice.mul(2))
        );
      });

      it("does not prevent revenue withdrawals if artist reduces max invocations to current invocations on core contract mid-auction2", async function () {
        const config = await loadFixture(_beforeEach);
        // models the following situation:
        // - auction is not sold out
        // - auction is reset by admin
        // artist reduces maxInvocations on core contract, completing the project
        // desired state:
        // - artist be able to withdraw revenue
        // - "latestPurchasePrice" price should reflect the last purchased token price
        // (overall config is a very odd situation to be in, but we want to make sure no
        // funds are lost or stuck in the contract)
        // note: config test highlights a different behavior from DA w/Settlement V1 and V0. Although config would be suspicious behavior by the artist,
        // in V1 and V0, the artist could set maxInvocations to (invocations + 1) on core, purchase one token, and achieve the same effect.
        // This test, therefore, is simply to confirm the behavior of the V2 (and on) minter.
        const originalBalanceArtist = await config.accounts.artist.getBalance();
        const originalBalanceUser = await config.accounts.user.getBalance();

        // purchase a couple tokens (at zero gas fee), do not sell out auction
        await purchaseTokensMidAuction(config, config.projectZero);
        // admin resets auction
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        // get current invocations on project
        const projectState = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        const invocations = projectState.invocations;
        // artist reduces invocations on core contract
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, invocations, {
            gasPrice: 0,
          });
        // artist should be able to withdraw revenue
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero, { gasPrice: 0 });

        // latestPurchasePrice is > base price (base price is currently 0 after calling resetAuctionDetails)
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.latestPurchasePrice).to.be.gt(
          projectConfig.basePrice
        );
        // user should be able to withdraw settlement as if sellout price was latestPurchasePrice
        await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", [
          "0x0",
        ]);
        await config.minter
          .connect(config.accounts.user)
          .reclaimProjectExcessSettlementFunds(config.projectZero, {
            gasPrice: 0,
          });
        // user balance should reflect proper settlement amount
        const newBalanceArtist = await config.accounts.artist.getBalance();
        const newBalanceUser = await config.accounts.user.getBalance();
        // artist should have received 90% of total revenue (10% went to Art Blocks), or 80% of total revenue if engine
        const targetArtistPercentage = config.isEngine ? 80 : 90;
        const targetArtistRevenue = projectConfig.latestPurchasePrice
          .mul(targetArtistPercentage)
          .div(100)
          .mul(2); // 2 tokens purchased
        const roundingError = newBalanceArtist
          .sub(originalBalanceArtist.add(targetArtistRevenue))
          .abs();
        expect(roundingError).to.be.lt(
          ethers.BigNumber.from("3") // 2 wei is negligible
        );
        // user should have spent 100% of total revenue (100% came from config user)
        const totalRevenue = projectConfig.latestPurchasePrice.mul(2); // 2 tokens purchased
        expect(newBalanceUser).to.be.equal(
          originalBalanceUser.sub(projectConfig.latestPurchasePrice.mul(2))
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations (2 of 2)", async function () {
      it("only artist", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations
            ),
          "Only Artist"
        );
      });

      it("reverts when setting minter local max invocations to value greater than core contract max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations + 1
            ),
          "Cannot increase project max invocations above core contract set project max invocations"
        );
      });

      it("reverts when setting minter local max invocations to value less than current invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              projectStateData.invocations - 1
            ),
          "Cannot set project max invocations to less than current invocations"
        );
      });

      it("allows setting minter local max invocations equal to current invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        // no revert
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations
          );
      });

      it("updates state of projectConfig after manually limiting minter local max invocations to current invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // limit invocations == current invocations
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations
          );
        // projectConfig should reflect new max invocations
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.maxHasBeenInvoked).to.be.true;
        expect(projectConfig.maxInvocations).to.be.equal(
          projectStateData.invocations
        );
      });

      it("updates state of projectConfig after manually limiting minter local max invocations to current invocations + 1", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // limit invocations == current invocations
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // projectConfig should reflect new max invocations
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.maxHasBeenInvoked).to.be.false;
        expect(projectConfig.maxInvocations).to.be.equal(
          projectStateData.invocations.add(ethers.BigNumber.from("1"))
        );
        // purchase should be successful
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
            }),
          "Maximum number of invocations reached"
        );
        // artist should be able to withdraw revenues
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
      });

      it("enforces local max invocations after manually limiting minter local max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // limit invocations == current invocations
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // one more purchase should be successful
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
            }),
          "Maximum number of invocations reached"
        );
      });

      it("prevents increasing max invocations after max invocations reached when minting", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // limit invocations == current invocations
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations.add(ethers.BigNumber.from("1"))
          );
        // one more purchase should be successful
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });
        // susequent purchase should revert
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
            }),
          "Maximum number of invocations reached"
        );
        // cannot update max invocations after already reached
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations
            ),
          "Max invocations already reached"
        );
      });

      it("does NOT allow changing of max invocations after already reached", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // limit invocations == current invocations
        const projectStateData = await config.genArt721Core.projectStateData(
          config.projectZero
        );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            projectStateData.invocations
          );
        // artist gets revert when setting max invocations back to core contract's max invocations
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.maxInvocations
            ),
          "Max invocations already reached"
        );
      });

      it("allows withdrawals even when sellout not known locally, and using local max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        // manually limit max invocations to 2 on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await config.minter
          .connect(config.accounts.user)
          .purchase_H4M(config.projectZero, {
            value: config.startingPrice,
          });
        // reduce max invocations to 1 on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // minter state is stale due to caching
        let projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.maxHasBeenInvoked).to.be.false; // incorrect state due to caching
        expect(projectConfig.maxInvocations).to.be.equal(2); // incorrect state due to caching
        // minter should allow withdrawls because it syncs with core contract maxInvocations
        // during withdrawArtistAndAdminRevenues (i.e. updates local max invocations from being in illogical state)
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(config.projectZero);
        // minter state should be updated to reflect sellout
        projectConfig = await config.minter.projectConfig(config.projectZero);
        expect(projectConfig.maxHasBeenInvoked).to.be.true; // correct state after sync
        expect(projectConfig.maxInvocations).to.be.equal(1); // correct state after sync
      });
    });

    describe("getPriceInfo", async function () {
      it("returns price of zero for unconfigured auction", async function () {
        const config = await loadFixture(_beforeEach);
        // projectOne is not configured
        const priceInfo = await config.minter.getPriceInfo(config.projectOne);
        expect(priceInfo.isConfigured).to.be.false;
        expect(priceInfo.tokenPriceInWei).to.be.equal(0);
      });

      it("returns correct price before configured auction", async function () {
        const config = await loadFixture(_beforeEach);
        const priceInfo = await config.minter.getPriceInfo(config.projectZero);
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.be.equal(config.startingPrice);
      });

      it("returns correct price after sellout", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutMidAuction(config, config.projectZero);
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset * 10,
        ]);
        // price should be the same as the sellout price
        const priceInfo = await config.minter
          .connect(config.accounts.artist)
          .getPriceInfo(config.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(latestPurchasePrice);
        expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
      });

      it("returns correct price after sellout not known locally, when not using local max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce max invocations to 2
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 2);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await config.minter
          .connect(config.accounts.user)
          .purchase_H4M(config.projectZero, {
            value: config.startingPrice,
          });
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        const latestPurchasePrice = await projectConfig.latestPurchasePrice;
        // reduce max invocations to 1 on core contract
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset * 10,
        ]);
        // price should be the same as the sellout price
        const priceInfo = await config.minter
          .connect(config.accounts.artist)
          .getPriceInfo(config.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(latestPurchasePrice);
        expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
      });

      it("returns correct price after sellout not known locally, when using local max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        // reduce max invocations to 2 on local minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        // advance to auction start time
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        // purchase one piece, not sellout
        await config.minter
          .connect(config.accounts.user)
          .purchase_H4M(config.projectZero, {
            value: config.startingPrice,
          });
        // update max invocations on core contract to 1, but minter should not know about it
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        const selloutPrice = projectConfig.latestPurchasePrice;
        expect(projectConfig.maxHasBeenInvoked).to.be.false; // minter does not know about sellout, so state is false
        // advance in time to where price would have decreased if not sellout
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset * 10,
        ]);
        // get price info should handle the cache discrepancy and return the correct price,
        // which is the sellout price (latestPurchasePrice)
        const priceInfo = await config.minter.getPriceInfo(config.projectZero);
        expect(priceInfo.tokenPriceInWei).to.be.equal(selloutPrice);
      });
    });

    describe("adminEmergencyReduceSelloutPrice", async function () {
      it("requires auction to be complete", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminEmergencyReduceSelloutPrice(config.projectZero, 1),
          "Auction must be complete"
        );
      });

      it("requires new sellout price of greater than zero", async function () {
        const config = await loadFixture(_beforeEach);
        await selloutMidAuction(config, config.projectZero);
        // reset auction details to get base price to zero
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        // do not allow sellout price to be zero
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .adminEmergencyReduceSelloutPrice(config.projectZero, 0),
          "Only sellout prices > 0"
        );
      });
    });

    describe("resetAuctionDetails", async function () {
      it("doesn't lock latest purchase price to zero in edge case after resetting auction details after partial auction completion", async function () {
        const config = await loadFixture(_beforeEach);
        await purchaseTokensMidAuction(config, config.projectZero);
        // use local max invocations to get "sellout" to true
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 2);
        // reset auction details to get base price to zero
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(config.projectZero);
        // now base price == 0, and sellout == true, but artist should still be able to withdraw revenues at non-zero latest price
        await config.minter
          .connect(config.accounts.deployer)
          .withdrawArtistAndAdminRevenues(config.projectZero);
        const projectConfig = await config.minter.projectConfig(
          config.projectZero
        );
        expect(projectConfig.latestPurchasePrice).to.be.gt(0);
      });
    });

    describe("purchase", async function () {
      it("does not allow purchases even if local max invocations value is returning a false negative", async function () {
        const config = await loadFixture(_beforeEach);
        // set local max invocations to 1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(config.projectZero, 1);
        // switch to different minter
        const setPriceFactory =
          await ethers.getContractFactory("MinterSetPriceV4");
        const setPriceMinter = await setPriceFactory.deploy(
          config.genArt721Core.address,
          config.minterFilter.address
        );
        await config.minterFilter.addApprovedMinter(setPriceMinter.address);
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, setPriceMinter.address);
        // purchase a token on the new minter
        await setPriceMinter
          .connect(config.accounts.artist)
          .updatePricePerTokenInWei(
            config.projectZero,
            ethers.utils.parseEther("0")
          );
        await setPriceMinter
          .connect(config.accounts.artist)
          .purchase(config.projectZero);
        // switch back to original minter
        await config.minterFilter
          .connect(config.accounts.artist)
          .setMinterForProject(0, config.minter.address);
        // purchase a token on the original minter
        // advance to start of auction
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, {
              value: config.startingPrice,
            }),
          "Maximum number of invocations reached"
        );
      });
    });

    describe("calculate gas", async function () {
      it("mints and calculates gas values [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        await ethers.provider.send("evm_mine", [
          config.startTime + config.auctionStartTimeOffset,
        ]);

        const tx = await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, {
            value: config.startingPrice,
          });

        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const txCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
        console.log(
          "Gas cost for a successful Exponential DA mint: ",
          ethers.utils.formatUnits(txCost.toString(), "ether").toString(),
          "ETH"
        );
        // assuming a cost of 100 GWEI
        // skip gas tests for engine, flagship is sufficient to identify gas cost changes
        if (!config.isEngine) {
          requireBigNumberIsClose(txCost, ethers.utils.parseEther("0.0154846"));
        }
      });
    });

    describe("isEngine", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const coreType = await config.genArt721Core.coreType();
        expect(coreType === "GenArt721CoreV3").to.be.equal(!config.isEngine);
      });
    });
  });
}

// single-iteration tests with mock core contract(s)
describe(`${TARGET_MINTER_NAME} tests using mock core contract(s)`, async function () {
  async function _beforeEach() {
    let config: T_Config = {
      accounts: await getAccounts(),
    };
    config = await assignDefaultConstants(config);
    return config;
  }

  describe("constructor", async function () {
    it("requires correct quantity of return values from `getPrimaryRevenueSplits`", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy and configure core contract that returns incorrect quanty of return values for coreType response
      const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
      const { genArt721Core, minterFilter, randomizer } =
        await deployCoreWithMinterFilter(
          config,
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
