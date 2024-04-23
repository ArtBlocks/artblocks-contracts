/**
 * This file contains common types and util functions for testing purposes
 */
import { BN } from "@openzeppelin/test-helpers";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber } from "ethers";
import { ONE_MINUTE } from "./constants";
import {
  AdminACLV0,
  GenArt721Core,
  GenArt721CoreV1,
  GenArt721CoreV2_ENGINE_FLEX,
  GenArt721CoreV2_PBAB,
  GenArt721CoreV2_PRTNR,
  GenArt721CoreV3,
  GenArt721CoreV3_Engine,
  GenArt721CoreV3_Engine_Flex,
  GenArt721CoreV3_Engine_Flex_PROHIBITION,
  GenArt721CoreV3_Engine_IncorrectCoreType,
  GenArt721CoreV3_Explorations,
  GenArt721CoreV3_Explorations__factory,
  GenArt721Minter_PBAB,
  MinterFilterV0,
  MinterFilterV1,
  MinterFilterV2,
} from "../../scripts/contracts";

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
  splitterImplementation?: Contract;
  splitterFactory?: Contract;
  splitter?: Contract;
  // split configs
  validSplit?: T_Split;
  invalidSplit?: T_Split;
  // minter test details
  isEngine?: boolean;
  delegationRegistry?: Contract;
  // ref / mocks
  ERC20?: Contract;
  weth?: Contract;
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
    "BytecodeStorageReader"
  );
  const library = await libraryFactory
    .connect(config.accounts.deployer)
    .deploy(/* no args for library ever */);

  // Deploy actual contract (with library linked)
  const coreContractFactory = await ethers.getContractFactory(
    coreContractName,
    {
      libraries: {
        BytecodeStorageReader: library.address,
      },
    }
  );
  return await coreContractFactory
    .connect(config.accounts.deployer)
    .deploy(...(deployArgs ?? []));
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
    // Note: in the common tests, set `autoApproveArtistSplitProposals` to false, which
    //       mirrors the approval-flow behavior of the other (non-Engine) V3 contracts
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      [
        config.name, // _tokenName
        config.symbol, // _tokenSymbol
        config.accounts.deployer.address, // _renderProviderAddress
        config.accounts.additional.address, // _platformProviderAddress
        randomizer.address, // _randomizerContract
        adminACL.address, // _adminACLContract
        0, // _startingProjectId
        false, // _autoApproveArtistSplitProposals
      ]
    );
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
    // Note: in the common tests, set `autoApproveArtistSplitProposals` to false, which
    //       mirrors the approval-flow behavior of the other (non-Engine) V3 contracts
    genArt721Core = await deployWithStorageLibraryAndGet(
      config,
      coreContractName,
      [
        config.name, // _tokenName
        config.symbol, // _tokenSymbol
        config.accounts.deployer.address, // _renderProviderAddress
        config.accounts.additional.address, // _platformProviderAddress
        randomizer.address, // _randomizerContract
        adminACL.address, // _adminACLContract
        config.projectZero, // starting project ID
        false, // _autoApproveArtistSplitProposals
      ]
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
