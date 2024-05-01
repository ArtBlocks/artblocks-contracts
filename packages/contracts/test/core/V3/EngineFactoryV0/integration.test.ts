import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { setupEngineFactory } from "../../../util/fixtures";

describe(`EngineFactoryV0 Integration`, async function () {
  async function _beforeEach() {
    // deploy new Engine factory
    const config = await loadFixture(setupEngineFactory);
    // add valid engine configuration to config
    config.validEngineConfigurationExistingAdminACL = {
      tokenName: config.name,
      tokenSymbol: config.symbol,
      renderProviderAddress: config.accounts.deployer.address,
      platformProviderAddress: config.accounts.additional.address,
      newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
      randomizerContract: config?.randomizer?.address,
      splitProviderAddress: config.splitProvider.address,
      startingProjectId: 0,
      autoApproveArtistSplitProposals: true,
      nullPlatformProvider: false,
      allowArtistProjectActivation: true,
    };
    return config;
  }

  describe("createEngineContract", async function () {
    it("reverts if abandoned", async function () {
      const config = await loadFixture(_beforeEach);

      // abandon the factory
      await config?.engineFactory?.connect(config.accounts.deployer).abandon();
      // expect revert on createEngineContract
      await expectRevert(
        config.engineFactory
          .connect(config.accounts.deployer)
          .createEngineContract(
            0,
            config.validEngineConfigurationExistingAdminACL,
            config?.adminACL?.address,
            ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
          ),
        revertMessages.factoryAbandoned
      );
    });

    it("reverts if not called by deployer", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.engineFactory.connect(config.accounts.user).createEngineContract(
          0,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
        ),
        revertMessages.onlyOwner
      );
    });

    it("reverts if invalid configuration, only non-zero render provider address", async function () {
      const config = await loadFixture(_beforeEach);
      const invalidConfig = {
        ...config.validEngineConfigurationExistingAdminACL,
        renderProviderAddress: "0x0000000000000000000000000000000000000000",
      };
      await expectRevert(
        config.engineFactory
          .connect(config.accounts.deployer)
          .createEngineContract(
            0,
            invalidConfig,
            config?.adminACL?.address,
            ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
          ),
        revertMessages.onlyNonZeroAddress
      );
    });

    it("reverts if invalid configuration, only non-zero randomizer address", async function () {
      const config = await loadFixture(_beforeEach);
      const invalidConfig = {
        ...config.validEngineConfigurationExistingAdminACL,
        randomizerContract: "0x0000000000000000000000000000000000000000",
      };
      await expectRevert(
        config.engineFactory
          .connect(config.accounts.deployer)
          .createEngineContract(
            0,
            invalidConfig,
            config?.adminACL?.address,
            ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
          ),
        revertMessages.onlyNonZeroAddress
      );
    });

    it("creates a new Engine contract", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          0,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
        );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get Engine contract address from logs
      const engineCreationLog = receipt.logs[receipt.logs.length - 1];
      const engineAddress = ethers.utils.getAddress(
        "0x" + engineCreationLog.topics[1].slice(-40)
      );
      // get Engine contract
      const engine = await ethers.getContractAt(
        "GenArt721CoreV3_Engine",
        engineAddress
      );
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      // expect renderProviderPrimarySalesPercentage to match
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
    });
    it("creates a new Engine Flex contract", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          1,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.utils.formatBytes32String("Unique salt Engine5") // random salt
        );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get Engine contract address from logs
      const engineCreationLog = receipt.logs[receipt.logs.length - 1];
      const engineAddress = ethers.utils.getAddress(
        "0x" + engineCreationLog.topics[1].slice(-40)
      );
      // get Engine contract
      const engine = await ethers.getContractAt(
        "GenArt721CoreV3_Engine_Flex",
        engineAddress
      );
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      // expect renderProviderPrimarySalesPercentage to match
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
    });
  });
});
