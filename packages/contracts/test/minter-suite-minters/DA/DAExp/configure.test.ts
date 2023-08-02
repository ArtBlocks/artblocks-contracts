import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { configureProjectZeroAuctionAndAdvanceToStart } from "./helpers";
import { Common_Configure } from "../../common.configure";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDAExpV5";
const TARGET_MINTER_VERSION = "v5.0.0";

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
  describe(`${TARGET_MINTER_NAME} Configure w/ core ${params.core}`, async function () {
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
        .connect(config.accounts.deployer)
        .toggleProjectIsActive(config.projectOne);

      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectZero);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .toggleProjectIsPaused(config.projectOne);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.defaultHalfLife = 60; // seconds
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      return config;
    }

    describe("Common Minter Configure Tests", async function () {
      await Common_Configure(_beforeEach);
    });

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("resets maxHasBeenInvoked after it's been set to true locally and then max project invocations is synced from the core contract", async function () {
        const config = await loadFixture(_beforeEach);
        // configure auction
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // reduce local maxInvocations to 1 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const maxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(maxInvocationsProjectConfig.maxInvocations).to.equal(1);
        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });
        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;
        // sync max invocations from core to minter
        await config.minter
          .connect(config.accounts.artist)
          .syncProjectMaxInvocationsToCore(
            config.projectZero,
            config.genArt721Core.address
          );
        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;
        // expect maxInvocations on the minter to be 15
        const syncedMaxInvocationsProjectConfig = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(syncedMaxInvocationsProjectConfig.maxInvocations).to.equal(15);
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("appropriately sets maxHasBeenInvoked after calling manuallyLimitProjectMaxInvocations", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        // reduce local maxInvocations to 2 on minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);

        // mint a token
        await config.minter
          .connect(config.accounts.user)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.startingPrice,
          });

        // expect projectMaxHasBeenInvoked to be true
        const hasMaxBeenInvoked = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked).to.be.true;

        // increase invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            3
          );

        // expect maxInvocations on the minter to be 3
        const localMaxInvocations2 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations2.maxInvocations).to.equal(3);

        // expect projectMaxHasBeenInvoked to now be false
        const hasMaxBeenInvoked2 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked2).to.be.false;

        // reduce invocations on the minter
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );

        // expect maxInvocations on the minter to be 1
        const localMaxInvocations3 = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations3.maxInvocations).to.equal(1);

        // expect projectMaxHasBeenInvoked to now be true
        const hasMaxBeenInvoked3 = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(hasMaxBeenInvoked3).to.be.true;
      });

      it("enforces project max invocations set on minter", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuctionAndAdvanceToStart(config);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        // revert during purchase
        await expectRevert(
          config.minter
            .connect(config.accounts.user)
            .purchase(config.projectZero, config.genArt721Core.address, {
              value: config.startingPrice,
            }),
          revertMessages.maximumInvocationsReached
        );
      });
    });

    // TODO: Add more tests
  });
});
