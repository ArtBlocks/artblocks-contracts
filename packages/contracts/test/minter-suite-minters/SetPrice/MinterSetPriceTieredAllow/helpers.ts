import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { setupConfigWitMinterFilterV2Suite } from "../../../util/fixtures";
import { deployAndGet, deployCore, safeAddProject } from "../../../util/common";

export const TARGET_MINTER_NAME = "MinterSetPriceTieredAllowV1";
export const TARGET_MINTER_VERSION = "v1.0.0";
export const CURRENCY_SYMBOL = "USDC";

export const runForEach = [
  { core: "GenArt721CoreV3" },
  { core: "GenArt721CoreV3_Explorations" },
  { core: "GenArt721CoreV3_Engine" },
  { core: "GenArt721CoreV3_Engine_Flex" },
];

/**
 * Shared fixture builder for MinterSetPriceTieredAllowV1.
 * - deploys ERC20Mock as the fixed USDC token
 * - sets accounts.user2 as the privileged allowlist/relay address
 * - funds user (public) and user2 (allowlist) with ERC20
 * - configures prices on projectOne when `configureProjectOnePrices` is true
 */
export function makeBeforeEach(params: { core: string }) {
  return async function _beforeEach() {
    const config = await loadFixture(setupConfigWitMinterFilterV2Suite);
    ({
      genArt721Core: config.genArt721Core,
      randomizer: config.randomizer,
      adminACL: config.adminACL,
    } = await deployCore(config, params.core, config.coreRegistry));

    await config.genArt721Core.updateMinterContract(
      config.minterFilter.address
    );

    // deploy ERC20 (USDC mock) with supply to user
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    config.ERC20 = await ERC20Factory.connect(config.accounts.user).deploy(
      ethers.utils.parseEther("1000")
    );

    config.higherPricePerTokenInWei = config.pricePerTokenInWei.add(
      ethers.utils.parseEther("0.1")
    );
    config.allowlistPricePerTokenInWei = config.pricePerTokenInWei.div(2);

    // user2 is the privileged allowlist/relay address
    config.minter = await deployAndGet(config, TARGET_MINTER_NAME, [
      config.minterFilter.address,
      config.accounts.user2.address,
      config.ERC20.address,
    ]);
    await config.minterFilter
      .connect(config.accounts.deployer)
      .approveMinterGlobally(config.minter.address);

    // fund allowlist wallet with ERC20 from user
    await config.ERC20.connect(config.accounts.user).transfer(
      config.accounts.user2.address,
      ethers.utils.parseEther("100")
    );

    // Project setup
    await safeAddProject(
      config.genArt721Core,
      config.accounts.deployer,
      config.accounts.artist.address
    );
    await safeAddProject(
      config.genArt721Core,
      config.accounts.deployer,
      config.accounts.artist.address
    );

    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.deployer)
      .toggleProjectIsActive(config.projectOne);

    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectZero);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .toggleProjectIsPaused(config.projectOne);

    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(
        config.projectZero,
        config.genArt721Core.address,
        config.minter.address
      );
    await config.minterFilter
      .connect(config.accounts.deployer)
      .setMinterForProject(
        config.projectOne,
        config.genArt721Core.address,
        config.minter.address
      );

    // configure prices for project one (also syncs SplitFunds USDC)
    await config.minter
      .connect(config.accounts.artist)
      .updatePricesPerTokenInWei(
        config.projectOne,
        config.genArt721Core.address,
        config.pricePerTokenInWei,
        config.allowlistPricePerTokenInWei
      );

    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectZero, 15);
    await config.genArt721Core
      .connect(config.accounts.artist)
      .updateProjectMaxInvocations(config.projectOne, 15);

    config.isEngine = params.core.includes("Engine");

    return config;
  };
}

export async function approveAndPurchase(
  config: any,
  buyer: any,
  projectId: number,
  maxPrice: any = null,
  to: string | null = null
) {
  const price = maxPrice ?? config.pricePerTokenInWei;
  await config.ERC20.connect(buyer).approve(config.minter.address, price);
  if (to) {
    return config.minter
      .connect(buyer)
      .purchaseTo(
        to,
        projectId,
        config.genArt721Core.address,
        price,
        config.ERC20.address
      );
  }
  return config.minter
    .connect(buyer)
    .purchase(
      projectId,
      config.genArt721Core.address,
      price,
      config.ERC20.address
    );
}

export async function configureHashSeedForProject(
  config: any,
  projectId: number
) {
  await config.randomizer
    .connect(config.accounts.artist)
    .setHashSeedSetterContract(
      config.genArt721Core.address,
      projectId,
      config.minter.address
    );
  await config.randomizer
    .connect(config.accounts.artist)
    .toggleProjectUseAssignedHashSeed(config.genArt721Core.address, projectId);
}
