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

const TARGET_MINTER_NAME = "MinterRAMV0";
const TARGET_MINTER_VERSION = "v0.0.0";

// hard-coded minter constants
const MIN_AUCTION_DURATION_SECONDS = 10 * ONE_MINUTE; // 10 minutes
const AUCTION_BUFFER_SECONDS = 5 * ONE_MINUTE; // 5 minutes
const MAX_AUCTION_EXTRA_SECONDS = 60 * ONE_MINUTE; // 60 minutes
const MAX_AUCTION_ADMIN_EMERGENCY_EXTENSION_HOURS = 72; // 72 hours
const ADMIN_ARTIST_ONLY_MINT_TIME_SECONDS = 72 * ONE_HOUR; // 72 hours

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

      return config;
    }

    describe("gas tests, typical operations", function () {
      it("early bid placement, typical [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction and advance to auction start
        await configureProjectZeroAuctionAndAdvanceToStartTime(config);
        // record gas cost of placing initial 15 bids
        const gasUsed = [];
        for (let i = 0; i < 15; i++) {
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(config.projectZero, config.genArt721Core.address, 0, {
              value: config.basePrice,
            });
          const receipt = await tx.wait();
          gasUsed.push(receipt.gasUsed);
        }
        // report gas used
        console.log("median gas used", gasUsed.sort()[7]);
        console.log("max gas used (initial bid)", Math.max(...gasUsed));
        console.log("min gas used", Math.min(...gasUsed));
      });

      it("outbid bid placement, typical [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction and sellout
        await configureProjectZeroAuctionAndSelloutLiveAuction(config);
        // record gas cost of placing bid and kicking out the previous bidder
        const gasUsed = [];
        for (let i = 0; i < 5; i++) {
          const minNextBidValues = await config.minter.getMinimumNextBid(
            config.projectZero,
            config.genArt721Core.address
          );
          const tx = await config.minter
            .connect(config.accounts.user)
            .createBid(
              config.projectZero,
              config.genArt721Core.address,
              minNextBidValues.minNextBidSlotIndex,
              {
                value: minNextBidValues.minNextBidValueInWei,
              }
            );
          const receipt = await tx.wait();
          gasUsed.push(receipt.gasUsed);
        }
        // report gas used
        console.log("gasUsed", gasUsed);
        console.log("median gas used", gasUsed.sort()[2]);
        console.log("max gas used (initial bid)", Math.max(...gasUsed));
        console.log("min gas used", Math.min(...gasUsed));
      });

      it("admin auto-mint bids to winners, typical [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction and sellout, advance to State C
        await selloutProjectZeroAuctionAndAdvanceToStateC(config);
        // record gas cost of admin auto-minting 15 tokens
        const tx = await config.minter
          .connect(config.accounts.deployer)
          .adminArtistAutoMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            15
          );
        const receipt = await tx.wait();
        console.log("gasUsed", receipt.gasUsed.toString());
        const avgGasUsed = receipt.gasUsed.div(15);
        console.log("average gas per token minted:", avgGasUsed.toString());
        // in dollars
        const avgGasCostAt100gwei = receipt.effectiveGasPrice
          .mul(avgGasUsed)
          .toString();
        const avgGasCostAt100gweiInETH = parseFloat(
          ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
        );
        const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
        console.log(
          `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
        );
      });

      it("admin direct-mint bids to winners, non-sellout, typical [ @skip-on-coverage ]", async function () {
        const config = await loadFixture(_beforeEach);
        // initialize auction and sellout, advance to State D
        await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
        // record gas cost of admin auto-minting 15 tokens
        const tx = await config.minter
          .connect(config.accounts.deployer)
          .adminArtistDirectMintTokensToWinners(
            config.projectZero,
            config.genArt721Core.address,
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
          );
        const receipt = await tx.wait();
        console.log("gasUsed", receipt.gasUsed.toString());
        const avgGasUsed = receipt.gasUsed.div(15);
        console.log("average gas per token minted:", avgGasUsed.toString());
        // in dollars
        const avgGasCostAt100gwei = receipt.effectiveGasPrice
          .mul(avgGasUsed)
          .toString();
        const avgGasCostAt100gweiInETH = parseFloat(
          ethers.utils.formatUnits(avgGasCostAt100gwei, "ether")
        );
        const avgGasCostAt100gweiAt2kUSDPerETH = avgGasCostAt100gweiInETH * 2e3;
        console.log(
          `=USD at 100gwei, $2k USD/ETH: \$${avgGasCostAt100gweiAt2kUSDPerETH}`
        );
      });
    });
  });
});
