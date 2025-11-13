import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  T_Config,
  deployAndGet,
  deployCoreWithMinterFilter,
} from "../../../../util/common";
import { setupConfig } from "../../../../util/fixtures";
import {
  DelegateRegistry,
  GenArt721CoreV3_Engine_Flex,
} from "../../../../../scripts/contracts";
import { PMPV0, SRHooks } from "../../../../../scripts/contracts";

// Extend the T_Config type with SRHooks-specific properties
export interface SRHooksFixtureConfig extends T_Config {
  genArt721Core: GenArt721CoreV3_Engine_Flex;
  delegateRegistry: DelegateRegistry;
  pmp: PMPV0;
  srHooksImplementation: SRHooks;
  srHooksProxy: SRHooks;
  projectThree: number;
  projectThreeTokenZero: BigNumber;
  projectThreeTokenOne: BigNumber;
  projectThreeTokenTwo: BigNumber;
  projectThreeTokenThree: BigNumber;
}

/**
 * Sets up a fixture with GenArt721CoreV3_Engine_Flex, PMPV0, and SRHooks (UUPS proxy)
 * and creates test project 3 and tokens for testing token number vs token ID handling
 */
export async function setupSRHooksFixture(): Promise<SRHooksFixtureConfig> {
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
  // @dev delegate.xyz v2
  const delegateRegistry = await deployAndGet(config, "DelegateRegistry", []);
  const pmp = (await deployAndGet(config, "PMPV0", [
    delegateRegistry.address,
  ])) as PMPV0;

  // Create projects 0, 1, 2 first so we can test with project 3
  for (let i = 0; i < 3; i++) {
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .addProject(
        `Test Project ${i}`,
        i === 0
          ? config.accounts.artist.address
          : config.accounts.artist2.address
      );
  }

  // Create test project 3 (to ensure token number vs token ID handling)
  const projectThree = 3;
  await config.genArt721Core
    .connect(config.accounts.deployer)
    .addProject("Test Project Three", config.accounts.artist.address);

  // Activate the project
  await config.genArt721Core
    .connect(config.accounts.deployer)
    .toggleProjectIsActive(projectThree);

  // Unpause the project to allow minting
  await config.genArt721Core
    .connect(config.accounts.artist)
    .toggleProjectIsPaused(projectThree);

  // Register the PMPV0 contract as a flex ONCHAIN dependency for the project
  await config.genArt721Core
    .connect(config.accounts.artist)
    .addProjectAssetDependencyOnChainAtAddress(projectThree, pmp.address);

  // Deploy SRHooks implementation
  const SRHooksFactory = await ethers.getContractFactory(
    "SRHooks",
    config.accounts.deployer
  );

  // Deploy as UUPS upgradeable proxy
  const srHooksProxy = (await upgrades.deployProxy(
    SRHooksFactory,
    [
      config.accounts.deployer.address, // owner
      config.genArt721Core.address,
      projectThree,
    ],
    {
      kind: "uups",
      initializer: "initialize",
    }
  )) as SRHooks;
  await srHooksProxy.deployed();

  // Get the implementation address for reference
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    srHooksProxy.address
  );
  const srHooksImplementation = SRHooksFactory.attach(
    implementationAddress
  ) as SRHooks;

  // Configure PMP hooks for project 3
  await pmp.connect(config.accounts.artist).configureProjectHooks(
    config.genArt721Core.address,
    projectThree,
    ethers.constants.AddressZero, // no post config hook
    srHooksProxy.address // augment hook
  );

  // Configure the minter for the project
  // Deploy a minter
  const minter = await deployAndGet(config, "MinterSetPriceV2", [
    config.genArt721Core.address,
    config.minterFilter.address,
  ]);

  // Add minter to filter and configure for project
  await config.minterFilter
    .connect(config.accounts.deployer)
    .addApprovedMinter(minter.address);

  await config.minterFilter
    .connect(config.accounts.deployer)
    .setMinterForProject(projectThree, minter.address);

  // Set the project price
  const pricePerTokenInWei = ethers.utils.parseEther("0.1");
  await minter
    .connect(config.accounts.artist)
    .updatePricePerTokenInWei(projectThree, pricePerTokenInWei);

  // Mint some tokens for testing
  // Token 0 belongs to user
  await minter
    .connect(config.accounts.user)
    .purchase(projectThree, { value: pricePerTokenInWei });

  // Token 1 belongs to user2
  await minter
    .connect(config.accounts.user2)
    .purchase(projectThree, { value: pricePerTokenInWei });

  // Token 2 belongs to additional
  await minter
    .connect(config.accounts.additional)
    .purchase(projectThree, { value: pricePerTokenInWei });

  // Token 3 belongs to additional2
  await minter
    .connect(config.accounts.additional2)
    .purchase(projectThree, { value: pricePerTokenInWei });

  // Add SRHooks-specific properties to the config
  const srHooksConfig: SRHooksFixtureConfig = {
    ...config,
    delegateRegistry,
    pmp,
    srHooksImplementation,
    srHooksProxy,
    projectThree,
    projectThreeTokenZero: ethers.BigNumber.from(3000000),
    projectThreeTokenOne: ethers.BigNumber.from(3000001),
    projectThreeTokenTwo: ethers.BigNumber.from(3000002),
    projectThreeTokenThree: ethers.BigNumber.from(3000003),
  };

  return srHooksConfig;
}
