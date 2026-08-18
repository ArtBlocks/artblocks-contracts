// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 1 — validate both upgrades and report the deterministic implementation
 * addresses.
 *
 * Runs OpenZeppelin's storage-layout validation against every live proxy on the
 * network before anything is deployed, then derives the CREATE2 address each new
 * implementation will occupy. Because implementations are deployed with the
 * permissionless all-zero salt, those addresses are identical on every chain.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/1_validate-and-prepare.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/1_validate-and-prepare.ts
 */

import { ethers, upgrades } from "hardhat";
import { getNetworkName } from "../util/utils";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import {
  GENERATOR_CONTRACT_NAME,
  REGISTRY_CONTRACT_NAME,
  getEnvironment,
} from "./config";
import { predictImplementation } from "./implementation";
import { readImplementation, resolveRollout } from "./topology";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  await validate(
    REGISTRY_CONTRACT_NAME,
    rollout.registries.map((r) => ({ label: r.label, address: r.address })),
    networkName
  );
  await validate(
    GENERATOR_CONTRACT_NAME,
    rollout.generators.map((g) => ({ label: g.label, address: g.address })),
    networkName
  );
}

async function validate(
  contractName: string,
  proxies: { label: string; address: string }[],
  networkName: string
) {
  console.log(`=== ${contractName} ===`);
  const factory = await ethers.getContractFactory(contractName);

  for (const proxy of proxies) {
    const current = await readImplementation(proxy.address);
    await upgrades.validateUpgrade(proxy.address, factory);
    console.log(
      `  ${proxy.label.padEnd(8)} ${proxy.address}  current impl ${current}  layout OK`
    );
  }

  const { address, initcode, initcodeHash } =
    await predictImplementation(contractName);
  console.log(`  new implementation (CREATE2): ${address}`);
  console.log(`  initcode hash:                ${initcodeHash}`);

  const deployedCode = await ethers.provider.getCode(address);
  if (deployedCode === "0x") {
    console.log(`  status:                       not yet deployed\n`);
    return;
  }

  // Running the initcode through eth_call returns the runtime bytecode it would
  // deploy, which proves the existing contract is this exact build. Neither
  // implementation declares immutables, so the comparison is exact.
  const expectedRuntime = await ethCallOrThrow({ data: initcode });
  if (expectedRuntime.toLowerCase() !== deployedCode.toLowerCase()) {
    throw new Error(
      `Code already exists at ${address} but does not match the local build of ` +
        `${contractName}. Do not upgrade to it. Recompile and re-check.`
    );
  }
  console.log(
    `  status:                       deployed on ${networkName}, bytecode matches local build\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
