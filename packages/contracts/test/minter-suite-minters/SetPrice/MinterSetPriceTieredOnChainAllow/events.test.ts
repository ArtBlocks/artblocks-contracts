import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceTieredOnChainAllowV0";
const TARGET_MINTER_VERSION = "v0.1.0";

const CONFIG_ALLOWLIST = ethers.utils.formatBytes32String("allowlist");

const runForEach = [
  { core: "GenArt721CoreV3" },
  { core: "GenArt721CoreV3_Explorations" },
  { core: "GenArt721CoreV3_Engine" },
  { core: "GenArt721CoreV3_Engine_Flex" },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Events w/ core ${params.core}`, async function () {
    async function _beforeEach() {
      const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
      ({
        genArt721Core: config.genArt721Core,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCore(config, params.core, config.coreRegistry));

      await config.genArt721Core.updateMinterContract(
        config.minterFilter.address
      );

      config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
        config.minterFilter.address,
      ]);
      await config.minterFilter
        .connect(config.accounts.deployer)
        .approveMinterGlobally(config.minter.address);

      config.allowlistPricePerTokenInWei = config.pricePerTokenInWei.div(2);

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

      await config.minter
        .connect(config.accounts.artist)
        .updatePricesPerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei,
          config.allowlistPricePerTokenInWei
        );

      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectZero, 15);
      await config.genArt721Core
        .connect(config.accounts.artist)
        .updateProjectMaxInvocations(config.projectOne, 15);

      return config;
    }

    describe("manuallyLimitProjectMaxInvocations", async function () {
      it("emits event upon manual limit", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .manuallyLimitProjectMaxInvocations(
              config.projectZero,
              config.genArt721Core.address,
              config.maxInvocations
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "MaxInvocationsLib",
              config.minter.address
            ),
            "ProjectMaxInvocationsLimitUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.maxInvocations
          );
      });

      it("emits event upon sync", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .syncProjectMaxInvocationsToCore(
              config.projectZero,
              config.genArt721Core.address
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "MaxInvocationsLib",
              config.minter.address
            ),
            "ProjectMaxInvocationsLimitUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.maxInvocations
          );
      });
    });

    describe("updatePricesPerTokenInWei", async function () {
      it("emits PricePerTokenUpdated event for public price", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .updatePricesPerTokenInWei(
              config.projectZero,
              config.genArt721Core.address,
              config.pricePerTokenInWei,
              config.allowlistPricePerTokenInWei
            )
        )
          .to.emit(
            await ethers.getContractAt("SetPriceLib", config.minter.address),
            "PricePerTokenUpdated"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei
          );
      });
    });

    describe("addAddressesToAllowlist", async function () {
      it("emits ConfigValueAddedToSet event when adding address", async function () {
        const config = await loadFixture(_beforeEach);
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .addAddressesToAllowlist(
              config.projectZero,
              config.genArt721Core.address,
              [config.accounts.user.address]
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueAddedToSet(uint256,address,bytes32,address)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_ALLOWLIST,
            config.accounts.user.address
          );
      });
    });

    describe("removeAddressesFromAllowlist", async function () {
      it("emits ConfigValueRemovedFromSet event when removing address", async function () {
        const config = await loadFixture(_beforeEach);
        // first add address
        await config.minter
          .connect(config.accounts.artist)
          .addAddressesToAllowlist(
            config.projectZero,
            config.genArt721Core.address,
            [config.accounts.user.address]
          );
        // then remove and check event
        await expect(
          config.minter
            .connect(config.accounts.artist)
            .removeAddressesFromAllowlist(
              config.projectZero,
              config.genArt721Core.address,
              [config.accounts.user.address]
            )
        )
          .to.emit(
            await ethers.getContractAt(
              "GenericMinterEventsLib",
              config.minter.address
            ),
            "ConfigValueRemovedFromSet(uint256,address,bytes32,address)"
          )
          .withArgs(
            config.projectZero,
            config.genArt721Core.address,
            CONFIG_ALLOWLIST,
            config.accounts.user.address
          );
      });
    });
  });
});
