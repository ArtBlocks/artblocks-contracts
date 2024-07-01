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
  configureProjectZeroAuctionAndAdvanceToStartTime,
  configureProjectZeroAuctionAndSelloutLiveAuction,
  selloutProjectZeroAuctionAndAdvanceToStateC,
  configureProjectZeroAuctionSelloutAndAdvanceToStateD,
} from "./helpers";
import { BigNumber, constants } from "ethers";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSEAV1";

const runForEach = [
  {
    core: "GenArt721CoreV3",
  },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Gas Tests w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      await config.minter
        .connect(config.accounts.artist)
        .configureFutureAuctions(
          config.projectZero,
          config.genArt721Core.address,
          config.startTime,
          config.defaultAuctionLengthSeconds,
          config.basePrice,
          5 // 5% min bid increase
        );

      // advance to auction start time
      await ethers.provider.send("evm_setNextBlockTimestamp", [
        config.startTime,
      ]);

      return config;
    }

    describe("gas tests, typical operations", function () {
      it("non-initial bid placement, typical refund [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction
        const gasUsed = [];
        let currentBid = config.basePrice;
        let bidderIndex = 0;
        for (let i = 0; i < 15; i++) {
          const currentBidder =
            i % 2 === 0 ? config.accounts.user : config.accounts.user2;
          const tx = await config.minter
            .connect(currentBidder)
            .createBid(config.projectZero, config.genArt721Core.address, {
              value: currentBid,
            });
          const receipt = await tx.wait();
          gasUsed.push(receipt.gasUsed);
          // increase next bid by 10%
          currentBid = currentBid.mul(11).div(10);
        }
        // report gas used
        console.log("median gas used", gasUsed.sort()[7]);
        console.log("max gas used (initial bid)", Math.max(...gasUsed));
        console.log("min gas used", Math.min(...gasUsed));
        console.log("all bids:", gasUsed);
      });
    });
  });
});
