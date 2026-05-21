import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import {
  deployAndGet,
  deployCore,
  deployCoreWithMinterFilter,
  safeAddProject,
} from "../../../util/common";
import { ethers } from "hardhat";
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_MINTER_NAME = "MinterSetPriceTieredOnChainAllowV0";
const TARGET_MINTER_VERSION = "v0.1.0";

const runForEach = [
  { core: "GenArt721CoreV3" },
  { core: "GenArt721CoreV3_Explorations" },
  { core: "GenArt721CoreV3_Engine" },
  { core: "GenArt721CoreV3_Engine_Flex" },
];

runForEach.forEach((params) => {
  describe(`${TARGET_MINTER_NAME} Views w/ core ${params.core}`, async function () {
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

      // configure prices for project one
      await config.minter
        .connect(config.accounts.artist)
        .updatePricesPerTokenInWei(
          config.projectOne,
          config.genArt721Core.address,
          config.pricePerTokenInWei,
          config.allowlistPricePerTokenInWei
        );

      // add artist to allowlist for purchase-dependent tests
      await config.minter
        .connect(config.accounts.artist)
        .addAddressesToAllowlist(
          config.projectZero,
          config.genArt721Core.address,
          [config.accounts.artist.address]
        );

      config.isEngine = params.core.includes("Engine");

      return config;
    }

    describe("projectMaxHasBeenInvoked", async function () {
      it("should return false if project has not yet been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(false);
      });

      it("should return true if project has been minted out", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });
        let result = await config.minter.projectMaxHasBeenInvoked(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(true);
      });
    });

    describe("projectMaxInvocations", async function () {
      it("should return proper response when not set", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minter.projectMaxInvocations(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(0);
      });

      it("should return proper response when set", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .manuallyLimitProjectMaxInvocations(
            config.projectZero,
            config.genArt721Core.address,
            1
          );
        let result = await config.minter.projectMaxInvocations(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result).to.equal(1);
      });
    });

    describe("getPriceInfo", async function () {
      it("should return proper response when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        let result = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(false);
        expect(result.tokenPriceInWei).to.equal(0);
        expect(result.currencySymbol).to.equal("ETH");
        expect(result.currencyAddress).to.equal(constants.ZERO_ADDRESS);
      });

      it("should return proper response when configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        let result = await config.minter.getPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(result.isConfigured).to.equal(true);
        expect(result.tokenPriceInWei).to.equal(config.pricePerTokenInWei);
        expect(result.currencySymbol).to.equal("ETH");
        expect(result.currencyAddress).to.equal(constants.ZERO_ADDRESS);
      });

      it("reports expected price per token for unconfigured project", async function () {
        const config = await loadFixture(_beforeEach);
        const unconfiguredProjectNumber = 99;
        const currencyInfo = await config.minter
          .connect(config.accounts.artist)
          .getPriceInfo(
            unconfiguredProjectNumber,
            config.genArt721Core.address
          );
        expect(currencyInfo.tokenPriceInWei).to.be.equal(0);
      });
    });

    describe("getAllowlistPriceInfo", async function () {
      it("should return zero when not configured", async function () {
        const config = await loadFixture(_beforeEach);
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(0);
      });

      it("should return correct allowlist price when configured", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const allowlistPrice = await config.minter.getAllowlistPriceInfo(
          config.projectZero,
          config.genArt721Core.address
        );
        expect(allowlistPrice).to.equal(config.allowlistPricePerTokenInWei);
      });
    });

    describe("isEngineView", async function () {
      it("correctly reports isEngine", async function () {
        const config = await loadFixture(_beforeEach);
        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });

      it("uses cached value when available", async function () {
        const config = await loadFixture(_beforeEach);
        // purchase token to trigger isEngine caching
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        await config.minter
          .connect(config.accounts.artist)
          .purchase(config.projectZero, config.genArt721Core.address, {
            value: config.allowlistPricePerTokenInWei,
          });
        const isEngineView = await config.minter
          .connect(config.accounts.artist)
          .isEngineView(config.genArt721Core.address);
        expect(isEngineView).to.be.equal(config.isEngine);
      });

      it("reverts if invalid core contract", async function () {
        const config = await loadFixture(_beforeEach);
        const coreContractName = "GenArt721CoreV3_Engine_IncorrectCoreType";
        const { genArt721Core } = await deployCoreWithMinterFilter(
          config,
          coreContractName,
          "MinterFilterV1"
        );
        try {
          await config.minter
            .connect(config.accounts.artist)
            .isEngineView(genArt721Core.address);
          expect.fail("Expected revert");
        } catch (e: any) {
          expect(e.message).to.include("Unexpected revenue split bytes");
        }
      });
    });

    describe("minterVersion", async function () {
      it("correctly reports minterVersion", async function () {
        const config = await loadFixture(_beforeEach);
        const minterVersion = await config.minter.minterVersion();
        expect(minterVersion).to.equal(TARGET_MINTER_VERSION);
      });
    });

    describe("minterType", async function () {
      it("correctly reports minterType", async function () {
        const config = await loadFixture(_beforeEach);
        const minterType = await config.minter.minterType();
        expect(minterType).to.equal(TARGET_MINTER_NAME);
      });
    });

    describe("isAllowlisted", async function () {
      it("returns true for allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.artist.address
          )
        ).to.be.true;
      });

      it("returns false for non-allowlisted address", async function () {
        const config = await loadFixture(_beforeEach);
        expect(
          await config.minter.isAllowlisted(
            config.projectZero,
            config.genArt721Core.address,
            config.accounts.additional.address
          )
        ).to.be.false;
      });
    });

    describe("setPriceProjectConfig", async function () {
      it("should return proper response when set", async function () {
        const config = await loadFixture(_beforeEach);
        await config.minter
          .connect(config.accounts.artist)
          .updatePricesPerTokenInWei(
            config.projectZero,
            config.genArt721Core.address,
            config.pricePerTokenInWei,
            config.allowlistPricePerTokenInWei
          );
        const projectConfig = await config.minter
          .connect(config.accounts.artist)
          .setPriceProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectConfig.pricePerToken).to.equal(config.pricePerTokenInWei);
        expect(projectConfig.priceIsConfigured).to.equal(true);
      });

      it("should return proper response when not set", async function () {
        const config = await loadFixture(_beforeEach);
        const projectConfig = await config.minter
          .connect(config.accounts.artist)
          .setPriceProjectConfig(
            config.projectZero,
            config.genArt721Core.address
          );
        expect(projectConfig.pricePerToken).to.equal(constants.ZERO_BYTES32);
        expect(projectConfig.priceIsConfigured).to.equal(false);
      });
    });
  });
});
