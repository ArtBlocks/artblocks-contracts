import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deploySharedMinterFilter,
  deployAndGet,
} from "./common";

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
