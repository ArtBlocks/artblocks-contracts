import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { AbiCoder } from "ethers/lib/utils";
import { ONE_MINUTE, ONE_DAY } from "../../../util/constants";
import { configureProjectZeroAuction } from "../DALin/helpers";
import { Common_Events } from "../../common.events";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterDALinHolderV5";
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

      config.delegationRegistry = await deployAndGet(
        config,
        "DelegationRegistry",
        []
      );

      // update core's minter as the minter filter
      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
        config.delegationRegistry.address,
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

      config.isEngine = params.core.includes("Engine");

      config.minterSetPrice = await deployAndGet(config, "MinterSetPriceV5", [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minterSetPrice.address);

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectZero, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });

      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectOne,
          config.genArt721Core.address,
          config.minterSetPrice.address
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      await config.minterSetPrice
        .connect(config.accounts.artist)
        .purchase(config.projectOne, config.genArt721Core.address, {
          value: config.pricePerTokenInWei,
        });
      // switch config.projectZero back to MinterHolderV0
      await config.minterFilter
        .connect(config.accounts.deployer)
        .setMinterForProject(
          config.projectZero,
          config.genArt721Core.address,
          config.minter.address
        );

      await config.minter
        .connect(config.accounts.artist)
        .allowHoldersOfProjects(
          config.projectZero,
          config.genArt721Core.address,
          [config.genArt721Core.address],
          [config.projectZero]
        );

      return config;
    }

    describe("Common Minter Events Tests", async function () {
      await Common_Events(_beforeEach);
    });

    describe("AuctionMinimumLengthSecondsUpdated", async function () {
      it("emits during deploy", async function () {
        const config = await loadFixture(_beforeEach);
        const tx = await deployAndGet(config, TARGET_MINTER_NAME, [
          config.minterFilter.address,
          config.delegationRegistry.address,
        ]);
        const receipt = await tx.deployTransaction.wait();
        // target event "AuctionMinimumLengthSecondsUpdated" is the log at index 0
        let targetLog = receipt.logs[1];
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
          .to.emit(
            await ethers.getContractFactory("DALinLib"),
            "AuctionMinimumLengthSecondsUpdated"
          )
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
          .to.emit(
            await ethers.getContractFactory("DALinLib"),
            "SetAuctionDetailsLin"
          )
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
          .to.emit(
            await ethers.getContractFactory("DALib"),
            "ResetAuctionDetails"
          )
          .withArgs(config.projectZero, config.genArt721Core.address);
      });
    });

    describe("allowHoldersOfProjects", async function () {
      it("emits event when update allowed holders for a single project", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "AllowedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("emits event when update allowed holders for a multiple projects", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectTwo]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "AllowedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          );
      });
    });

    describe("removeHoldersOfProjects", async function () {
      it("emits event when removing allowed holders for a single project", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "RemovedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("emits event when removing allowed holders for multiple projects", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .removeHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectTwo]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "RemovedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          );
      });
    });

    describe("allowAndRemoveHoldersOfProjects", async function () {
      it("emits event when removing allowed holders for a single project", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "AllowedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
        // remove event (for same operation, since multiple events)
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address],
              [config.projectOne],
              [config.genArt721Core.address],
              [config.projectOne]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "RemovedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address],
            [config.projectOne]
          );
      });

      it("emits event when adding allowed holders for multiple projects", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectTwo],
              [],
              []
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "AllowedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          );
      });

      it("emits event when removing allowed holders for multiple projects", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .allowAndRemoveHoldersOfProjects(
              config.projectZero,
              config.genArt721Core.address,
              [],
              [],
              [config.genArt721Core.address, config.genArt721Core.address],
              [config.projectOne, config.projectTwo]
            )
        )
          .to.emit(
            await ethers.getContractFactory("TokenHolderLib"),
            "RemovedHoldersOfProjects"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            [config.genArt721Core.address, config.genArt721Core.address],
            [config.projectOne, config.projectTwo]
          );
      });
    });
  });
});
