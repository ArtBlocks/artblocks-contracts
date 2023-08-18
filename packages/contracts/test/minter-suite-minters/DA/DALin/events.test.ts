import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { AbiCoder } from "ethers/lib/utils";
import { ONE_DAY, ONE_MINUTE } from "../../../util/constants";
import { configureProjectZeroAuction } from "./helpers";
import { Common_Events } from "../../common.events";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDALinV5";
const TARGET_MINTER_VERSION = "v5.0.0";

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
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, config.maxInvocations);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      config.startTime = block.timestamp + ONE_MINUTE;
      config.endTime = block.timestamp + ONE_DAY;
      config.basePrice = config.pricePerTokenInWei;
      config.startingPrice = config.basePrice.mul(5);

      return config;
    }

    describe("Common Minter Events Tests", async function () {
      await Common_Events(_beforeEach);
    });

    describe("AuctionMinimumLengthSecondsUpdated", async function () {
      it("emits during deploy", async function () {
        const config = await loadFixture(_beforeEach);
        const contractFactory =
          await ethers.getContractFactory(TARGET_MINTER_NAME);
        const tx = await contractFactory.deploy(config.minterFilter.address);
        const receipt = await tx.deployTransaction.wait();
        // target event "AuctionMinimumLengthSecondsUpdated" is the log at index 0
        let targetLog = receipt.logs[0];
        // expect log 0 to be AuctionMinimumLengthSecondsUpdated
        expect(targetLog.topics[0]).to.be.equal(
          ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(
              "AuctionMinimumLengthSecondsUpdated(uint256)"
            )
          )
        );
        // expect field to be the hard-coded default value
        const abiCoder = new AbiCoder();
        expect(targetLog.data).to.be.equal(abiCoder.encode(["uint256"], [600]));
      });

      it("emits when being configured", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .setMinimumAuctionLengthSeconds(1)
        )
          .to.emit(config.minter, "AuctionMinimumLengthSecondsUpdated")
          .withArgs(1);
      });
    });

    describe("SetAuctionDetailsLin", async function () {
      it("emits when auction is configured", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .setAuctionDetails(
              config.projectZero,
              config.genArt721Core.address,
              config.startTime,
              config.endTime,
              config.startingPrice,
              config.basePrice
            )
        )
          .to.emit(config.minter, "SetAuctionDetailsLin")
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.startTime,
            config.endTime,
            config.startingPrice,
            config.basePrice
          );
      });
    });

    describe("ResetAuctionDetails", async function () {
      it("emits when auction is reset", async function () {
        const config = await loadFixture(_beforeEach);
        await configureProjectZeroAuction(config);
        await expect(
          config.minter
            .connect(config.accounts.deployer)
            .resetAuctionDetails(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(config.minter, "ResetAuctionDetails")
          .withArgs(config.projectZero, config.genArt721Core.address);
      });
    });
  });
});
