/**
 * This file contains common types and util functions for testing purposes
 */
import { BN } from "@openzeppelin/test-helpers";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber } from "ethers";

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

export type CoreWithMinterSuite = {
  randomizer: Contract;
  genArt721Core: Contract;
  minterFilter: Contract;
  adminACL: Contract;
  engineRegistry?: Contract;
};

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
  auctionStartTimeOffset?: number;
  targetMinterName?: string;
  // contracts
  genArt721Core?: Contract;
  randomizer?: Contract;
  minterFilter?: Contract;
  minter?: Contract;
  adminACL?: Contract;
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
  // project IDs
  config.projectZero = projectZero;
  config.projectOne = projectZero + 1;
  config.projectTwo = projectZero + 2;
  config.projectThree = projectZero + 3;
  // token IDs
  config.projectZeroTokenZero = new BN(config.projectZero).mul(
    new BN("1000000")
  );
  config.projectZeroTokenOne = config.projectZeroTokenZero.add(new BN("1"));
  config.projectOneTokenZero = new BN(config.projectOne).mul(new BN("1000000"));
  config.projectOneTokenOne = config.projectOneTokenZero.add(new BN("1"));
  config.projectTwoTokenZero = new BN(config.projectTwo).mul(new BN("1000000"));
  config.projectTwoTokenOne = config.projectTwoTokenZero.add(new BN("1"));
  config.projectThreeTokenZero = new BN(config.projectThree).mul(
    new BN("1000000")
  );
  config.projectThreeTokenOne = config.projectThreeTokenZero.add(new BN("1"));
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
    .deploy(...deployArgs);
}

// utility function to deploy basic randomizer, core, and MinterFilter
// works for core versions V0, V1, V2_PRTNR, V3
export async function deployCoreWithMinterFilter(
  config: T_Config,
  coreContractName: string,
  minterFilterName: string,
  useAdminACLWithEvents: boolean = false,
  _adminACLContractName?: string
): Promise<CoreWithMinterSuite> {
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
    randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";
    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;
    adminACL = await deployAndGet(config, adminACLContractName, []);
    genArt721Core = await deployAndGet(config, coreContractName, [
      config.name,
      config.symbol,
      randomizer.address,
      adminACL.address,
      0, // _startingProjectId
    ]);
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
  } else if (coreContractName.endsWith("V3_Engine")) {
    randomizer = await deployAndGet(config, "BasicRandomizerV2", []);
    let adminACLContractName = useAdminACLWithEvents
      ? "MockAdminACLV0Events"
      : "AdminACLV0";
    // if function input has adminACL contract name, use that instead
    adminACLContractName = _adminACLContractName
      ? _adminACLContractName
      : adminACLContractName;
    adminACL = await deployAndGet(config, adminACLContractName, []);
    engineRegistry = await deployAndGet(config, "EngineRegistryV0", []);
    // Note: in the common tests, set `autoApproveArtistSplitProposals` to false, which
    //       mirrors the approval-flow behavior of the other (non-Engine) V3 contracts
    genArt721Core = await deployAndGet(config, coreContractName, [
      config.name, // _tokenName
      config.symbol, // _tokenSymbol
      config.accounts.deployer.address, // _renderProviderAddress
      config.accounts.additional.address, // _platformProviderAddress
      randomizer.address, // _randomizerContract
      adminACL.address, // _adminACLContract
      0, // _startingProjectId
      false, // _autoApproveArtistSplitProposals
      engineRegistry.address, // _engineRegistryContract
    ]);
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
  _projectId: BN,
  _minterAccount: SignerWithAddress,
  _leaveRemainingInvocations: number = 0
) {
  for (let i = 0; i < this.maxInvocations - _leaveRemainingInvocations; i++) {
    await this.minter.connect(_minterAccount).purchase(_projectId);
  }
}

export async function advanceEVMByTime(_timeSeconds: number) {
  // advance with evm_increaseTime, then mine to advance time
  await ethers.provider.send("evm_increaseTime", [_timeSeconds]);
  await ethers.provider.send("evm_mine", []);
}

// utility funciton to compare Big Numbers, expecting them to be within x%, +/-
export function compareBN(
  actual: BigNumber,
  expected: BigNumber,
  tolerancePercent: number = 1
): boolean {
  const diff = actual.sub(expected);
  const percentDiff = diff.mul(BigNumber.from("100")).div(expected);
  return percentDiff.abs().lte(BigNumber.from(tolerancePercent.toString()));
}

// utility function to return if core is V3
export async function isCoreV3(core: Contract): Promise<boolean> {
  try {
    if ((await core.coreType()) === "GenArt721CoreV3") {
      return true;
    }
  } catch {
    // swallow error because function doesn't exist on pre-V3 core contracts
  }
  return false;
}

type T_PBAB = {
  pbabToken: Contract;
  pbabMinter: Contract;
};

export async function deployAndGetPBAB(): Promise<T_PBAB> {
  const randomizer = await deployAndGet.call(this, "BasicRandomizer", []);

  const PBABFactory = await ethers.getContractFactory("GenArt721CoreV2_PBAB");
  const pbabToken = await PBABFactory.connect(this.accounts.deployer).deploy(
    this.name,
    this.symbol,
    randomizer.address,
    0
  );
  const minterFactory = await ethers.getContractFactory("GenArt721Minter_PBAB");
  const pbabMinter = await minterFactory.deploy(pbabToken.address);
  await pbabToken
    .connect(this.accounts.deployer)
    .addProject(
      "project0_PBAB",
      this.accounts.artist.address,
      this.pricePerTokenInWei
    );
  await pbabToken.connect(this.accounts.deployer).toggleProjectIsActive(0);
  await pbabToken
    .connect(this.accounts.deployer)
    .addMintWhitelisted(pbabMinter.address);
  await pbabToken
    .connect(this.accounts.artist)
    .updateProjectMaxInvocations(0, this.maxInvocations);
  await pbabToken.connect(this.accounts.artist).toggleProjectIsPaused(0);
  return { pbabToken, pbabMinter };
}

export async function getTxResponseTimestamp(tx) {
  const receipt = await tx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  return block.timestamp;
}
