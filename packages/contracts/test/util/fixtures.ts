import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deploySharedMinterFilter,
  deployAndGet,
} from "./common";
import { ethers } from "hardhat";

import { SplitProviderV0 } from "../../scripts/contracts/split/split-provider/SplitProviderV0";
import {
  AdminACLV0,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  EngineFactoryV0,
  CoreRegistryV1,
  UniversalBytecodeStorageReader,
} from "../../scripts/contracts";

import { SplitAtomicV0__factory } from "../../scripts/contracts";
import { DEFAULT_BASE_URI } from "./constants";

/**
 * Fixture that sets up initial, default config.
 * Note: the starting project is set to zero.
 */
export async function setupConfig() {
  let config: T_Config = {
    accounts: await getAccounts(),
  };
  // assigns starting project of zero
  config = await assignDefaultConstants(config, 0);
  return config;
}

/**
 * Fixture that sets up initial, default config, with minter filter V2
 * Note: does not deploy a shared minter.
 */
export async function setupConfigWitMinterFilterV2() {
  const config = await loadFixture(setupConfig);
  // deploy minter filter V2
  ({
    minterFilter: config.minterFilter,
    minterFilterAdminACL: config.minterFilterAdminACL,
    coreRegistry: config.coreRegistry,
  } = await deploySharedMinterFilter(config, "MinterFilterV2"));
  return config;
}

/**
 * Fixture that sets up initial, default config, with minter filter V2
 * and deploys a dummy shared minter that is allowlisted on the minter filter
 */
export async function setupConfigWitMinterFilterV2Suite() {
  const config = await loadFixture(setupConfigWitMinterFilterV2);
  // deploy dummy shared minter
  config.minter = await deployAndGet(config, "DummySharedMinter", [
    config.minterFilter.address,
  ]);
  // allowlist dummy shared minter on minter filter
  await config.minterFilter.approveMinterGlobally(config.minter.address);
  return config;
}

// extend T_Config to the configured settings for the setupEngineFactory fixture
interface GenArt721CoreV3_EngineFactoryConfig extends T_Config {
  genArt721Core: undefined;
  engineFactory: EngineFactoryV0;
  engineImplementation: GenArt721CoreV3_Engine;
  engineFlexImplementation: GenArt721CoreV3_Engine_Flex;
  adminACL: AdminACLV0;
  coreRegistry: CoreRegistryV1;
  splitProvider: SplitProviderV0;
  projectZero: number;
  projectTwo: number;
}

export async function setupEngineFactory() {
  const config = await loadFixture(setupConfig);
  // Note that for testing purposes, we deploy a new version of the library,
  // but in production we would use the same library deployment for all contracts
  const libraryFactory = await ethers.getContractFactory(
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
  );
  const library = await libraryFactory
    .connect(config.accounts.deployer)
    .deploy(/* no args for library ever */);
  let libraries = {
    libraries: {
      BytecodeStorageReader: library.address,
    },
  };
  // deploy Engine implementations
  const engineCoreContractFactory = await ethers.getContractFactory(
    "GenArt721CoreV3_Engine",
    {
      ...libraries,
    }
  );
  config.engineImplementation = await engineCoreContractFactory
    .connect(config.accounts.deployer)
    .deploy();

  // deploy Engine Flex implementation with Flex libraries
  const flexLibraryFactory = await ethers.getContractFactory("V3FlexLib");
  const flexLibrary = await flexLibraryFactory
    .connect(config.accounts.deployer)
    .deploy(/* no args for library ever */);
  libraries.libraries.V3FlexLib = flexLibrary.address;

  const engineFlexCoreContractFactory = await ethers.getContractFactory(
    "GenArt721CoreV3_Engine_Flex",
    {
      ...libraries,
    }
  );

  config.engineFlexImplementation = await engineFlexCoreContractFactory
    .connect(config.accounts.deployer)
    .deploy();

  // deploy admin ACL
  config.adminACL = await deployAndGet(config, "AdminACLV0", []);
  // deploy core registry
  config.coreRegistry = await deployAndGet(config, "CoreRegistryV1", []);
  // deploy minter filter
  const minterFilterAdminACL = await deployAndGet(config, "AdminACLV0", []);
  config.minterFilter = await deployAndGet(config, "MinterFilterV2", [
    minterFilterAdminACL.address,
    config.coreRegistry.address,
  ]);

  // deploy UniversalReader
  config.universalReader = (await deployAndGet(
    config,
    "UniversalBytecodeStorageReader",
    [config.accounts.deployer.address]
  )) as UniversalBytecodeStorageReader;
  // deploy version-specific reader and configure universalReader
  const versionedReaderFactory = await ethers.getContractFactory(
    "BytecodeStorageReaderContractV2_Web3Call",
    { libraries: { BytecodeStorageReader: library.address } }
  );
  const versionedReader = await versionedReaderFactory
    .connect(config.accounts.deployer)
    .deploy();
  await config.universalReader
    .connect(config.accounts.deployer)
    .updateBytecodeStorageReaderContract(versionedReader.address);

  // deploy Engine factory
  config.engineFactory = await deployAndGet(config, "EngineFactoryV0", [
    config.engineImplementation.address,
    config.engineFlexImplementation.address,
    config.coreRegistry.address,
    config.accounts.deployer.address, // owner
    DEFAULT_BASE_URI,
    config.universalReader.address,
  ]);

  // transfer ownership of core registry to engine factory
  await config.coreRegistry
    .connect(config.accounts.deployer)
    .transferOwnership(config.engineFactory.address);

  config.randomizer = await deployAndGet(config, "BasicRandomizerV2", []);

  // split provider
  const mockSplitterFactory = await deployAndGet(
    config,
    "Mock0xSplitsV2PullFactory",
    []
  );
  config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
    mockSplitterFactory.address, // _splitterFactory
  ])) as SplitProviderV0;

  return config as GenArt721CoreV3_EngineFactoryConfig;
}

export async function setupSplits() {
  const config = await loadFixture(setupConfig);
  // deploy splitter implementation
  config.splitterImplementation = await deployAndGet(
    config,
    "SplitAtomicV0",
    []
  );
  // deploy splitter factory
  config.splitterFactory = await deployAndGet(config, "SplitAtomicFactoryV0", [
    config.splitterImplementation.address,
    config.accounts.deployer.address, // required split address
    2222, // required split bps
  ]);
  // define valid and invalid splits
  config.validSplit = [
    { recipient: config.accounts.deployer.address, basisPoints: 2222 },
    { recipient: config.accounts.artist.address, basisPoints: 2778 },
    { recipient: config.accounts.additional.address, basisPoints: 5000 },
  ];
  config.invalidSplit = [
    { recipient: config.accounts.user.address, basisPoints: 2222 }, // missing required split
    { recipient: config.accounts.artist.address, basisPoints: 2778 },
    { recipient: config.accounts.additional.address, basisPoints: 5000 },
  ];
  // deploy valid splitter via factory
  const tx = await config.splitterFactory.createSplit(config.validSplit);
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  // get splitter address from logs
  const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
  const splitterAddress = ethers.utils.defaultAbiCoder.decode(
    ["address"],
    splitterCreationLog.topics[1]
  )[0];
  config.splitter = SplitAtomicV0__factory.connect(
    splitterAddress,
    ethers.provider
  );
  return config;
}
