import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
  T_Config,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../util/common";
import { setupConfig } from "../../util/fixtures";
import {
  GenArt721CoreV3_Engine_Flex,
  MockPMPConfigureHook,
} from "../../../scripts/contracts";
import { MockPMPAugmentHook } from "../../../scripts/contracts";
import { PMPV0 } from "../../../scripts/contracts";

// Extend the T_Config type with PMP-specific properties
export interface PMPFixtureConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine_Flex;
  pmp: PMPV0;
  configureHook: MockPMPConfigureHook;
  augmentHook: MockPMPAugmentHook;
  projectZero: number;
  projectOne: number;
  projectZeroTokenZero: BigNumber;
  projectZeroTokenOne: BigNumber;
  projectZeroTokenTwo: BigNumber;
  projectOneTokenZero: BigNumber;
  projectOneTokenOne: BigNumber;
}

/**
 * Sets up a fixture with GenArt721CoreV3_Engine_Flex, PMPV0,
 * and creates test projects and tokens for PMP testing
 */
export async function setupPMPFixture(): Promise<PMPFixtureConfig> {
  // Get the default config
  const config = await setupConfig();

  // Set up core contracts using the existing fixture
  const { genArt721Core, minterFilter, randomizer } =
    await deployCoreWithMinterFilter(
      config,
      "GenArt721CoreV3_Engine_Flex",
      "MinterFilterV1"
    );

  // Explicitly assign core contracts to the config
  config.genArt721Core = genArt721Core;
  config.minterFilter = minterFilter;
  config.randomizer = randomizer;

  // Deploy PMPV0 contract
  const pmp = (await deployAndGet(config, "PMPV0", [])) as PMPV0;
  // also deploy hook contracts so they are available for testing
  const configureHook = await deployMockConfigureHook(config.accounts.deployer);
  const augmentHook = await deployMockAugmentHook(config.accounts.deployer);

  // Create test projects
  const projectZero = 0;
  const projectOne = 1;
  await config.genArt721Core
    .connect(config.accounts.deployer)
    .addProject("Test Project Zero", config.accounts.artist.address);

  await config.genArt721Core
    .connect(config.accounts.deployer)
    .addProject("Test Project One", config.accounts.artist2.address);

  // Activate the projects
  await config.genArt721Core
    .connect(config.accounts.deployer)
    .toggleProjectIsActive(projectZero);

  await config.genArt721Core
    .connect(config.accounts.deployer)
    .toggleProjectIsActive(projectOne);

  // Unpause the projects to allow minting
  await config.genArt721Core
    .connect(config.accounts.artist)
    .toggleProjectIsPaused(projectZero);

  await config.genArt721Core
    .connect(config.accounts.artist2)
    .toggleProjectIsPaused(projectOne);

  // Register the PMPV0 contract as a flex ONCHAIN dependency for both projects
  await config.genArt721Core
    .connect(config.accounts.artist)
    .addProjectAssetDependencyOnChainAtAddress(projectZero, pmp.address);

  await config.genArt721Core
    .connect(config.accounts.artist2)
    .addProjectAssetDependencyOnChainAtAddress(projectOne, pmp.address);

  // Configure the minter for the projects
  // Deploy a minter
  const minter = await deployAndGet(config, "MinterSetPriceV2", [
    config.genArt721Core.address,
    config.minterFilter.address,
  ]);

  // Add minter to filter and configure for projects
  await config.minterFilter
    .connect(config.accounts.deployer)
    .addApprovedMinter(minter.address);

  await config.minterFilter
    .connect(config.accounts.deployer)
    .setMinterForProject(projectZero, minter.address);

  await config.minterFilter
    .connect(config.accounts.deployer)
    .setMinterForProject(projectOne, minter.address);

  // Set the project price
  const pricePerTokenInWei = ethers.utils.parseEther("0.1");
  await minter
    .connect(config.accounts.artist)
    .updatePricePerTokenInWei(projectZero, pricePerTokenInWei);

  await minter
    .connect(config.accounts.artist2)
    .updatePricePerTokenInWei(projectOne, pricePerTokenInWei);

  // Mint some tokens
  // Token 0 belongs to user
  await minter
    .connect(config.accounts.user)
    .purchase(projectZero, { value: pricePerTokenInWei });

  // Token 1 belongs to user2
  await minter
    .connect(config.accounts.user2)
    .purchase(projectZero, { value: pricePerTokenInWei });

  // Token 2 belongs to user from a different project
  await minter
    .connect(config.accounts.user)
    .purchase(projectOne, { value: pricePerTokenInWei });

  // Token 3 belongs to user2 from a different project
  await minter
    .connect(config.accounts.user2)
    .purchase(projectOne, { value: pricePerTokenInWei });

  // Add PMP-specific properties to the config
  const pmpConfig: PMPFixtureConfig = {
    ...config,
    pmp,
    configureHook,
    augmentHook,
    projectZeroTokenZero: ethers.BigNumber.from(0),
    projectZeroTokenOne: ethers.BigNumber.from(1),
    projectZeroTokenTwo: ethers.BigNumber.from(2),
    projectOneTokenZero: ethers.BigNumber.from(1000000),
    projectOneTokenOne: ethers.BigNumber.from(1000001),
  };

  return pmpConfig;
}

/**
 * Deploys a mock implementation of IPMPConfigureHook
 */
export async function deployMockConfigureHook(
  deployer: SignerWithAddress
): Promise<MockPMPConfigureHook> {
  const hookFactory = await ethers.getContractFactory(
    "MockPMPConfigureHook",
    deployer
  );
  const hook = await hookFactory.deploy();
  await hook.deployed();
  return hook as MockPMPConfigureHook;
}

/**
 * Deploys a mock implementation of IPMPAugmentHook
 */
export async function deployMockAugmentHook(
  deployer: SignerWithAddress
): Promise<MockPMPAugmentHook> {
  const hookFactory = await ethers.getContractFactory(
    "MockPMPAugmentHook",
    deployer
  );
  const hook = await hookFactory.deploy();
  await hook.deployed();
  return hook as MockPMPAugmentHook;
}
