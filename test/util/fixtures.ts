import { BN, constants, expectRevert } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deploySharedMinterFilter,
  deployAndGet,
} from "./common";

// fixture that sets up initial, default config.
// note that starting project is zero.
export async function setupConfig() {
  let config: T_Config = {
    accounts: await getAccounts(),
  };
  // assigns starting project of zero
  config = await assignDefaultConstants(config, 0);
  return config;
}

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
