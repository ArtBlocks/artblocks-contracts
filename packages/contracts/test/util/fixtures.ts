import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  T_Config,
  getAccounts,
  assignDefaultConstants,
  deploySharedMinterFilter,
  deployAndGet,
} from "./common";

import { ethers } from "hardhat";

import { Contract } from "ethers";

import { SplitAtomicV0__factory } from "../../scripts/contracts";

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

export async function setupSplits() {
  const config = await loadFixture(setupConfig);
  const targetSplits = [
    { recipient: config.accounts.deployer.address, basisPoints: 2222 },
    { recipient: config.accounts.artist.address, basisPoints: 2778 },
    { recipient: config.accounts.additional.address, basisPoints: 5000 },
  ];
  // deploy splitter implementation
  config.splitterImplementation = await deployAndGet(config, "SplitAtomicV0", [
    targetSplits,
  ]);
  // deploy splitter factory
  config.splitterFactory = await deployAndGet(config, "SplitAtomicFactoryV0", [
    config.splitterImplementation.address,
    config.accounts.deployer.address, // required split address
    2222, // required split bps
  ]);
  // deploy splitter via factory
  const tx = await config.splitterFactory.createSplit(targetSplits);
  const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
  // get splitter address from logs
  const splitterCreationLog = receipt.logs[receipt.logs.length - 1];
  const splitterAddress = ethers.utils.getAddress(
    "0x" + splitterCreationLog.topics[1].slice(-40)
  );
  config.splitter = new Contract(splitterAddress, SplitAtomicV0__factory.abi);
  return config;
}
