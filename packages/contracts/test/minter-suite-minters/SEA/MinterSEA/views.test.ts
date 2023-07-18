import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

import { initializeProjectZeroTokenZeroAuctionAndSettle } from "./helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";
const TARGET_MINTER_VERSION = "v1.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // {
  //   core: "GenArt721CoreV3_Explorations",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine",
  // },
  // {
  //   core: "GenArt721CoreV3_Engine_Flex",
  // },
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

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );

        // mint a token to next slot
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            0, // start timestamp
            600, // auction duration
            config.pricePerTokenInWei, // price
            5 // bid increment percentage
          );

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

        // settle token auction to trigger isEngine caching
        await initializeProjectZeroTokenZeroAuctionAndSettle(config);

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
  });
});
