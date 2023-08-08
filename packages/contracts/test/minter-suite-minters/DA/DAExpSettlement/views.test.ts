import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import {
  configureProjectZeroAuction,
  configureProjectZeroAuctionAndAdvanceOneDay,
  configureProjectZeroAuctionAndAdvanceToStart,
  configureProjectZeroAuctionAndSellout,
} from "./helpers";
import { Common_Views } from "../../common.views";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDAExpSettlementV3";
const TARGET_MINTER_VERSION = "v3.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  {
    core: "GenArt721CoreV3_Explorations",
  },
  {
    core: "GenArt721CoreV3_Engine",
  },
  {
    core: "GenArt721CoreV3_Engine_Flex",
  },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Views w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      // Project setup
      await safeAddProject(
        config.genArt721Core,
        config.accounts.deployer,
        config.accounts.artist.address
      );
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
        .toggleProjectIsPaused(config.projectZero);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.defaultHalfLife = 60; // seconds
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      // some tests assume project one to be "configured"
      await config.minter
        .connect(config.accounts.artist)
        .setAuctionDetails(
          config.projectOne,
          config.genArt721Core.address,
          config.startTime,
          config.defaultHalfLife,
          config.startingPrice,
          config.basePrice
        );

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    describe("Common Minter Views Tests", async function () {
      await Common_Views(_beforeEach);
    });

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        let result = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(true);
      });
    });

    describe("isEngineView", async function () {
      it("uses cached value when available", async function () {
        const config = await loadFixture(_beforeEach);

        // purchase token and withdrawArtistAndAdminRevenues to trigger isEngine caching
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
        await config.minter
          .connect(config.accounts.artist)
          .withdrawArtistAndAdminRevenues(
            config.projectZero,
            config.genArt721Core.address
          );

        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("minterType", async function () {
      it("correctly reports minterType", async function () {
        const config = await loadFixture(_beforeEach);
        const minterType = await config.minter.minterType();
        expect(minterType).to.equal(TARGET_MINTER_NAME);
      });
    });

    describe("getPriceInfo", async function () {
      it("returns correct price of zero when unconfigured auction", async function () {
        const config = await loadFixture(_beforeEach);
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(false);
        expect(priceInfo.tokenPriceInWei).to.equal(0);
      });

      it("returns correct price mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        let priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(config.startingPrice);
        // advance exactly one half life and check that price is halved
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultHalfLife,
        ]);
        priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        const targetPriceAfterOneHalfLife = config.startingPrice.div(2);
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(targetPriceAfterOneHalfLife);
        // advance exactly 1.5 half lives, and check that price is down another 25%
        // @dev this ensures that between half life points, the price is decaying linearly as expected
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultHalfLife * 1.5,
        ]);
        priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        const targetPriceAfterOneAndAHalfHalfLives = targetPriceAfterOneHalfLife
          .mul(3)
          .div(4);
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(
          targetPriceAfterOneAndAHalfHalfLives
        );
        // advance exactly 2 half lives, and check that price is down to 1/4 of starting price
        await ethers.provider.send("evm_mine", [
          config.startTime + config.defaultHalfLife * 2,
        ]);
        priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        const targetPriceAfterTwoHalfLives = config.startingPrice.div(4);
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(
          targetPriceAfterTwoHalfLives
        );
      });

      it("returns correct price after auction", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceOneDay(config);
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
      });

      it("returns last sale price after sellout mid-auction", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndSellout(config);
        // advance past auction end time to check that time does not affect returned price
        await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        // we didn't record exact purchase price, but ensuring it is greater than base price
        // is sufficient to ensure that it is the last sale price
        expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
      });

      it("returns last sale price after core max invocations hit, stale minter max invocations", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // set minter max invocations to >1
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            15
          );
        // set core contract max invocations to 1
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, 1);
        // purchase token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });

        // advance past auction end time to check that time does not affect returned price
        await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.equal(true);
        // we didn't record exact purchase price, but ensuring it is greater than base price
        // is sufficient to ensure that it is the last sale price
        expect(priceInfo.tokenPriceInWei).to.be.gt(config.basePrice);
      });
    });

    describe("minimumPriceDecayHalfLifeSeconds", async function () {
      it("returns correct initial value", async function () {
        const config = await loadFixture(_beforeEach);
        const minimumPriceDecayHalfLifeSeconds =
          await config.minter.minimumPriceDecayHalfLifeSeconds();
        expect(minimumPriceDecayHalfLifeSeconds).to.equal(45);
      });
    });

    describe("projectAuctionParameters", async function () {
      it("returns correct unconfigured values", async function () {
        const config = await loadFixture(_beforeEach);
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectAuctionParameters.timestampStart).to.equal(0);
        expect(projectAuctionParameters.priceDecayHalfLifeSeconds).to.equal(0);
        expect(projectAuctionParameters.startPrice.toString()).to.equal("0");
        expect(projectAuctionParameters.basePrice.toString()).to.equal("0");
      });

      it("returns correct configured values", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuction(config);
        const projectAuctionParameters =
          await config.minter.projectAuctionParameters(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectAuctionParameters.timestampStart).to.equal(
          config.startTime
        );
        expect(projectAuctionParameters.priceDecayHalfLifeSeconds).to.equal(
          config.defaultHalfLife
        );
        expect(projectAuctionParameters.startPrice).to.equal(
          config.startingPrice
        );
        expect(projectAuctionParameters.basePrice).to.equal(config.basePrice);
      });
    });

    describe("getProjectLatestPurchasePrice", async function () {
      it("returns zero if no purchases have been made", async function () {
        const config = await loadFixture(_beforeEach);
        const projectLatestPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectLatestPurchasePrice).to.equal(0);
      });

      it("returns latest purchase price after each purchase", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // verify initial state
        const initialProjectLatestPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(initialProjectLatestPurchasePrice).to.equal(0);
        // purchase token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // verify state is updated
        const projectLatestPurchasePrice1 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectLatestPurchasePrice1).to.be.gt(0);
        // purchase second token one minute later
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // verify state is updated
        const projectLatestPurchasePrice2 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectLatestPurchasePrice2).to.be.gt(0);
        expect(projectLatestPurchasePrice2).to.be.lt(
          projectLatestPurchasePrice1
        );
      });

      it("returns latest purchase price even during a reset state", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // verify initial state
        const initialProjectLatestPurchasePrice =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(initialProjectLatestPurchasePrice).to.equal(0);
        // purchase token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // verify state is updated
        const projectLatestPurchasePrice1 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectLatestPurchasePrice1).to.be.gt(0);
        // auction is reset after 1 minute
        await ethers.provider.send("evm_mine", [config.startTime + ONE_MINUTE]);
        await config.minter
          .connect(config.accounts.deployer)
          .resetAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        // verify latest purchase price is still the same
        const projectLatestPurchasePrice2 =
          await config.minter.getProjectLatestPurchasePrice(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectLatestPurchasePrice2).to.equal(
          projectLatestPurchasePrice1
        );
      });
    });

    describe("getNumSettleableInvocations", async function () {
      it("returns zero if no purchases have been made", async function () {
        const config = await loadFixture(_beforeEach);
        const numSettleableInvocations =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(numSettleableInvocations).to.equal(0);
      });

      it("returns value if settleable purchase has been made", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        const numSettleableInvocations =
          await config.minter.getNumSettleableInvocations(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(numSettleableInvocations).to.equal(1);
      });
    });

    describe("getProjectExcessSettlementFunds", async function () {
      it("does not allow query of zero address", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            ethers.constants.AddressZero
          ),
          revertMessages.noZeroAddress
        );
      });

      it("reverts when no purchases made", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          ),
          revertMessages.noPurchasesMade
        );
      });

      it("returns expected values when purchase has been made", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice.add(1), // add 1 to ensure excess funds
          });
        const excessSettlementFunds =
          await config.minter.getProjectExcessSettlementFunds(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address
          );
        expect(excessSettlementFunds).to.be.gt(0);
      });
    });
  });
});
