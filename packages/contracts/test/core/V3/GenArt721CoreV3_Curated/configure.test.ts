import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  AdminACLV0,
  GenArt721CoreV3_Curated,
  MinterFilterV2,
  SharedRandomizerV0,
  UniversalBytecodeStorageReader,
} from "../../../../scripts/contracts";
import { GenArt721CoreV3_Curated__factory } from "../../../../scripts/contracts/factories/contracts/GenArt721CoreV3_Curated.sol";
import {
  GENART721_ERROR_NAME,
  GENART721_ERROR_CODES,
} from "../../../util/common";
import { DEFAULT_BASE_URI } from "../../../util/constants";

import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deployCoreWithMinterFilter,
} from "../../../util/common";

interface T_CuratedTestConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Curated;
  adminACL: AdminACLV0;
  minterFilter: MinterFilterV2;
  randomizer: SharedRandomizerV0;
  universalReader: UniversalBytecodeStorageReader;
}

// test the following V3 core contract derivatives:
const coreContractsToTest = [
  "GenArt721CoreV3_Curated", // V3.2 core Curated contract
];

/**
 * Tests for V3 core dealing with configuring the core contract.
 */
for (const coreContractName of coreContractsToTest) {
  describe(`${coreContractName} Contract Configure`, async function () {
    async function _beforeEach() {
      let config: T_Config = {
        accounts: await getAccounts(),
      };
      config = await assignDefaultConstants(config);

      // deploy and configure minter filter and minter
      ({
        genArt721Core: config.genArt721Core,
        minterFilter: config.minterFilter,
        randomizer: config.randomizer,
        adminACL: config.adminACL,
      } = await deployCoreWithMinterFilter(
        config,
        coreContractName,
        "MinterFilterV2"
      ));
      return config as T_CuratedTestConfig;
    }

    describe("constructor", async function () {
      it("reverts when render provider address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: constants.ZERO_ADDRESS, // INVALID ZERO ADDRESS
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          DEFAULT_BASE_URI,
          config.universalReader.address
        );
        await expect(config.accounts.deployer.sendTransaction(deployTx))
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyNonZeroAddress);
      });

      it("reverts when randomizer address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: constants.ZERO_ADDRESS, // INVALID ZERO ADDRESS
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          DEFAULT_BASE_URI,
          config.universalReader.address
        );
        await expect(config.accounts.deployer.sendTransaction(deployTx))
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyNonZeroAddress);
      });

      it("reverts when adminACL address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          constants.ZERO_ADDRESS, // INVALID ZERO ADDRESS
          DEFAULT_BASE_URI,
          config.universalReader.address
        );
        await expect(config.accounts.deployer.sendTransaction(deployTx))
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyNonZeroAddress);
      });

      it("reverts when reader address is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          DEFAULT_BASE_URI,
          constants.ZERO_ADDRESS // INVALID ZERO ADDRESS
        );
        await expect(config.accounts.deployer.sendTransaction(deployTx))
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyNonZeroAddress);
      });

      it("reverts when defaultBaseURIHost is empty", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          "", // INVALID EMPTY BASE URI
          config.universalReader.address
        );
        await expect(
          config.accounts.deployer.sendTransaction(deployTx)
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: defaultBaseURIHost must be non-empty"
        );
      });

      it("reverts when auto approve split proposals is true", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: true, // INVALID TRUE
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          "dummybaseurihost",
          config.universalReader.address
        );
        await expect(
          config.accounts.deployer.sendTransaction(deployTx)
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: autoApproveArtistSplitProposals must be false"
        );
      });

      it("reverts when platform provider isn't constrained to be null", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: false, // INVALID FALSE
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          "dummybaseurihost",
          config.universalReader.address
        );
        await expect(
          config.accounts.deployer.sendTransaction(deployTx)
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: nullPlatformProvider must be true"
        );
      });

      it("reverts when allowArtistProjectActivation is true", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: true, // INVALID TRUE
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          "dummybaseurihost",
          config.universalReader.address
        );
        await expect(
          config.accounts.deployer.sendTransaction(deployTx)
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: allowArtistProjectActivation must be false"
        );
      });

      it("reverts when starting project is zero", async function () {
        const config = await loadFixture(_beforeEach);
        const bytecodeStorageLibFactory = await ethers.getContractFactory(
          "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
        );
        const library = await bytecodeStorageLibFactory
          .connect(config.accounts.deployer)
          .deploy(/* no args for library ever */);
        const curatedFactory = new GenArt721CoreV3_Curated__factory(
          {
            "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
              library.address,
          },
          config.accounts.deployer
        );
        const invalidCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 0, // INVALID ZERO
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        // deploy curated core
        const deployTx = curatedFactory.getDeployTransaction(
          invalidCuratedConfiguration,
          config.adminACL.address,
          "dummybaseurihost",
          config.universalReader.address
        );
        await expect(
          config.accounts.deployer.sendTransaction(deployTx)
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: startingProjectId must be greater than 0"
        );
      });

      it("properly initializes default base URI", async function () {
        const config = await loadFixture(_beforeEach);
        const expectedTokenURI = "https://token.artblocks.io/";
        expect(await config.genArt721Core.defaultBaseURI()).to.equal(
          expectedTokenURI
        );
      });
    });

    describe("initialize", function () {
      it("reverts on call to initialize (curated is initialized in constructor)", async function () {
        const config = await loadFixture(_beforeEach);
        const validCuratedConfiguration = {
          tokenName: config.name,
          tokenSymbol: config.symbol,
          renderProviderAddress: config.accounts.deployer.address,
          platformProviderAddress: constants.ZERO_ADDRESS,
          newSuperAdminAddress: constants.ZERO_ADDRESS,
          minterFilterAddress: config.minterFilter.address,
          randomizerContract: config.randomizer.address,
          splitProviderAddress: config.splitProvider?.address,
          startingProjectId: 999,
          autoApproveArtistSplitProposals: false,
          nullPlatformProvider: true,
          allowArtistProjectActivation: false,
        };
        await expect(
          config.genArt721Core.initialize(
            validCuratedConfiguration,
            constants.ZERO_ADDRESS, // dummy,
            "dummybaseurihost",
            constants.ZERO_ADDRESS // dummy
          )
        ).to.be.revertedWith(
          "GenArt721CoreV3_Curated: contract initialized in constructor"
        );
      });
    });

    describe("updateArtblocksCurationRegistryAddress", function () {
      it("reverts when called by non-admin", async function () {
        const config = await loadFixture(_beforeEach);
        const newAddress = config.accounts.deployer.address;
        await expect(
          config.genArt721Core
            .connect(config.accounts.user)
            .updateArtblocksCurationRegistryAddress(newAddress)
        )
          .to.be.revertedWithCustomError(
            config.genArt721Core,
            GENART721_ERROR_NAME
          )
          .withArgs(GENART721_ERROR_CODES.OnlyAdminACL);
      });

      it("updates state after calling", async function () {
        const config = await loadFixture(_beforeEach);
        const newAddress = config.accounts.deployer.address;
        await config.genArt721Core.updateArtblocksCurationRegistryAddress(
          newAddress
        );
        expect(
          await config.genArt721Core.artblocksCurationRegistryAddress()
        ).to.equal(newAddress);
      });
    });
  });
}
