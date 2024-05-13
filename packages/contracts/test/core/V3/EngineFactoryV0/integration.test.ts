import { ethers } from "hardhat";
import { expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { Logger } from "@ethersproject/logger";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

import { revertMessages } from "./constants";
import { setupEngineFactory } from "../../../util/fixtures";
import { deployAndGet } from "../../../util/common";

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
      minterFilterAddress: config?.minterFilter?.address,
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
    it("creates a new Engine contract with an existing Admin ACL Contract and an empty salt", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          0,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.constants.HashZero
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
      // validate contract was registered
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
      expect(engineContractCoreVersion).to.be.equal("v3.2.0");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        config.validEngineConfigurationExistingAdminACL.minterFilterAddress
      );
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
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
      expect(engineContractCoreVersion).to.be.equal("v3.2.0");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        config.validEngineConfigurationExistingAdminACL.minterFilterAddress
      );
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
        // validate null minter filter address
        minterFilterAddress: "0x0000000000000000000000000000000000000000",
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
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
      expect(engineContractCoreVersion).to.be.equal("v3.2.0");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
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
    it("creates a new Engine Flex contract with an existing Admin ACL Contract and empty salt", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      const tx = await config.engineFactory
        .connect(config.accounts.deployer)
        .createEngineContract(
          1,
          config.validEngineConfigurationExistingAdminACL,
          config?.adminACL?.address,
          ethers.constants.HashZero
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
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
      expect(engineContractCoreVersion).to.be.equal("v3.2.1");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        config.validEngineConfigurationExistingAdminACL.minterFilterAddress
      );
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
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
      expect(engineContractCoreVersion).to.be.equal("v3.2.1");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        config.validEngineConfigurationExistingAdminACL.minterFilterAddress
      );
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
        // validate null minter filter address
        minterFilterAddress: "0x0000000000000000000000000000000000000000",
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
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        engine.address
      );
      expect(isRegistered).to.be.true;
      const engineContractCoreType = await engine.coreType();
      const engineContractCoreVersion = await engine.coreVersion();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
      expect(engineContractCoreVersion).to.be.equal("v3.2.1");
      // validate initialization
      const engineContractMinter = await engine.minterContract();
      expect(engineContractMinter).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
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
  describe("transferCoreRegistryOwnership", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .transferCoreRegistryOwnership(config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("transfers ownership", async function () {
      const config = await loadFixture(_beforeEach);
      await config.engineFactory
        .connect(config.accounts.deployer)
        .transferCoreRegistryOwnership(config.accounts.user.address);
      const ownerOfCoreRegistry = await config.coreRegistry.owner();
      expect(ownerOfCoreRegistry).to.be.equal(config.accounts.user.address);
    });
  });
  describe("registerMultipleContracts", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .registerMultipleContracts(
            [
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
            ],
            [
              ethers.utils.formatBytes32String("DUMMY_VERSION"),
              ethers.utils.formatBytes32String("DUMMY_VERSION2"),
            ],
            [
              ethers.utils.formatBytes32String("DUMMY_TYPE"),
              ethers.utils.formatBytes32String("DUMMY_TYPE2"),
            ]
          )
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("reverts if input lengths don't match", async function () {
      // @dev this test double checks that coreRegistry correctly reverts, as that is where the input length check is
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.engineFactory
          .connect(config.accounts.deployer)
          .registerMultipleContracts(
            ["0x0000000000000000000000000000000000000000"],
            [
              ethers.utils.formatBytes32String("DUMMY_VERSION"),
              ethers.utils.formatBytes32String("DUMMY_VERSION2"),
            ],
            [
              ethers.utils.formatBytes32String("DUMMY_TYPE"),
              ethers.utils.formatBytes32String("DUMMY_TYPE2"),
            ]
          ),
        "Mismatched array lengths"
      );
    });
    it("registers contracts", async function () {
      const config = await loadFixture(_beforeEach);
      // get tx receipt
      await config.engineFactory
        .connect(config.accounts.deployer)
        .registerMultipleContracts(
          ["0x0000000000000000000000000000000000000000"],
          [ethers.utils.formatBytes32String("DUMMY_VERSION")],
          [ethers.utils.formatBytes32String("DUMMY_TYPE")]
        );
      const isRegistered = await config?.coreRegistry?.isRegisteredContract(
        "0x0000000000000000000000000000000000000000"
      );
      expect(isRegistered).to.be.true;
    });
  });
  describe("unregisterMultipleContracts", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .unregisterMultipleContracts([
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
          ])
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("unregisters contracts", async function () {
      const config = await loadFixture(_beforeEach);
      await config.engineFactory
        .connect(config.accounts.deployer)
        .registerMultipleContracts(
          ["0x0000000000000000000000000000000000000000"],
          [ethers.utils.formatBytes32String("DUMMY_VERSION")],
          [ethers.utils.formatBytes32String("DUMMY_TYPE")]
        );
      const isRegisteredBefore =
        await config?.coreRegistry?.isRegisteredContract(
          "0x0000000000000000000000000000000000000000"
        );
      expect(isRegisteredBefore).to.be.true;
      await config.engineFactory
        .connect(config.accounts.deployer)
        .unregisterMultipleContracts([
          "0x0000000000000000000000000000000000000000",
        ]);
      const isRegisteredAfter =
        await config?.coreRegistry?.isRegisteredContract(
          "0x0000000000000000000000000000000000000000"
        );
      expect(isRegisteredAfter).to.be.false;
    });
  });
  describe("drainETH", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .drainETH(config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("drains ETH balance to recipient address", async function () {
      const config = await loadFixture(_beforeEach);
      const sendAmount = ethers.utils.parseEther("1.0");
      await config.accounts.deployer.sendTransaction({
        to: config.engineFactory.address,
        value: sendAmount,
      });
      const initialDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(sendAmount);
      // deployer drains balance
      const drainTx = await config.engineFactory
        .connect(config.accounts.deployer)
        .drainETH(config.accounts.deployer.address);
      const txReceipt = await drainTx.wait();
      const gasUsed = txReceipt.gasUsed;
      const effectiveGasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      // check deployers balance
      const finalDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance
        .sub(gasCost)
        .add(sendAmount);
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(0);
    });

    it("handles balance of zero", async function () {
      const config = await loadFixture(_beforeEach);
      const initialDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(0);
      // deployer drains balance
      const drainTx = await config.engineFactory
        .connect(config.accounts.deployer)
        .drainETH(config.accounts.deployer.address);
      const txReceipt = await drainTx.wait();
      const gasUsed = txReceipt.gasUsed;
      const effectiveGasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      // check deployers balance
      const finalDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance.sub(gasCost);
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(0);
    });
  });
  describe("drainETH", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .drainETH(config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("drains ETH balance to recipient address", async function () {
      const config = await loadFixture(_beforeEach);
      const sendAmount = ethers.utils.parseEther("1.0");
      await config.accounts.deployer.sendTransaction({
        to: config.engineFactory.address,
        value: sendAmount,
      });
      const initialDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(sendAmount);
      // deployer drains balance
      const drainTx = await config.engineFactory
        .connect(config.accounts.deployer)
        .drainETH(config.accounts.deployer.address);
      const txReceipt = await drainTx.wait();
      const gasUsed = txReceipt.gasUsed;
      const effectiveGasPrice = txReceipt.effectiveGasPrice;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      // check deployers balance
      const finalDeployerBalance = await ethers.provider.getBalance(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance
        .sub(gasCost)
        .add(sendAmount);
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(
        await ethers.provider.getBalance(config.engineFactory.address)
      ).to.equal(0);
    });
  });
  describe("drainERC20", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      await expect(
        config.engineFactory
          .connect(config.accounts.user)
          .drainERC20(erc20.address, config.accounts.user.address)
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("drains ERC20 balance to recipient address", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // transfer some tokens
      await erc20
        .connect(config.accounts.deployer)
        .transfer(config.engineFactory.address, ethers.utils.parseEther("1"));

      const initialDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      // check initial balance
      expect(await erc20.balanceOf(config.engineFactory.address)).to.equal(
        ethers.utils.parseEther("1")
      );
      // deployer drains balance
      await config.engineFactory
        .connect(config.accounts.deployer)
        .drainERC20(erc20.address, config.accounts.deployer.address);
      const finalDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      const expectedBalance = initialDeployerBalance.add(
        ethers.utils.parseEther("1")
      );
      expect(finalDeployerBalance).to.equal(expectedBalance);
      // validate contract balance is 0
      expect(await erc20.balanceOf(config.engineFactory.address)).to.equal(0);
    });
  });
  describe("execCalls", async function () {
    it("reverts if not called by owner", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy mock ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      const calls = [
        {
          to: erc20.address,
          data: erc20.interface.encodeFunctionData("transfer", [
            config.accounts.deployer.address,
            ethers.utils.parseEther("100"),
          ]),
        },
      ];
      await expect(
        config.engineFactory.connect(config.accounts.user).execCalls(calls)
      )
        .to.be.revertedWithCustomError(
          config.engineFactory,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(config.accounts.user.address);
    });
    it("able to execute transactions on mocked contract", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy ERC20 token
      const erc20 = await deployAndGet(config, "ERC20Mock", [
        ethers.utils.parseEther("100"),
      ]);
      // Initial balance of the deployer
      const initialDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      // transfer some tokens
      await erc20
        .connect(config.accounts.deployer)
        .transfer(config.engineFactory.address, ethers.utils.parseEther("1"));
      const calls = [
        {
          to: erc20.address,
          data: erc20.interface.encodeFunctionData("transfer", [
            config.accounts.deployer.address,
            ethers.utils.parseEther("1"),
          ]),
        },
      ];
      // execute batch of calls
      await expect(
        config.engineFactory.connect(config.accounts.deployer).execCalls(calls)
      )
        .to.emit(erc20, "Transfer")
        .withArgs(
          config.engineFactory.address,
          config.accounts.deployer.address,
          ethers.utils.parseEther("1")
        );
      const expectedFinalBalance = initialDeployerBalance;
      const finalDeployerBalance = await erc20.balanceOf(
        config.accounts.deployer.address
      );
      expect(finalDeployerBalance).to.equal(expectedFinalBalance);
      expect(await erc20.balanceOf(config.engineFactory.address)).to.equal(
        ethers.utils.parseEther("0")
      );
    });
  });
});
