import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { revertMessages } from "../../constants";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const MINTER_BASELINE = "MinterRAMV0";
const MINTER_STUDY = "MinterRAMMinHeapV0";

const iterations = [10, 20, 50, 100];

/**
 * Gas tests for RAM minter study contracts.
 * Used when designing for gas efficiency tradeoffs to aide in decision making.
 */
iterations.forEach((iteration) => {
  describe(`RAM Minter Gas Tests (${iteration} project size)`, async function () {
    async function _beforeEach() {
      // load minter filter V2 fixture
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      // deploy core contract and register on core registry
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, "GenArt721CoreV3", config.coreRegistry));

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      // deploy and configure Baseline Minter
      config.minter_baseline = await deployAndGet(config, MINTER_BASELINE, [
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter_baseline.address);

      // deploy and configure Study Minter
      config.minter_study = await deployAndGet(config, MINTER_STUDY, [
        config.minterFilter.address,
      ]);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter_study.address);

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

      // configure auctions

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = ethers.utils.parseEther("0.0001");

      return config;
    }

    describe("bid insertion", function () {
      it(`baseline - worst-case-insertion - ${iteration} max-invocations [ @skip-on-coverage ]`, async function () {
        const config = await loadFixture(_beforeEach);
        // set minter to baseline
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter_baseline.address
          );
        // set max invocations to ${iteration}
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, iteration);
        // configure auctions on  minter
        await config.minter_baseline
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.basePrice?.mul(256), // funny, but keep it low
            config.basePrice
          );
        // @dev temp don't worry about start time
        // insert 1 bid at slot 0
        await config.minter_baseline
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 0, {
            value: config.basePrice,
          });
        // insert ${iteration} bids at slot 254
        for (let i = 0; i < iteration - 1; i++) {
          await config.minter_baseline
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 254, {
              value: config.basePrice?.mul(256).sub(config.basePrice),
            });
        }

        // // debug print out project config info
        // const auctionDetails = await config.minter_baseline.getAuctionDetails(
        //   config.projectZero,
        //   config.genArt721Core.address
        // );
        // console.log("auction details:", auctionDetails);
        // should revert if bid placed at slot 0 when max bids reached
        await expectRevert(
          config.minter_baseline
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            }),
          "Insufficient bid value"
        );

        // get gas cost to place a bid at top slot
        // @dev this should remove bid at slot 0, and do worst-case search for next slot 254
        const tx = await config.minter_baseline
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, 255, {
            value: config.basePrice?.mul(256),
          });
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const gasUsed = receipt.gasUsed;
        console.log(
          `gas used for worst-case ${iteration} bid insertion: ${gasUsed}`
        );
        const gasCostAt100gwei = receipt.effectiveGasPrice
          .mul(gasUsed)
          .toString();

        const gasCostAt100gweiInETH = parseFloat(
          ethers.utils.formatUnits(gasCostAt100gwei, "ether")
        );
        const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
        console.log(
          `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
        );
        // debug log all bids/project state
      });

      it(`study - worst-case-insertion - ${iteration} max-invocations [ @skip-on-coverage ]`, async function () {
        const config = await loadFixture(_beforeEach);
        // set minter to baseline
        await config.minterFilter
          .connect(config.accounts.deployer)
          .setMinterForProject(
            config.projectZero,
            config.genArt721Core.address,
            config.minter_study.address
          );
        // set max invocations to ${iteration}
        await config.genArt721Core
          .connect(config.accounts.artist)
          .updateProjectMaxInvocations(config.projectZero, iteration);
        // configure auctions on  minter
        await config.minter_study
          .connect(config.accounts.artist)
          .setAuctionDetails(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.basePrice
          );
        // one bid at min bid value

        await config.minter_study
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, {
            value: config.basePrice,
          });
        // @dev temp don't worry about start time
        // insert ${iteration-2} random value bids, at least 2x min bid value
        for (let i = 0; i < iteration - 2; i++) {
          const bidValue = config.basePrice?.mul(
            2 + Math.ceil(Math.random() * 256)
          );
          // console.log(`bidValue: ${ethers.utils.formatEther(bidValue)}`);
          await config.minter_study
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, {
              value: bidValue,
            });
        }
        // place last bid to be max value, maximizing bubble down gas cost during removal
        await config.minter_study
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, {
            value: config.basePrice?.mul(2 + 257),
          });

        // // debug print out heap array
        // const heapArray = await config.minter_study.getHeapArray(
        //   config.projectZero,
        //   config.genArt721Core.address
        // );
        // console.log(heapArray);
        // // debug print out auction state
        // const auctionState = await config.minter_study.getAuctionDetails(
        //   config.projectZero,
        //   config.genArt721Core.address
        // );
        // console.log(auctionState);

        // get gas cost to place a bid of minimum value (i.e. bubble all the way to top)
        await expectRevert(
          config.minter_study
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, {
              value: config.basePrice,
            }),
          "Insufficient bid value"
        );
        // get minimum next bid, maximizing bubble up gas cost
        const minimumNextBid = await config.minter_study.getMinimumNextBid(
          config.projectZero,
          config.genArt721Core.address
        );
        console.log("minimumNextBid: ", minimumNextBid.toString());
        const tx = await config.minter_study
          .connect(config.accounts.user)
          .createBid(config.projectZero, config.genArt721Core.address, {
            value: minimumNextBid,
          });
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        const gasUsed = receipt.gasUsed;
        console.log(
          `gas used for worst-case ${iteration} bid insertion: ${gasUsed}`
        );
        const gasCostAt100gwei = receipt.effectiveGasPrice
          .mul(gasUsed)
          .toString();

        const gasCostAt100gweiInETH = parseFloat(
          ethers.utils.formatUnits(gasCostAt100gwei, "ether")
        );
        const gasCostAt100gweiAt2kUSDPerETH = gasCostAt100gweiInETH * 2e3;
        console.log(
          `=USD at 100gwei, $2k USD/ETH: \$${gasCostAt100gweiAt2kUSDPerETH}`
        );
      });
    });
  });
});
