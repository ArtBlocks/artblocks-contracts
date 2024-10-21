import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setupEngineFactory } from "../../../util/fixtures";

import { Logger } from "@ethersproject/logger";
import { DEFAULT_BASE_URI } from "../../../util/constants";
// hide nuisance logs about event overloading
Logger.setLogLevel(Logger.levels.ERROR);

const TARGET_TYPE = "EngineFactoryV0";

describe(`EngineFactoryV0 Events`, async function () {
  async function _beforeEach() {
    // deploy new Engine factory
    const config = await loadFixture(setupEngineFactory);
    return config;
  }

  describe("Deployed", async function () {
    it("is emitted during deployment", async function () {
      const config = await loadFixture(_beforeEach);

      // deploy new Engine factory
      const engineFactory = await ethers.getContractFactory(TARGET_TYPE);
      const tx = await engineFactory.connect(config.accounts.deployer).deploy(
        config?.engineImplementation?.address,
        config?.engineFlexImplementation?.address,
        config?.coreRegistry?.address,
        config.accounts.deployer.address, // required owner address
        DEFAULT_BASE_URI,
        config?.universalReader?.address
      );

      const receipt = await await tx.deployTransaction.wait();
      // last log should be deployed
      const deployedLog = receipt.logs[receipt.logs.length - 1];
      // expect "Deployed" event as log 0
      expect(deployedLog.topics[0]).to.be.equal(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("Deployed(address,address,bytes32)")
        )
      );
      // expect proper values in log topics and data
      const abiCoder = ethers.utils.defaultAbiCoder;
      expect(
        abiCoder.decode(["address"], deployedLog.topics[1])[0]
      ).to.be.equal(config?.engineImplementation?.address);
      expect(
        abiCoder.decode(["address"], deployedLog.topics[2])[0]
      ).to.be.equal(config?.engineFlexImplementation?.address);
      expect(
        ethers.utils.parseBytes32String(deployedLog.topics[3])
      ).to.be.equal(TARGET_TYPE);
    });
  });

  describe("EngineContractCreated", async function () {
    it("is emitted during new Engine contract creation", async function () {
      const config = await loadFixture(_beforeEach);
      // @dev do not use helper functions, because need to parse logs for new Engine address

      // deploy valid Engine contract via factory
      const validEngineConfigurationExistingAdminACL = {
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
      const tx = await config.engineFactory.createEngineContract(
        0,
        validEngineConfigurationExistingAdminACL,
        config.adminACL.address,
        ethers.utils.formatBytes32String("Unique salt Engine2") // random salt
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get Engine contract address from logs
      const engineContractCreationLog = receipt.logs[receipt.logs.length - 1];
      const engineContractAddress = ethers.utils.defaultAbiCoder.decode(
        ["address"],
        engineContractCreationLog.topics[1]
      )[0];

      // check that the Engine address is a valid Engine contract
      const engineContract = await ethers.getContractAt(
        "GenArt721CoreV3_Engine",
        engineContractAddress
      );
      const engineContractCoreType = await engineContract.coreType();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine");
    });
    it("is emitted during new Engine Flex contract creation", async function () {
      const config = await loadFixture(_beforeEach);
      // @dev do not use helper functions, because need to parse logs for new Engine address

      // deploy valid Engine Flex contract via factory
      const validEngineConfigurationExistingAdminACL = {
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
      const tx = await config.engineFactory.createEngineContract(
        1,
        validEngineConfigurationExistingAdminACL,
        config.adminACL.address,
        ethers.utils.formatBytes32String("Unique salt Engine2") // random salt
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // get Engine Flex contract address from logs
      const engineContractCreationLog = receipt.logs[receipt.logs.length - 1];
      const engineContractAddress = ethers.utils.defaultAbiCoder.decode(
        ["address"],
        engineContractCreationLog.topics[1]
      )[0];

      // check that the Engine address is a valid Engine contract
      const engineContract = await ethers.getContractAt(
        "GenArt721CoreV3_Engine_Flex",
        engineContractAddress
      );
      const engineContractCoreType = await engineContract.coreType();
      expect(engineContractCoreType).to.be.equal("GenArt721CoreV3_Engine_Flex");
    });
  });

  describe("Abandoned", async function () {
    it("is emitted during factory abandonment", async function () {
      const config = await loadFixture(_beforeEach);
      await expect(
        config.engineFactory.connect(config.accounts.deployer).abandon()
      )
        .to.emit(config.engineFactory, "Abandoned")
        .withArgs();
    });
  });
});
