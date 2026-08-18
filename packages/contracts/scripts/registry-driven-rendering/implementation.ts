// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Derives and checks the CREATE2 address of an implementation.
 *
 * Every script that references an implementation address computes it from the
 * local build rather than reading it from config, so a batch can never point at
 * a stale address, and re-running after a recompile surfaces the change instead
 * of silently upgrading to different code.
 */

import { ethers } from "hardhat";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import { CREATE2_FACTORY, IMPLEMENTATION_SALT } from "./config";

export type PredictedImplementation = {
  address: string;
  initcode: string;
  initcodeHash: string;
};

export async function predictImplementation(
  contractName: string
): Promise<PredictedImplementation> {
  const factory = await ethers.getContractFactory(contractName);
  const initcode = factory.getDeployTransaction().data?.toString() as string;
  const initcodeHash = ethers.utils.keccak256(initcode);
  return {
    address: ethers.utils.getCreate2Address(
      CREATE2_FACTORY,
      IMPLEMENTATION_SALT,
      initcodeHash
    ),
    initcode,
    initcodeHash,
  };
}

/**
 * Resolves the implementation address, refusing to continue unless it is already
 * deployed and its runtime bytecode is exactly what the local build produces.
 */
export async function requireDeployedImplementation(
  contractName: string
): Promise<string> {
  const { address, initcode } = await predictImplementation(contractName);

  const deployedCode = await ethers.provider.getCode(address);
  if (deployedCode === "0x") {
    throw new Error(
      `No contract at ${address}. Deploy ${contractName} with \`yarn create2-deploy\` ` +
        `before building this batch. See scripts/registry-driven-rendering/README.md.`
    );
  }

  const expectedRuntime = await ethCallOrThrow({ data: initcode });
  if (expectedRuntime.toLowerCase() !== deployedCode.toLowerCase()) {
    throw new Error(
      `Code at ${address} does not match the local build of ${contractName}. ` +
        `Refusing to build an upgrade batch.`
    );
  }

  return address;
}
