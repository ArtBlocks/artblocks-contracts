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
      await expect(
        config.engineFactory.connect(config.accounts.user).createEngineContract(
          0,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
        )
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
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
    it("reverts if invalid configuration, only non-zero super admin address if new admin ACL", async function () {
      const config = await loadFixture(_beforeEach);
      // invalid due to passing null address as Admin ACL below
      const invalidConfig = {
        ...config.validEngineConfigurationExistingAdminACL,
      };
      await expectRevert(
        config.engineFactory
          .connect(config.accounts.deployer)
          .createEngineContract(
            0,
            invalidConfig,
            "0x0000000000000000000000000000000000000000",
            ethers.utils.formatBytes32String("Unique salt Engine4") // random salt
          ),
        revertMessages.onlyNonZeroAddress
      );
    });
    it("reverts if invalid configuration, non-zero super admin address if existing admin ACL", async function () {
      const config = await loadFixture(_beforeEach);
      const invalidConfig = {
        ...config.validEngineConfigurationExistingAdminACL,
        newSuperAdminAddress: config.accounts.artist.address,
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
        revertMessages.adminACLExists
      );
    });

    it("creates a new Engine contract with an existing Admin ACL Contract", async function () {
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
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
      expect(engineContractCoreVersion).to.be.equal("v3.2.0");
      // validate initialization
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
      const defaultRenderProviderSecondarySalesBPS =
        await engine.defaultRenderProviderSecondarySalesBPS();
      expect(defaultRenderProviderSecondarySalesBPS).to.equal(250);
      const platformProviderPrimarySalesPercentage =
        await engine.platformProviderPrimarySalesPercentage();
      expect(platformProviderPrimarySalesPercentage).to.equal(10);
      const defaultPlatformProviderSecondarySalesBPS =
        await engine.defaultPlatformProviderSecondarySalesBPS();
      expect(defaultPlatformProviderSecondarySalesBPS).to.equal(250);
      const splitProviderAddress = await engine.splitProvider();
      expect(splitProviderAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.splitProviderAddress
      );
      const autoApproveArtistSplitProposals =
        await engine.autoApproveArtistSplitProposals();
      expect(autoApproveArtistSplitProposals).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.autoApproveArtistSplitProposals
      );
      const nullPlatformProvider = await engine.nullPlatformProvider();
      expect(nullPlatformProvider).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.nullPlatformProvider
      );
      const allowArtistProjectActivation =
        await engine.allowArtistProjectActivation();
      expect(allowArtistProjectActivation).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.allowArtistProjectActivation
      );
      const startingProjectId = await engine.startingProjectId();
      expect(startingProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
      const renderProviderPrimarySalesAddress =
        await engine.renderProviderPrimarySalesAddress();
      expect(renderProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const defaultRenderProviderSecondarySalesAddress =
        await engine.defaultRenderProviderSecondarySalesAddress();
      expect(defaultRenderProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const platformProviderPrimarySalesAddress =
        await engine.platformProviderPrimarySalesAddress();
      expect(platformProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const defaultPlatformProviderSecondarySalesAddress =
        await engine.defaultPlatformProviderSecondarySalesAddress();
      expect(defaultPlatformProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const randomizerContract = await engine.randomizerContract();
      expect(randomizerContract).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.randomizerContract
      );
      // check ownership belongs to admin acl contract
      const ownerAddress = await engine.owner();
      expect(ownerAddress).to.equal(config?.adminACL?.address);
      const defaultBaseUri = await engine.defaultBaseURI();
      expect(defaultBaseUri).to.equal(
        `https://token.artblocks.io/${engineAddress?.toLowerCase()}/`
      );
      const nextProjectId = await engine.nextProjectId();
      expect(nextProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
    });
    it("creates a new Engine contract with a new Admin ACL Contract", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const validEngineConfigurationNewAdminACL = {
        ...config.validEngineConfigurationExistingAdminACL,
        newSuperAdminAddress: config.accounts.artist.address,
      };
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          0,
          validEngineConfigurationNewAdminACL,
          "0x0000000000000000000000000000000000000000",
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
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
      expect(engineContractCoreVersion).to.be.equal("v3.2.0");
      // validate initialization
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
      const defaultRenderProviderSecondarySalesBPS =
        await engine.defaultRenderProviderSecondarySalesBPS();
      expect(defaultRenderProviderSecondarySalesBPS).to.equal(250);
      const platformProviderPrimarySalesPercentage =
        await engine.platformProviderPrimarySalesPercentage();
      expect(platformProviderPrimarySalesPercentage).to.equal(10);
      const defaultPlatformProviderSecondarySalesBPS =
        await engine.defaultPlatformProviderSecondarySalesBPS();
      expect(defaultPlatformProviderSecondarySalesBPS).to.equal(250);
      const splitProviderAddress = await engine.splitProvider();
      expect(splitProviderAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.splitProviderAddress
      );
      const autoApproveArtistSplitProposals =
        await engine.autoApproveArtistSplitProposals();
      expect(autoApproveArtistSplitProposals).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.autoApproveArtistSplitProposals
      );
      const nullPlatformProvider = await engine.nullPlatformProvider();
      expect(nullPlatformProvider).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.nullPlatformProvider
      );
      const allowArtistProjectActivation =
        await engine.allowArtistProjectActivation();
      expect(allowArtistProjectActivation).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.allowArtistProjectActivation
      );
      const startingProjectId = await engine.startingProjectId();
      expect(startingProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
      const renderProviderPrimarySalesAddress =
        await engine.renderProviderPrimarySalesAddress();
      expect(renderProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const defaultRenderProviderSecondarySalesAddress =
        await engine.defaultRenderProviderSecondarySalesAddress();
      expect(defaultRenderProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const platformProviderPrimarySalesAddress =
        await engine.platformProviderPrimarySalesAddress();
      expect(platformProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const defaultPlatformProviderSecondarySalesAddress =
        await engine.defaultPlatformProviderSecondarySalesAddress();
      expect(defaultPlatformProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const randomizerContract = await engine.randomizerContract();
      expect(randomizerContract).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.randomizerContract
      );
      // check ownership belongs to new admin acl contract
      const adminACLContract = await engine.adminACLContract();
      const ownerAddress = await engine.owner();
      expect(ownerAddress).to.equal(adminACLContract);
      const defaultBaseUri = await engine.defaultBaseURI();
      expect(defaultBaseUri).to.equal(
        `https://token.artblocks.io/${engineAddress?.toLowerCase()}/`
      );
      const nextProjectId = await engine.nextProjectId();
      expect(nextProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
    });
    it("creates a new Engine Flex contract with an existing Admin ACL Contract", async function () {
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
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
      expect(engineContractCoreVersion).to.be.equal("v3.2.1");
      // validate initialization
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
      const defaultRenderProviderSecondarySalesBPS =
        await engine.defaultRenderProviderSecondarySalesBPS();
      expect(defaultRenderProviderSecondarySalesBPS).to.equal(250);
      const platformProviderPrimarySalesPercentage =
        await engine.platformProviderPrimarySalesPercentage();
      expect(platformProviderPrimarySalesPercentage).to.equal(10);
      const defaultPlatformProviderSecondarySalesBPS =
        await engine.defaultPlatformProviderSecondarySalesBPS();
      expect(defaultPlatformProviderSecondarySalesBPS).to.equal(250);
      const splitProviderAddress = await engine.splitProvider();
      expect(splitProviderAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.splitProviderAddress
      );
      const autoApproveArtistSplitProposals =
        await engine.autoApproveArtistSplitProposals();
      expect(autoApproveArtistSplitProposals).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.autoApproveArtistSplitProposals
      );
      const nullPlatformProvider = await engine.nullPlatformProvider();
      expect(nullPlatformProvider).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.nullPlatformProvider
      );
      const allowArtistProjectActivation =
        await engine.allowArtistProjectActivation();
      expect(allowArtistProjectActivation).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.allowArtistProjectActivation
      );
      const startingProjectId = await engine.startingProjectId();
      expect(startingProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
      const renderProviderPrimarySalesAddress =
        await engine.renderProviderPrimarySalesAddress();
      expect(renderProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const defaultRenderProviderSecondarySalesAddress =
        await engine.defaultRenderProviderSecondarySalesAddress();
      expect(defaultRenderProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const platformProviderPrimarySalesAddress =
        await engine.platformProviderPrimarySalesAddress();
      expect(platformProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const defaultPlatformProviderSecondarySalesAddress =
        await engine.defaultPlatformProviderSecondarySalesAddress();
      expect(defaultPlatformProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const randomizerContract = await engine.randomizerContract();
      expect(randomizerContract).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.randomizerContract
      );
      // check ownership belongs to admin acl contract
      const ownerAddress = await engine.owner();
      expect(ownerAddress).to.equal(config?.adminACL?.address);
      const defaultBaseUri = await engine.defaultBaseURI();
      expect(defaultBaseUri).to.equal(
        `https://token.artblocks.io/${engineAddress?.toLowerCase()}/`
      );
      const nextProjectId = await engine.nextProjectId();
      expect(nextProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
    });
    it("creates a new Engine Flex contract with a new Admin ACL Contract", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const validEngineConfigurationNewAdminACL = {
        ...config.validEngineConfigurationExistingAdminACL,
        newSuperAdminAddress: config.accounts.artist.address,
      };
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          1,
          validEngineConfigurationNewAdminACL,
          "0x0000000000000000000000000000000000000000",
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
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
      expect(engineContractCoreVersion).to.be.equal("v3.2.1");
      // validate initialization
      // get render provider primary sales percentage via view function
      const renderProviderPrimarySalesPercentage =
        await engine.renderProviderPrimarySalesPercentage();
      expect(renderProviderPrimarySalesPercentage).to.equal(10);
      const defaultRenderProviderSecondarySalesBPS =
        await engine.defaultRenderProviderSecondarySalesBPS();
      expect(defaultRenderProviderSecondarySalesBPS).to.equal(250);
      const platformProviderPrimarySalesPercentage =
        await engine.platformProviderPrimarySalesPercentage();
      expect(platformProviderPrimarySalesPercentage).to.equal(10);
      const defaultPlatformProviderSecondarySalesBPS =
        await engine.defaultPlatformProviderSecondarySalesBPS();
      expect(defaultPlatformProviderSecondarySalesBPS).to.equal(250);
      const splitProviderAddress = await engine.splitProvider();
      expect(splitProviderAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.splitProviderAddress
      );
      const autoApproveArtistSplitProposals =
        await engine.autoApproveArtistSplitProposals();
      expect(autoApproveArtistSplitProposals).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.autoApproveArtistSplitProposals
      );
      const nullPlatformProvider = await engine.nullPlatformProvider();
      expect(nullPlatformProvider).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.nullPlatformProvider
      );
      const allowArtistProjectActivation =
        await engine.allowArtistProjectActivation();
      expect(allowArtistProjectActivation).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.allowArtistProjectActivation
      );
      const startingProjectId = await engine.startingProjectId();
      expect(startingProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
      const renderProviderPrimarySalesAddress =
        await engine.renderProviderPrimarySalesAddress();
      expect(renderProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const defaultRenderProviderSecondarySalesAddress =
        await engine.defaultRenderProviderSecondarySalesAddress();
      expect(defaultRenderProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.renderProviderAddress
      );
      const platformProviderPrimarySalesAddress =
        await engine.platformProviderPrimarySalesAddress();
      expect(platformProviderPrimarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const defaultPlatformProviderSecondarySalesAddress =
        await engine.defaultPlatformProviderSecondarySalesAddress();
      expect(defaultPlatformProviderSecondarySalesAddress).to.equal(
        config?.validEngineConfigurationExistingAdminACL
          ?.platformProviderAddress
      );
      const randomizerContract = await engine.randomizerContract();
      expect(randomizerContract).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.randomizerContract
      );
      // check ownership belongs to new admin acl contract
      const adminACLContract = await engine.adminACLContract();
      const ownerAddress = await engine.owner();
      expect(ownerAddress).to.equal(adminACLContract);
      const defaultBaseUri = await engine.defaultBaseURI();
      expect(defaultBaseUri).to.equal(
        `https://token.artblocks.io/${engineAddress?.toLowerCase()}/`
      );
      const nextProjectId = await engine.nextProjectId();
      expect(nextProjectId).to.equal(
        config?.validEngineConfigurationExistingAdminACL?.startingProjectId
      );
    });
  });
});
