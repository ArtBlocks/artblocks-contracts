import { expect } from "chai";
import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

import {
  initializeProjectZeroTokenZeroAuctionAndSettle,
  initializeProjectZeroTokenZeroAuction,
  initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd,
} from "./helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { Logger } from "@ethersproject/logger";
import { revertMessages } from "../../constants";
import { constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

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

      // configure project zero
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter
      await config.minter
        .connect(config.accounts.artist)
        .configureFutureAuctions(
          config.projectZero,
          config.genArt721Core.address,
          config.startTime,
          config.defaultAuctionLengthSeconds,
          config.pricePerTokenInWei,
          config.bidIncrementPercentage
        );

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    describe("isEngineView", async function () {
      it("uses cached value when available", async function () {
        const config = await loadFixture(_beforeEach);

        // settle token auction to trigger isEngine caching
        await initializeProjectZeroTokenZeroAuctionAndSettle(config);

        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });

      it("fetches value when not cached", async function () {
        const config = await loadFixture(_beforeEach);

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
        const minterVersion = await config.minter.minterType();
        expect(minterVersion).to.equal(TARGET_MINTER_NAME);
      });
    });

    describe("minterConfigurationDetails", async function () {
      it("returns correct configuration details", async function () {
        const config = await loadFixture(_beforeEach);
        const minterConfigurationDetails =
          await config.minter.minterConfigurationDetails();
        expect(minterConfigurationDetails.minAuctionDurationSeconds).to.equal(
          60
        );
        expect(minterConfigurationDetails.minterTimeBufferSeconds).to.equal(
          120
        );
        expect(minterConfigurationDetails.minterRefundGasLimit).to.equal(
          30_000
        );
      });
    });

    describe("maxInvocationsProjectConfig", async function () {
      it("returns expected values for uninitialized project", async function () {
        const config = await loadFixture(_beforeEach);
        const maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(0);
      });

      it("returns expected values for initialized project", async function () {
        const config = await loadFixture(_beforeEach);
        const maxInvocationsProjectConfig =
          await config.minter.maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxHasBeenInvoked).to.equal(false);
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(1_000_000);
      });
    });

    describe("projectMaxHasBeenInvoked", async function () {
      it("returns expected false", async function () {
        const config = await loadFixture(_beforeEach);
        const projectMaxHasBeenInvoked =
          await config.minter.projectMaxHasBeenInvoked(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxHasBeenInvoked).to.equal(false);
      });

      it("returns expected true", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const projectMaxHasBeenInvoked =
          await config.minter.projectMaxHasBeenInvoked(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectMaxHasBeenInvoked).to.equal(true);
      });
    });

    describe("projectMaxInvocations", async function () {
      it("returns expected value", async function () {
        const config = await loadFixture(_beforeEach);
        const projectMaxInvocations = await config.minter.projectMaxInvocations(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(projectMaxInvocations).to.equal(1_000_000);
      });
    });

    describe("SEAProjectConfigurationDetails", async function () {
      it("returns default struct for unconfigured project", async function () {
        const config = await loadFixture(_beforeEach);
        const SEAProjectConfigurationDetails =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectOne,
            config.genArt721Core.address
          );
        expect(SEAProjectConfigurationDetails.timestampStart).to.equal(0);
        expect(SEAProjectConfigurationDetails.auctionDurationSeconds).to.equal(
          0
        );
        expect(
          SEAProjectConfigurationDetails.minBidIncrementPercentage
        ).to.equal(0);
        expect(SEAProjectConfigurationDetails.nextTokenNumber).to.equal(0);
        expect(SEAProjectConfigurationDetails.nextTokenNumberIsPopulated).to.be
          .false;
        expect(SEAProjectConfigurationDetails.basePrice).to.equal(0);
        // @dev check two fields on auction is sufficient to confirm struct is default
        expect(SEAProjectConfigurationDetails.activeAuction.tokenId).to.equal(
          0
        );
        expect(SEAProjectConfigurationDetails.activeAuction.endTime).to.equal(
          0
        );
      });

      it("returns populated struct for configured project", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuction(config);
        // verify view response
        const SEAProjectConfigurationDetails =
          await config.minter.SEAProjectConfigurationDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(SEAProjectConfigurationDetails.timestampStart).to.be.gt(0);
        expect(SEAProjectConfigurationDetails.auctionDurationSeconds).to.equal(
          config.defaultAuctionLengthSeconds
        );
        expect(
          SEAProjectConfigurationDetails.minBidIncrementPercentage
        ).to.equal(config.bidIncrementPercentage);
        expect(SEAProjectConfigurationDetails.nextTokenNumber).to.equal(1);
        expect(SEAProjectConfigurationDetails.nextTokenNumberIsPopulated).to.be
          .true;
        expect(SEAProjectConfigurationDetails.basePrice).to.equal(
          config.basePrice
        );
        // check fields on auction
        expect(SEAProjectConfigurationDetails.activeAuction.tokenId).to.equal(
          0
        );
        expect(
          SEAProjectConfigurationDetails.activeAuction.currentBid
        ).to.equal(config.basePrice);
        expect(
          SEAProjectConfigurationDetails.activeAuction.currentBidder
        ).to.equal(config.accounts.user.address);
        expect(SEAProjectConfigurationDetails.activeAuction.endTime).to.be.gt(
          0
        );
        expect(
          SEAProjectConfigurationDetails.activeAuction.minBidIncrementPercentage
        ).to.equal(config.bidIncrementPercentage);
        expect(SEAProjectConfigurationDetails.activeAuction.settled).to.be
          .false;
      });
    });

    describe("projectActiveAuctionDetails", async function () {
      it("reverts if no auction exists for the project", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.projectActiveAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          ),
          revertMessages.noAuction
        );
      });

      it("returns expected values for active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuction(config);
        // verify view response
        const auctionDetails = await config.minter.projectActiveAuctionDetails(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(auctionDetails.tokenId).to.equal(0);
        expect(auctionDetails.currentBid).to.equal(config.basePrice);
        expect(auctionDetails.currentBidder).to.equal(
          config.accounts.user.address
        );
        expect(auctionDetails.endTime).to.be.gt(0);
        expect(auctionDetails.minBidIncrementPercentage).to.equal(
          config.bidIncrementPercentage
        );
        expect(auctionDetails.settled).to.be.false;
      });
    });

    describe("getTokenToBid", async function () {
      it("reverts for unconfigured project with no next token", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.getTokenToBid(
            config.projectOne,
            config.genArt721Core.address
          ),
          revertMessages.nextTokenNotPopulated
        );
      });

      it("returns expected value for configured project with active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuction(config);
        // verify view response
        const tokenToBid = await config.minter.getTokenToBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(tokenToBid).to.equal(0);
      });

      it("returns expected value for configured project with ended, non-settled auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // verify view response
        const tokenToBid = await config.minter.getTokenToBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(tokenToBid).to.equal(1);
      });

      it("returns expected value for configured project with settled auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuctionAndSettle(config);
        // verify view response
        const tokenToBid = await config.minter.getTokenToBid(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(tokenToBid).to.equal(1);
      });
    });

    describe("getNextTokenId", async function () {
      it("reverts for unconfigured project with no next token", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter.getNextTokenId(
            config.projectOne,
            config.genArt721Core.address
          ),
          revertMessages.nextTokenNotPopulated
        );
      });

      it("returns expected value for configured project with no active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // verify view response
        const nextToken = await config.minter.getNextTokenId(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(nextToken).to.equal(0);
      });

      it("returns expected value for configured project with active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure auction
        await initializeProjectZeroTokenZeroAuction(config);
        // verify view response
        const nextToken = await config.minter.getNextTokenId(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(nextToken).to.equal(1);
      });
    });

    describe("getPriceInfo", async function () {
      it("returns expected value for unconfigured project", async function () {
        const config = await loadFixture(_beforeEach);
        // verify view response
        const priceInfo = await config.minter.getPriceInfo(
          config.projectOne,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.false;
        expect(priceInfo.tokenPriceInWei).to.equal(0);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns expected value for configured project without active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // verify view response
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns expected value for configured project with active auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure and start auction
        await initializeProjectZeroTokenZeroAuction(config);
        const minNextBidValue = config.basePrice
          .mul(config.bidIncrementPercentage + 100)
          .div(100);
        // verify view response
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(minNextBidValue);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns expected value for configured project with ended auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure and start auction
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        // verify view response
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });

      it("returns expected value for configured project with ended, settled auction", async function () {
        const config = await loadFixture(_beforeEach);
        // also configure and start auction
        await initializeProjectZeroTokenZeroAuctionAndSettle(config);
        // verify view response
        const priceInfo = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(priceInfo.isConfigured).to.be.true;
        expect(priceInfo.tokenPriceInWei).to.equal(config.basePrice);
        expect(priceInfo.currencySymbol).to.equal("ETH");
        expect(priceInfo.currencyAddress).to.equal(constants.AddressZero);
      });
    });
  });
});
