/**
 * This file contains common types and util functions for testing purposes
 */
import { BN } from "@openzeppelin/test-helpers";
import { ethers, network } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, constants } from "ethers";
import { DEFAULT_BASE_URI, ONE_MINUTE } from "./constants";
import { SplitProviderV0 } from "../../scripts/contracts/contracts/split/split-provider/SplitProviderV0.sol";
import {
  GenArt721Core,
  GenArt721CoreV1,
  GenArt721CoreV2_ENGINE_FLEX,
  GenArt721CoreV2_PBAB,
  GenArt721CoreV2_PRTNR,
  GenArt721CoreV3,
  GenArt721CoreV3_Curated__factory,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  GenArt721CoreV3_Engine_Flex_PROHIBITION,
  GenArt721CoreV3_Engine_IncorrectCoreType,
  GenArt721CoreV3_Explorations,
  GenArt721Minter_PBAB,
  MinterFilterV0,
  MinterFilterV1,
  MinterFilterV2,
  OwnedCreate2FactoryV0,
} from "../../scripts/contracts";
import { UniversalBytecodeStorageReader } from "../../scripts/contracts";

export type TestAccountsArtBlocks = {
  deployer: SignerWithAddress;
  deployer2: SignerWithAddress;
  artist: SignerWithAddress;
  additional: SignerWithAddress;
  artist2: SignerWithAddress;
  additional2: SignerWithAddress;
  user: SignerWithAddress;
  user2: SignerWithAddress;
};

export type CoreWithMinterSuite<
  CoreContractName extends DeployCoreWithMinterFilterSupportedCoreContractNames,
  MinterFilterName extends SupportedMinterFilterNames,
  AdminACLType extends Contract = Contract,
> = {
  randomizer: Contract;
  genArt721Core: DeployCoreWithMinterFilterSupportedCoreContractTypes[CoreContractName];
  minterFilter: SupportedMinterFilterTypes[MinterFilterName];
  adminACL: AdminACLType;
  engineRegistry?: Contract;
};

export type CoreWithoutMinterSuite<
  CoreContractName extends DeployCoreSupportedCoreContractNames,
  AdminACLType extends Contract = Contract,
> = {
  randomizer: Contract;
  genArt721Core: DeployCoreSupportedCoreContractTypes[CoreContractName];
  adminACL: AdminACLType;
};

export type SharedMinterFilterSuite = {
  minterFilter: Contract;
  minterFilterAdminACL: Contract;
  coreRegistry: Contract;
};

type T_Split = Array<{ recipient: string; basisPoints: number }>;

export type T_Config = {
  // standard hardhat accounts
  accounts: TestAccountsArtBlocks;
  // token info
  name?: string;
  symbol?: string;
  // project IDs
  projectZero?: number;
  projectOne?: number;
  projectTwo?: number;
  projectThree?: number;
  // token IDs
  projectZeroTokenZero?: BigNumber;
  projectZeroTokenOne?: BigNumber;
  projectZeroTokenTwo?: BigNumber;
  projectOneTokenZero?: BigNumber;
  projectOneTokenOne?: BigNumber;
  projectTwoTokenZero?: BigNumber;
  projectTwoTokenOne?: BigNumber;
  projectThreeTokenZero?: BigNumber;
  projectThreeTokenOne?: BigNumber;
  // minter/auction
  pricePerTokenInWei?: BigNumber;
  maxInvocations?: number;
  startingPrice?: BigNumber;
  higherPricePerTokenInWei?: BigNumber;
  basePrice?: BigNumber;
  defaultHalfLife?: number;
  startTime?: number;
  endTime?: number;
  auctionStartTimeOffset?: number;
  targetMinterName?: string;
  defaultAuctionLengthSeconds?: number;
  bidIncrementPercentage?: number;
  // contracts
  genArt721Core?: Contract;
  randomizer?: Contract;
  minterFilter?: Contract;
  minter?: Contract;
  altMinter?: Contract;
  adminACL?: Contract;
  minterFilterAdminACL?: Contract;
  coreRegistry?: Contract;
  minterSetPrice?: Contract;
  deadReceiver?: Contract;
  engineImplementation?: Contract;
  engineFlexImplementation?: Contract;
  engineFactory?: Contract;
  splitterImplementation?: Contract;
  splitterFactory?: Contract;
  splitter?: Contract;
  splitProvider?: SplitProviderV0;
  ownedCreate2Factory?: OwnedCreate2FactoryV0;
  universalReader?: UniversalBytecodeStorageReader;
  // split configs
  validSplit?: T_Split;
  invalidSplit?: T_Split;
  // minter test details
  isEngine?: boolean;
  delegationRegistry?: Contract; // delegate.xyz v1
  delegateRegistryV2?: Contract; // delegate.xyz v2
  // ref / mocks
  ERC20?: Contract;
  weth?: Contract;
};

// type of arguments for V3PaymentProposal, V3 Engine
export type T_V3PaymentProposalArgs = [
  number,
  string,
  string,
  number,
  string,
  number,
];

export const PLATFORM_UPDATED_FIELDS = {
  FIELD_NEXT_PROJECT_ID: ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
  FIELD_NEW_PROJECTS_FORBIDDEN: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(1),
    32
  ),
  FIELD_DEFAULT_BASE_URI: ethers.utils.hexZeroPad(ethers.utils.hexlify(2), 32),
  FIELD_RANDOMIZER_ADDRESS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(3),
    32
  ),
  FIELD_NEXT_CORE_CONTRACT: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(4),
    32
  ),
  FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(5),
    32
  ),
  FIELD_ARTBLOCKS_ON_CHAIN_GENERATOR_ADDRESS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(6),
    32
  ),
  FIELD_PROVIDER_SALES_ADDRESSES: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(7),
    32
  ),
  FIELD_PROVIDER_PRIMARY_SALES_PERCENTAGES: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(8),
    32
  ),
  FIELD_PROVIDER_SECONDARY_SALES_BPS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(9),
    32
  ),
  FIELD_SPLIT_PROVIDER: ethers.utils.hexZeroPad(ethers.utils.hexlify(10), 32),
  FIELD_BYTECODE_STORAGE_READER: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(11),
    32
  ),
};

export const PROJECT_UPDATED_FIELDS = {
  FIELD_PROJECT_COMPLETED: ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32),
  FIELD_PROJECT_ACTIVE: ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32),
  FIELD_PROJECT_ARTIST_ADDRESS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(2),
    32
  ),
  FIELD_PROJECT_PAUSED: ethers.utils.hexZeroPad(ethers.utils.hexlify(3), 32),
  FIELD_PROJECT_CREATED: ethers.utils.hexZeroPad(ethers.utils.hexlify(4), 32),
  FIELD_PROJECT_NAME: ethers.utils.hexZeroPad(ethers.utils.hexlify(5), 32),
  FIELD_PROJECT_ARTIST_NAME: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(6),
    32
  ),
  FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(7),
    32
  ),
  FIELD_PROJECT_DESCRIPTION: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(8),
    32
  ),
  FIELD_PROJECT_WEBSITE: ethers.utils.hexZeroPad(ethers.utils.hexlify(9), 32),
  FIELD_PROJECT_LICENSE: ethers.utils.hexZeroPad(ethers.utils.hexlify(10), 32),
  FIELD_PROJECT_MAX_INVOCATIONS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(11),
    32
  ),
  FIELD_PROJECT_SCRIPT: ethers.utils.hexZeroPad(ethers.utils.hexlify(12), 32),
  FIELD_PROJECT_SCRIPT_TYPE: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(13),
    32
  ),
  FIELD_PROJECT_ASPECT_RATIO: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(14),
    32
  ),
  FIELD_PROJECT_BASE_URI: ethers.utils.hexZeroPad(ethers.utils.hexlify(15), 32),
  FIELD_PROVIDER_SECONDARY_FINANCIALS: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(16),
    32
  ),
};

export const GENART721_ERROR_NAME = "GenArt721Error";
export const GENART721_ERROR_CODES = {
  OnlyNonZeroAddress: 0,
  OnlyNonEmptyString: 1,
  OnlyNonEmptyBytes: 2,
  TokenDoesNotExist: 3,
  ProjectDoesNotExist: 4,
  OnlyUnlockedProjects: 5,
  OnlyAdminACL: 6,
  OnlyArtist: 7,
  OnlyArtistOrAdminACL: 8,
  OnlyAdminACLOrRenouncedArtist: 9,
  OnlyMinterContract: 10,
  MaxInvocationsReached: 11,
  ProjectMustExistAndBeActive: 12,
  PurchasesPaused: 13,
  OnlyRandomizer: 14,
  TokenHashAlreadySet: 15,
  NoZeroHashSeed: 16,
  OverMaxSumOfPercentages: 17,
  IndexOutOfBounds: 18,
  OverMaxSumOfBPS: 19,
  MaxOf100Percent: 20,
  PrimaryPayeeIsZeroAddress: 21,
  SecondaryPayeeIsZeroAddress: 22,
  MustMatchArtistProposal: 23,
  NewProjectsForbidden: 24,
  NewProjectsAlreadyForbidden: 25,
  OnlyArtistOrAdminIfLocked: 26,
  OverMaxSecondaryRoyaltyPercentage: 27,
  OnlyMaxInvocationsDecrease: 28,
  OnlyGteInvocations: 29,
  ScriptIdOutOfRange: 30,
  NoScriptsToRemove: 31,
  ScriptTypeAndVersionFormat: 32,
  AspectRatioTooLong: 33,
  AspectRatioNoNumbers: 34,
  AspectRatioImproperFormat: 35,
  NullPlatformProvider: 36,
  ContractInitialized: 37,
};

export async function getAccounts(): Promise<TestAccountsArtBlocks> {
  const [
    deployer,
    deployer2,
    artist,
    additional,
    artist2,
    additional2,
    user,
    user2,
  ] = await ethers.getSigners();
  return {
    deployer: deployer,
    deployer2: deployer2,
    artist: artist,
    additional: additional,
    artist2: artist2,
    additional2: additional2,
    user: user,
    user2: user2,
  };
}

export async function assignDefaultConstants(
  config: T_Config,
  projectZero: number = 0
): Promise<T_Config> {
  config.name = "Non Fungible Token";
  config.symbol = "NFT";
  config.pricePerTokenInWei = ethers.utils.parseEther("1");
  config.maxInvocations = 15;
  config.defaultAuctionLengthSeconds = 60 * ONE_MINUTE;
  // project IDs
  config.projectZero = projectZero;
  config.projectOne = projectZero + 1;
  config.projectTwo = projectZero + 2;
  config.projectThree = projectZero + 3;
  // token IDs
  const projectZeroTokenZero = new BN(config.projectZero).mul(
    new BN("1000000")
  );
  const projectZeroTokenOne = projectZeroTokenZero.add(new BN("1"));
  const projectZeroTokenTwo = projectZeroTokenOne.add(new BN("1"));
  const projectOneTokenZero = new BN(config.projectOne).mul(new BN("1000000"));
  const projectOneTokenOne = projectOneTokenZero.add(new BN("1"));
  const projectTwoTokenZero = new BN(config.projectTwo).mul(new BN("1000000"));
  const projectTwoTokenOne = projectTwoTokenZero.add(new BN("1"));
  const projectThreeTokenZero = new BN(config.projectThree).mul(
    new BN("1000000")
  );
  const projectThreeTokenOne = projectThreeTokenZero.add(new BN("1"));

  config = {
    ...config,
    projectZeroTokenZero,
    projectZeroTokenOne,
    projectZeroTokenTwo,
    projectOneTokenZero,
    projectOneTokenOne,
    projectTwoTokenZero,
    projectTwoTokenOne,
    projectThreeTokenZero,
    projectThreeTokenOne,
  };

  return config;
}

// utility function to simplify code when deploying any contract from factory
export async function deployAndGet(
  config: T_Config,
  coreContractName: string,
  deployArgs?: any[]
): Promise<Contract> {
  const contractFactory = await ethers.getContractFactory(coreContractName);
  return await contractFactory
    .connect(config.accounts.deployer)
    .deploy(...(deployArgs ?? []));
}

// utility function to simplify code when deploying any contract from factory
// that requires the bytecode storage library
export async function deployWithStorageLibraryAndGet(
  config: T_Config,
  coreContractName: string,
  deployArgs?: any[]
): Promise<Contract> {
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

  if (
    coreContractName.endsWith("Engine") ||
    coreContractName.endsWith("Flex")
  ) {
    // map deploy args to engine configuration params
    const [
      tokenName,
      tokenSymbol,
      renderProviderAddress,
      platformProviderAddress,
      randomizerAddress,
      adminACLAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      splitProviderAddress,
      nullPlatformProvider,
      allowArtistProjectActivation,
    ] = deployArgs || [];
    // Deploy the Engine Factory and Engine and Engine Flex implementation contracts
    const engineContractCoreFactory = await ethers.getContractFactory(
      "GenArt721CoreV3_Engine",
      {
        ...libraries,
      }
    );
    const engineImplementation = await engineContractCoreFactory
      .connect(config.accounts.deployer)
      .deploy();
    const flexLibraryFactory = await ethers.getContractFactory("V3FlexLib");
    const flexLibrary = await flexLibraryFactory
      .connect(config.accounts.deployer)
      .deploy(/* no args for library ever */);
    libraries.libraries.V3FlexLib = flexLibrary.address;

    const coreRegistry = await deployAndGet(config, "CoreRegistryV1", []);

    const engineFlexCoreContractFactory = await ethers.getContractFactory(
      "GenArt721CoreV3_Engine_Flex",
      {
        ...libraries,
      }
    );
    const engineFlexImplementation = await engineFlexCoreContractFactory
      .connect(config.accounts.deployer)
      .deploy();

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
    // deploy engine factory
    const engineFactory = await deployAndGet(config, "EngineFactoryV0", [
      engineImplementation.address,
      engineFlexImplementation.address,
      coreRegistry?.address,
      config.accounts.deployer.address,
      DEFAULT_BASE_URI,
      config.universalReader.address,
    ]);
    // transfer ownership of core registry to engine factory
    await coreRegistry
      ?.connect(config.accounts.deployer)
      .transferOwnership(engineFactory?.address);
    // deploy randomizer
    const randomizerContract =
      randomizerAddress ??
      (await deployAndGet(config, "BasicRandomizerV2", [])).address;

    // deploy minter filter
    const minterFilterAdminACL = await deployAndGet(config, "AdminACLV0", []);
    const minterFilter = await deployAndGet(config, "MinterFilterV2", [
      minterFilterAdminACL.address,
      coreRegistry.address,
    ]);

    const validEngineConfigurationExistingAdminACL = {
      tokenName,
      tokenSymbol,
      renderProviderAddress,
      platformProviderAddress,
      newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
      minterFilterAddress: minterFilter.address,
      randomizerContract,
      splitProviderAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      nullPlatformProvider,
      allowArtistProjectActivation,
    };

    const engineCoreType = coreContractName.endsWith("Engine_Flex") ? 1 : 0;
    const engineContractType = coreContractName.endsWith("Engine_Flex")
      ? "GenArt721CoreV3_Engine_Flex"
      : "GenArt721CoreV3_Engine";
    const engineSalt = coreContractName.endsWith("Engine_Flex")
      ? ethers.utils.formatBytes32String("Unique salt Engine1")
      : ethers.utils.formatBytes32String("Unique salt Engine2");
    const tx = await engineFactory.createEngineContract(
      engineCoreType,
      validEngineConfigurationExistingAdminACL,
      deployArgs?.[5] ? deployArgs?.[5] : config?.adminACL?.address,
      engineSalt // random salt
    );
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const engineContractCreationLog = receipt.logs[receipt.logs.length - 1];
    const engineAddress = ethers.utils.defaultAbiCoder.decode(
      ["address"],
      engineContractCreationLog.topics[1]
    )[0];
    return await ethers.getContractAt(engineContractType, engineAddress);
  } else {
    // Deploy actual contract (with library linked)
    const coreContractFactory = await ethers.getContractFactory(
      coreContractName,
      {
        ...libraries,
      }
    );
    return await coreContractFactory
      .connect(config.accounts.deployer)
      .deploy(...deployArgs);
  }
}

export async function deployAndGetUniversalReader(
  config: T_Config
): Promise<UniversalBytecodeStorageReader> {
  // Note that for testing purposes, we deploy a new version of the library,
  // but in production we would use the same library deployment for all contracts
  const libraryFactory = await ethers.getContractFactory(
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
  );
  const library = await libraryFactory
    .connect(config.accounts.deployer)
    .deploy(/* no args for library ever */);

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
  return config.universalReader;
}

type SupportedMinterFilterNames =
  | "MinterFilterV0"
  | "MinterFilterV1"
  | "MinterFilterV2";

type SupportedMinterFilterTypes = {
  MinterFilterV0: MinterFilterV0;
  MinterFilterV1: MinterFilterV1;
  MinterFilterV2: MinterFilterV2;
};

type DeployCoreWithMinterFilterSupportedCoreContractNames =
  | DeployCoreSupportedCoreContractNames
  | "GenArt721CoreV2_PRTNR"
  | "GenArt721CoreV0"
  | "GenArt721CoreV1"
  | "GenArt721CoreV2_ENGINE_FLEX";

type DeployCoreWithMinterFilterSupportedCoreContractTypes =
  DeployCoreSupportedCoreContractTypes & {
    GenArt721CoreV2_PRTNR: GenArt721CoreV2_PRTNR;
    GenArt721CoreV0: GenArt721Core;
    GenArt721CoreV1: GenArt721CoreV1;
    GenArt721CoreV2_ENGINE_FLEX: GenArt721CoreV2_ENGINE_FLEX;
  };

// utility function to deploy basic randomizer, core, and MinterFilter
// works for core versions V0, V1, V2_PRTNR, V3, MinterFilter V0, V1 (not V2+)
export async function deployCoreWithMinterFilter<
  CoreContractTypeName extends
    DeployCoreWithMinterFilterSupportedCoreContractNames,
  MinterFilterTypeName extends SupportedMinterFilterNames,
  AdminACLType extends Contract = Contract,
>(
  config: T_Config,
  coreContractName: CoreContractTypeName,
  minterFilterName: MinterFilterTypeName,
  useAdminACLWithEvents: boolean = false,
  _adminACLContractName?: string,
  _randomizerName: string = "BasicRandomizerV2"
): Promise<
  CoreWithMinterSuite<CoreContractTypeName, MinterFilterTypeName, AdminACLType>
> {
  if (coreContractName.endsWith("V2_PBAB")) {
    throw new Error("V2_PBAB not supported");
  }
  let randomizer, genArt721Core, minterFilter, adminACL, engineRegistry;
  randomizer = await deployAndGet(config, "BasicRandomizer", []);
  if (
    coreContractName.endsWith("V0") ||
    coreContractName.endsWith("V1") ||
    coreContractName.endsWith("V2_PRTNR") ||
    coreContractName.endsWith("V2_ENGINE_FLEX")
  ) {
    if (
      coreContractName.endsWith("V0") ||
      coreContractName.endsWith("V1") ||
      coreContractName.endsWith("V2_ENGINE_FLEX")
    ) {
      genArt721Core = await deployAndGet(config, coreContractName, [
        config.name,
        config.symbol,
        randomizer.address,
      ]);
    } else {
      // V2_PRTNR need additional arg for starting project ID
      genArt721Core = await deployAndGet(config, coreContractName, [
        config.name,
        config.symbol,
        randomizer.address,
        0,
      ]);
    }
    minterFilter = await deployAndGet(config, minterFilterName, [
      genArt721Core.address,
    ]);
    // allowlist minterFilter on the core contract
    await genArt721Core
      .connect(config.accounts.deployer)
      .addMintWhitelisted(minterFilter.address);
  } else if (
    coreContractName.endsWith("V3") ||
    coreContractName.endsWith("V3_Explorations")
  ) {
    randomizer = await deployAndGet(config, _randomizerName, []);
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";

    // if core contract name ends with _PROHIBITION, use that for adminACL too
    adminACLContractName = coreContractName.endsWith("_PROHIBITION")
      ? `${adminACLContractName}_PROHIBITION`
      : adminACLContractName;

    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;
    adminACL = await deployAndGet(config, adminACLContractName, []);
    // split provider
    const mockSplitterFactory = await deployAndGet(
      config,
      "Mock0xSplitsV2PullFactory",
      []
    );
    config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
      mockSplitterFactory.address, // _splitterFactory
    ])) as SplitProviderV0;
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      [
        config.name,
        config.symbol,
        randomizer.address,
        adminACL.address,
        0, // _startingProjectId
      ]
    );
    // assign core contract for randomizer to use
    randomizer
      .connect(config.accounts.deployer)
      .assignCoreAndRenounce(genArt721Core.address);
    // deploy minter filter
    minterFilter = await deployAndGet(config, minterFilterName, [
      genArt721Core.address,
    ]);
    // allowlist minterFilter on the core contract
    await genArt721Core
      .connect(config.accounts.deployer)
      .updateMinterContract(minterFilter.address);
  } else if (coreContractName.endsWith("V3_Curated")) {
    randomizer = await deployAndGet(config, _randomizerName, []);
    const minterFilterSuite = await deploySharedMinterFilter(
      config,
      minterFilterName
    );
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";
    minterFilter = minterFilterSuite.minterFilter;

    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;
    adminACL = await deployAndGet(config, adminACLContractName, []);
    // split provider
    const mockSplitterFactory = await deployAndGet(
      config,
      "Mock0xSplitsV2PullFactory",
      []
    );
    config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
      mockSplitterFactory.address, // _splitterFactory
    ])) as SplitProviderV0;
    const validCuratedConfiguration = {
      tokenName: config.name,
      tokenSymbol: config.symbol,
      renderProviderAddress: config.accounts.deployer.address,
      platformProviderAddress: constants.AddressZero,
      newSuperAdminAddress: "0x0000000000000000000000000000000000000000",
      minterFilterAddress: minterFilter.address,
      randomizerContract: randomizer.address,
      splitProviderAddress: config.splitProvider?.address,
      startingProjectId: 999,
      autoApproveArtistSplitProposals: false,
      nullPlatformProvider: true,
      allowArtistProjectActivation: false,
    };
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
    // deploy curated core
    genArt721Core = await curatedFactory.deploy(
      validCuratedConfiguration,
      adminACL.address,
      DEFAULT_BASE_URI,
      config.universalReader.address
    );
  } else if (
    coreContractName.endsWith("V3_Engine") ||
    coreContractName.endsWith("V3_Engine_Flex") ||
    coreContractName.endsWith("V3_Engine_Flex_PROHIBITION") ||
    coreContractName === "GenArt721CoreV3_Engine_IncorrectCoreType"
  ) {
    randomizer = await deployAndGet(config, _randomizerName, []);
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";

    // if core contract name ends with _PROHIBITION, use that for adminACL too
    adminACLContractName = coreContractName.endsWith("_PROHIBITION")
      ? `${adminACLContractName}_PROHIBITION`
      : adminACLContractName;

    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;

    adminACL = await deployAndGet(config, adminACLContractName, []);
    engineRegistry = await deployAndGet(config, "EngineRegistryV0", []);
    // split provider
    const mockSplitterFactory = await deployAndGet(
      config,
      "Mock0xSplitsV2PullFactory",
      []
    );
    config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
      mockSplitterFactory.address, // _splitterFactory
    ])) as SplitProviderV0;
    // Note: in the common tests, set `autoApproveArtistSplitProposals` to false, which
    //       mirrors the approval-flow behavior of the other (non-Engine) V3 contracts
    const constructorArgs = [
      config.name, // _tokenName
      config.symbol, // _tokenSymbol
      config.accounts.deployer.address, // _renderProviderAddress
      config.accounts.additional.address, // _platformProviderAddress
      randomizer.address, // _randomizerContract
      adminACL.address, // _adminACLContract
      0, // _startingProjectId
      false, // _autoApproveArtistSplitProposals
    ];
    // add additional v3.2 args if not a PROHIBITION contract
    if (
      !coreContractName.includes("PROHIBITION") &&
      !coreContractName.includes("IncorrectCoreType")
    ) {
      constructorArgs.push(config.splitProvider.address); // _splitProviderAddress
      constructorArgs.push(false); // _nullPlatformProvider
      constructorArgs.push(false); // _allowArtistProjectActivation
    }
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      constructorArgs
    );
    // Engine and Engine_Flex Factory contract handles registry
    if (
      !coreContractName.endsWith("V3_Engine") &&
      !coreContractName.endsWith("V3_Engine_Flex")
    ) {
      // register core on engine registry
      const coreVersion = await genArt721Core.coreVersion();
      const coreType = await genArt721Core.coreType();
      await engineRegistry
        .connect(config.accounts.deployer)
        .registerContract(
          genArt721Core.address,
          ethers.utils.formatBytes32String(coreVersion),
          ethers.utils.formatBytes32String(coreType)
        );
    }
    // assign core contract for randomizer to use
    randomizer
      .connect(config.accounts.deployer)
      .assignCoreAndRenounce(genArt721Core.address);
    // deploy minter filter
    minterFilter = await deployAndGet(config, minterFilterName, [
      genArt721Core.address,
    ]);
    // allowlist minterFilter on the core contract
    await genArt721Core
      .connect(config.accounts.deployer)
      .updateMinterContract(minterFilter.address);
  }
  return { randomizer, genArt721Core, minterFilter, adminACL, engineRegistry };
}

export async function deploySharedMinterFilter(
  config: T_Config,
  minterFilterName: string
): Promise<SharedMinterFilterSuite> {
  if (minterFilterName !== "MinterFilterV2") {
    throw new Error(
      `deployCoreWithMinterFilterV2 only supports MinterFilterV2`
    );
  }
  // deploy minter filter's own adminACL
  const minterFilterAdminACL = await deployAndGet(config, "AdminACLV0", []);
  // deploy MinterFilter's core registry
  const coreRegistry = await deployAndGet(config, "CoreRegistryV1", []);
  // deploy minter filter
  const minterFilter = await deployAndGet(config, minterFilterName, [
    minterFilterAdminACL.address,
    coreRegistry.address,
  ]);
  return { minterFilter, minterFilterAdminACL, coreRegistry };
}

type DeployCoreSupportedCoreContractNames =
  | "GenArt721CoreV3"
  | "GenArt721CoreV3_Explorations"
  | "GenArt721CoreV3_Engine"
  | "GenArt721CoreV3_Engine_Flex"
  | "GenArt721CoreV3_Engine_Flex_PROHIBITION"
  | "GenArt721CoreV3_Engine_IncorrectCoreType";

type DeployCoreSupportedCoreContractTypes = {
  GenArt721CoreV3: GenArt721CoreV3;
  GenArt721CoreV3_Explorations: GenArt721CoreV3_Explorations;
  GenArt721CoreV3_Engine: GenArt721CoreV3_Engine;
  GenArt721CoreV3_Engine_Flex: GenArt721CoreV3_Engine_Flex;
  GenArt721CoreV3_Engine_Flex_PROHIBITION: GenArt721CoreV3_Engine_Flex_PROHIBITION;
  GenArt721CoreV3_Engine_IncorrectCoreType: GenArt721CoreV3_Engine_IncorrectCoreType;
};

// utility function to deploy basic randomizer, core, and MinterFilter
// works for core versions V3 (any)
// registers core contract to CoreRegistryV1
export async function deployCore<
  T extends DeployCoreSupportedCoreContractNames,
>(
  config: T_Config,
  coreContractName: T,
  CoreRegistryV1: Contract,
  useAdminACLWithEvents: boolean = false,
  _randomizerName: string = "SharedRandomizerV0",
  _adminACLContractName?: string
): Promise<CoreWithoutMinterSuite<T>> {
  let randomizer, genArt721Core, adminACL;
  if (_randomizerName.startsWith("SharedRandomizer")) {
    // deploy pseudorandom atomic, then randomizer
    const pseudorandomAtomic = await deployAndGet(
      config,
      "PseudorandomAtomic",
      []
    );
    randomizer = await deployAndGet(config, _randomizerName, [
      pseudorandomAtomic.address,
    ]);
  } else {
    // we don't need any constructor args for BasicRandomizers
    randomizer = await deployAndGet(config, _randomizerName, []);
  }

  const bytecodeStorageLibFactory = await ethers.getContractFactory(
    "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader"
  );

  const library = await bytecodeStorageLibFactory
    .connect(config.accounts.deployer)
    .deploy(/* no args for library ever */);
  let libraries = {
    libraries: {
      BytecodeStorageReader: library.address,
    },
  };

  // deploy Engine and Engine Flex implementations with libraries
  const engineCoreContractFactory = await ethers.getContractFactory(
    "GenArt721CoreV3_Engine",
    {
      ...libraries,
    }
  );

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

  // deploy core contract + associated contracts
  if (
    coreContractName.endsWith("V3") ||
    coreContractName.endsWith("V3_Explorations")
  ) {
    let adminACLContractName =
      _adminACLContractName ?? useAdminACLWithEvents
        ? "MockAdminACLV0Events"
        : "AdminACLV0";
    adminACL = await deployAndGet(config, adminACLContractName, []);
    // split provider
    const mockSplitterFactory = await deployAndGet(
      config,
      "Mock0xSplitsV2PullFactory",
      []
    );
    config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
      mockSplitterFactory.address, // _splitterFactory
    ])) as SplitProviderV0;
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      [
        config.name,
        config.symbol,
        randomizer.address,
        adminACL.address,
        config.projectZero, // starting project ID
      ]
    );
    // register core contract on CoreRegistryV1
    const coreVersion = await genArt721Core.coreVersion();
    const coreType = await genArt721Core.coreType();
    await CoreRegistryV1.connect(config.accounts.deployer).registerContract(
      genArt721Core.address,
      ethers.utils.formatBytes32String(coreVersion),
      ethers.utils.formatBytes32String(coreType)
    );
  } else if (
    coreContractName.endsWith("V3_Engine") ||
    coreContractName.endsWith("V3_Engine_Flex") ||
    coreContractName.endsWith("V3_Engine_Flex_PROHIBITION") ||
    coreContractName === "GenArt721CoreV3_Engine_IncorrectCoreType"
  ) {
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";

    // if core contract name ends with _PROHIBITION, use that for adminACL too
    adminACLContractName = coreContractName.endsWith("_PROHIBITION")
      ? `${adminACLContractName}_PROHIBITION`
      : adminACLContractName;

    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;

    adminACL = await deployAndGet(config, adminACLContractName, []);
    // split provider
    const mockSplitterFactory = await deployAndGet(
      config,
      "Mock0xSplitsV2PullFactory",
      []
    );
    config.splitProvider = (await deployAndGet(config, "SplitProviderV0", [
      mockSplitterFactory.address, // _splitterFactory
    ])) as SplitProviderV0;
    const deployArgs = [
      config.name, // _tokenName
      config.symbol, // _tokenSymbol
      config.accounts.deployer.address, // _renderProviderAddress
      config.accounts.additional.address, // _platformProviderAddress
      randomizer.address, // _randomizerContract
      adminACL.address, // _adminACLContract
      config.projectZero, // starting project ID
      false, // _autoApproveArtistSplitProposals
    ];
    if (!coreContractName.endsWith("_PROHIBITION")) {
      deployArgs.push(config.splitProvider.address); // _splitProviderAddress
      deployArgs.push(false); // _nullPlatformProvider
      deployArgs.push(false); // _allowArtistProjectActivation
    }
    // Note: in the common tests, set `autoApproveArtistSplitProposals` to false, which
    //       mirrors the approval-flow behavior of the other (non-Engine) V3 contracts
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      [...deployArgs]
    );
    // register core on core registry
    const coreVersion = await genArt721Core.coreVersion();
    const coreType = await genArt721Core.coreType();
    await CoreRegistryV1.connect(config.accounts.deployer).registerContract(
      genArt721Core.address,
      ethers.utils.formatBytes32String(coreVersion),
      ethers.utils.formatBytes32String(coreType)
    );
  } else {
    throw new Error(
      `deployCore does not support core contract name: ${coreContractName}`
    );
  }
  // complete setup of randomizer, if needed
  if (!_randomizerName.startsWith("SharedRandomizer")) {
    // assign core contract for randomizer to use
    randomizer
      .connect(config.accounts.deployer)
      .assignCoreAndRenounce(genArt721Core.address);
  }
  return { randomizer, genArt721Core, adminACL };
}

// utility function to call addProject on core for either V0/V1 core,
// PBAB/PRTNR, or V3 core.
// (used because different core versions have different addProject functions)
export async function safeAddProject(
  core: Contract,
  caller: SignerWithAddress,
  artistAddress: string
) {
  try {
    await core.connect(caller).addProject("TestProject", artistAddress, 0);
  } catch {
    try {
      // V3 core has only 2 args
      await core.connect(caller).addProject("TestProject", artistAddress);
    } catch {
      await core
        .connect(caller)
        .addProject("TestProject", artistAddress, 0, false);
    }
  }
}

export async function mintProjectUntilRemaining(
  config: T_Config,
  _projectId: BN,
  _minterAccount: SignerWithAddress,
  _leaveRemainingInvocations: number = 0
) {
  if (!config.minter || !config.maxInvocations) {
    throw new Error("minter or maxInvocations not defined in config");
  }

  for (let i = 0; i < config.maxInvocations - _leaveRemainingInvocations; i++) {
    await config.minter.connect(_minterAccount).purchase(_projectId);
  }
}

export async function advanceEVMByTime(_timeSeconds: number) {
  // advance with evm_increaseTime, then mine to advance time
  await ethers.provider.send("evm_increaseTime", [_timeSeconds]);
  await ethers.provider.send("evm_mine", []);
}

// utility function to compare Big Numbers, expecting them to be within x%, +/-
export function requireBigNumberIsClose(
  actual: BigNumber,
  expected: BigNumber,
  tolerancePercent: number = 1
) {
  const diff = actual.sub(expected);
  const percentDiff = diff.mul(BigNumber.from("100")).div(expected);
  const passes = percentDiff
    .abs()
    .lte(BigNumber.from(tolerancePercent.toString()));
  if (!passes) {
    throw new Error(
      `BN's out of tolerance ${tolerancePercent} percent. Expected ${expected.toString()} but got ${actual.toString()}`
    );
  }
}

// utility function to return if core is V3
export async function isCoreV3(core: Contract): Promise<boolean> {
  try {
    if ((await core.coreType()).startsWith("GenArt721CoreV3")) {
      return true;
    }
  } catch {
    // swallow error because function doesn't exist on pre-V3 core contracts
  }
  return false;
}

type T_PBAB = {
  pbabToken: GenArt721CoreV2_PBAB;
  pbabMinter: GenArt721Minter_PBAB;
};

export async function deployAndGetPBAB(config: T_Config): Promise<T_PBAB> {
  const randomizer = await deployAndGet(config, "BasicRandomizer", []);

  const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
  const pbabToken = (await PBABFactory.connect(config.accounts.deployer).deploy(
    config.name,
    config.symbol,
    randomizer.address,
    0
  )) as GenArt721CoreV2_PBAB;
  const minterFactory = await ethers.getContractFactory("GenArt721Minter_PBAB");
  const pbabMinter = (await minterFactory.deploy(
    pbabToken.address
  )) as GenArt721Minter_PBAB;
  await pbabToken
    .connect(config.accounts.deployer)
    .addProject(
      "project0_PBAB",
      config.accounts.artist.address,
      config.pricePerTokenInWei as BigNumber
    );
  await pbabToken.connect(config.accounts.deployer).toggleProjectIsActive(0);
  await pbabToken
    .connect(config.accounts.deployer)
    .addMintWhitelisted(pbabMinter.address);
  await pbabToken
    .connect(config.accounts.artist)
    .updateProjectMaxInvocations(0, config.maxInvocations as number);
  await pbabToken.connect(config.accounts.artist).toggleProjectIsPaused(0);
  return { pbabToken, pbabMinter };
}

export async function getTxResponseTimestamp(tx) {
  const receipt = await tx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  return block.timestamp;
}

export function hashAddress(_address) {
  return Buffer.from(
    ethers.utils.solidityKeccak256(["address"], [_address]).slice(2),
    "hex"
  );
}

// utility function to return if contract is ERC20Minter
// @dev intended to only be used with shared minter contracts
export async function isERC20Minter(_contract: Contract) {
  const minterType = await _contract.minterType();
  return minterType.includes("ERC20");
}

// utility function to return if contract is a Dutch auction minter
// @dev intended to only be used with shared minter contracts
export async function isDAMinter(_contract: Contract) {
  const minterType = await _contract.minterType();
  return minterType.includes("DA");
}

export async function advanceTimeAndBlock(timeInSeconds: number) {
  await network.provider.send("evm_increaseTime", [timeInSeconds]); // Increase time
  await network.provider.send("evm_mine"); // Mine a new block
}
