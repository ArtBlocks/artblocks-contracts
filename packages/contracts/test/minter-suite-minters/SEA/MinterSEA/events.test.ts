import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ONE_MINUTE, ONE_HOUR, ONE_DAY } from "../../../util/constants";
import { Common_Events } from "../../common.events";
import { initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd } from "./helpers";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { AbiCoder } from "ethers/lib/utils";
import { Logger } from "@ethersproject/logger";
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
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
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
        .updateProjectMaxInvocations(config.projectZero, 15);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.bidIncrementPercentage = 5; // 5%
      config.basePrice = config.pricePerTokenInWei; // better naming for this minter

      return config;
    }

    describe("Common Minter Events Tests", async function () {
      await Common_Events(_beforeEach);
    });

    describe("minter-level config updates", async function () {
      describe("all defaults emitted during deployment", async function () {
        it("emits during deployment", async function () {
          const config = await loadFixture(_beforeEach);
          const contractFactory =
            await ethers.getContractFactory(TARGET_MINTER_NAME);
          const tx = await contractFactory.deploy(config.minterFilter.address);
          const receipt = await tx.deployTransaction.wait();
          // target event "DelegationRegistryUpdated" is the log at index 0
          let targetLog = receipt.logs[0];
          // expect log 0 to be MinAuctionDurationSecondsUpdated
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "MinAuctionDurationSecondsUpdated(uint256)"
              )
            )
          );
          // expect field to be the hard-coded default value
          const abiCoder = new AbiCoder();
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint256"], [60])
          );
          // expect log 1 to be MinterTimeBufferUpdated
          targetLog = receipt.logs[1];
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("MinterTimeBufferUpdated(uint32)")
            )
          );
          // expect field to be the hard-coded default value
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint32"], [120])
          );
          // expect log 2 to be MinterRefundGasLimitUpdated
          targetLog = receipt.logs[2];
          expect(targetLog.topics[0]).to.be.equal(
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes("MinterRefundGasLimitUpdated(uint24)")
            )
          );
          // expect field to be the hard-coded default value
          expect(targetLog.data).to.be.equal(
            abiCoder.encode(["uint24"], [30_000])
          );
        });
      });

      describe("MinterTimeBufferUpdated", async function () {
        it("emits MinterTimeBufferUpdated when configuring", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateMinterTimeBufferSeconds(60)
          )
            .to.emit(
              await ethers.getContractAt("SEALib", config.minter.address),
              "MinterTimeBufferUpdated"
            )
            .withArgs(60);
        });
      });

      describe("MinterRefundGasLimitUpdated", async function () {
        it("emits MinterRefundGasLimitUpdated when configuring", async function () {
          const config = await loadFixture(_beforeEach);
          await expect(
            config.minter
              .connect(config.accounts.deployer)
              .updateRefundGasLimit(45_000)
          )
            .to.emit(
              await ethers.getContractAt("SEALib", config.minter.address),
              "MinterRefundGasLimitUpdated"
            )
            .withArgs(45_000);
        });
      });
    });

    describe("ConfiguredFutureAuctions", async function () {
      it("emits expected event", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            )
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "ConfiguredFutureAuctions"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
      });
    });

    describe("AuctionInitialized, AuctionBid", async function () {
      it("emits expected events", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );

        // Part 1: AuctionInitialized
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        // advance time to auction start time - 1 second
        // @dev this makes next block timestamp equal to auction start time
        await ethers.provider.send("evm_mine", [config.startTime - 1]);
        await expect(
          config.minter
            .connect(config.accounts.user)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice.add(1), // ensure actual bid amount is emitted, not base price
            })
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "AuctionInitialized"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.user.address,
            config.basePrice.add(1),
            config.startTime + config.defaultAuctionLengthSeconds,
            config.bidIncrementPercentage
          );

        // Part 2: AuctionBid
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .createBid(targetToken, config.genArt721Core.address, {
              value: config.basePrice.mul(2),
            })
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "AuctionBid"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.artist.address,
            config.basePrice.mul(2)
          );
      });
    });

    describe("AuctionSettled", async function () {
      it("emits expected event", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );

        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
        await expect(
          config.minter
            .connect(config.accounts.user)
            .settleAuction(targetToken, config.genArt721Core.address)
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "AuctionSettled"
          )
          .withArgs(
            targetToken,
            config.genArt721Core.address,
            config.accounts.user.address,
            config.basePrice
          );
      });
    });

    describe("ResetAuctionDetails", async function () {
      it("emits expected event", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );

        await expect(
          config.minter
            .connect(config.accounts.artist)
            .resetFutureAuctionDetails(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "ResetAuctionDetails"
          )
          .withArgs(config.projectZero, config.genArt721Core.address);
      });
    });

    describe("ProjectNextTokenUpdated", async function () {
      it("emits expected event", async function () {
        const config = await loadFixture(_beforeEach);
        // initial auction configuring populates next token
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .configureFutureAuctions(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.defaultAuctionLengthSeconds,
              config.basePrice,
              config.bidIncrementPercentage
            )
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "ProjectNextTokenUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            targetToken
          );
      });
    });

    describe("ProjectNextTokenEjected", async function () {
      it("emits expected event", async function () {
        const config = await loadFixture(_beforeEach);
        // initial auction configuring populates next token
        const targetToken = BigNumber.from(
          config.projectZeroTokenZero.toString()
        );
        await config.minter
          .connect(config.accounts.artist)
          .configureFutureAuctions(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.defaultAuctionLengthSeconds,
            config.basePrice,
            config.bidIncrementPercentage
          );
        // manually eject token after resetting future auctions
        await config.minter
          .connect(config.accounts.artist)
          .resetFutureAuctionDetails(
            config.projectZero,
            config.genArt721Core.address
          );
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .ejectNextTokenTo(
              config.projectZero,
              config.genArt721Core.address,
              config.accounts.artist.address
            )
        )
          .to.emit(
            await ethers.getContractAt("SEALib", config.minter.address),
            "ProjectNextTokenEjected"
          )
          .withArgs(config.projectZero, config.genArt721Core.address);
      });
    });
  });
});
