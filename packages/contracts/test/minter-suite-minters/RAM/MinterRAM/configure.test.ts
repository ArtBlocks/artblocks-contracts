import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { ethers } from "hardhat";
import { revertMessages } from "../../constants";
import { Logger } from "@ethersproject/logger";
import {
  initializeMinBidInProjectZeroAuction,
  mintTokenOnDifferentMinter,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
  // TODO uncomment all cores
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

      config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
        ethers.utils.parseEther("0.1")
      );

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
        .updateProjectMaxInvocations(config.projectZero, 15);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("syncProjectMaxInvocationsToCore", async function () {
      it("reverts", async function () {
        const config = await loadFixture(_beforeEach);

        // sync max invocations from core to minter
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            ),
          revertMessages.actionNotSupported
        );
      });
    });

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("reverts when non-artist calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyArtist
        );
      });

      it("allows artist to call", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
      });

      it("reverts when not in State A", async function () {
        const config = await loadFixture(_beforeEach);
        await initializeMinBidInProjectZeroAuction(config);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              1
            ),
          revertMessages.onlyStateA
        );
      });

      it("updates project's max invocations", async function () {
        const config = await loadFixture(_beforeEach);
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
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(false);
      });

      it("updates num tokens in auction when invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(1);
      });

      it("updates num tokens in auction when no invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        const auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(0);
      });

      it("updates max invocation state when no invocations remain", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            0
          );
        const localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(0);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(true);
      });

      it("updates state as expected when previous invocations exist", async function () {
        const config = await loadFixture(_beforeEach);
        await mintTokenOnDifferentMinter(config);
        // set max invocations to 1 allowed, but maxHasBeenInvoked = true
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        let localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(1);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(true);
        let auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(0);
        // set max invocations to 0 not allowed (exceeds max invocations on core)
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              0
            ),
          revertMessages.invalidMaxInvocations
        );
        // set max invocations to 2 allowed, now maxHasBeenInvoked = false
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            2
          );
        localMaxInvocations = await config.minter
          .connect(config.accounts.artist)
          .maxInvocationsProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(localMaxInvocations.maxInvocations).to.equal(2);
        expect(localMaxInvocations.maxHasBeenInvoked).to.equal(false);
        auctionDetails = await config.minter
          .connect(config.accounts.artist)
          .getAuctionDetails(config.projectZero, config.genArt721Core.address);
        expect(auctionDetails.numTokensInAuction).to.equal(1);
      });
    });

    describe("updateRefundGasLimit", async function () {
      it("reverts non-admin calls", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.artist)
            .updateRefundGasLimit(6_999),
          revertMessages.onlyMinterFilterACL
        );
      });

      it("reverts if value < 7_000", async function () {
        const config = await loadFixture(_beforeEach);
        await expectRevert(
          config.minter
            .connect(config.accounts.deployer)
            .updateRefundGasLimit(6_999),
          revertMessages.onlyGte7000
        );
      });

      it("updates state when successful", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.deployer)
          .updateRefundGasLimit(7_001);
        // validate state update
        const minterConfigDetails =
          await config.minter.minterConfigurationDetails();
        expect(minterConfigDetails.minterRefundGasLimit).to.equal(7_001);
      });
    });
  });
});
