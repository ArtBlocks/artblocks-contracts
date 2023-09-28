import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { SetPrice_Common_Events } from "../common.events";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPricePolyptychV5";
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

      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

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
      // switch config.projectZero back to tested minter
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

      // set randomizer's hash seed setter contract
      await config.randomizer
        .connect(config.accounts.artist)
        .setHashSeedSetterContract(
          config.genArt721Core.address,
          config.projectZero,
          config.minter.address
        );
      // toggle project zero to be polyptych
      await config.randomizer
        .connect(config.accounts.artist)
        .toggleProjectUseAssignedHashSeed(
          config.genArt721Core.address,
          config.projectZero
        );

      return config;
    }

    describe("Common Set Price Minter Events Tests", async function () {
      await SetPrice_Common_Events(_beforeEach);
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

    describe("incrementPolyptychProjectPanelId", async function () {
      it("emits event when incrementing polyptych project panel id", async function () {
        const config = await loadFixture(_beforeEach);
        const initialPanelId = await config.minter.getCurrentPolyptychPanelId(
          config.projectZero,
          config.genArt721Core.address
        );
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .incrementPolyptychProjectPanelId(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(
            config.minter,
            "ConfigValueSet(uint256,address,bytes32,uint256)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            ethers.utils.formatBytes32String("polyptychPanelId"),
            initialPanelId.add(1)
          );
      });
    });
  });
});
