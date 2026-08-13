// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 1 — validate the upgrade and report the deterministic implementation address.
 *
 * Runs OpenZeppelin's storage-layout validation against every live proxy on the
 * network before anything is deployed, then derives the CREATE2 address the new
 * implementation will occupy. Because the implementation is deployed with the
 * permissionless all-zero salt, that address is identical on every chain.
 *
 *   yarn hardhat run --network sepolia scripts/generator-upgrade/1_validate-and-prepare.ts
 *   yarn hardhat run --network mainnet scripts/generator-upgrade/1_validate-and-prepare.ts
 */

import { ethers, upgrades } from "hardhat";
import { getNetworkName } from "../util/utils";
import { ethCallOrThrow } from "./eth-call";
import {
  CONTRACT_NAME,
  CREATE2_FACTORY,
  IMPLEMENTATION_SALT,
  getEnvironment,
} from "./config";

const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);

  console.log(`Network:     ${networkName} (chain ${environment.chainId})`);
  console.log(`ProxyAdmin:  ${environment.proxyAdmin}`);
  console.log(
    `Safe:        ${environment.safe.address} (${environment.safe.threshold}-of-${environment.safe.owners})\n`
  );

  const factory = await ethers.getContractFactory(CONTRACT_NAME);

  // ---- storage-layout validation, per proxy -------------------------------
  console.log("Validating storage layout against each live proxy...");
  for (const proxy of environment.proxies) {
    const current = await currentImplementation(proxy.address);
    await upgrades.validateUpgrade(proxy.address, factory);
    console.log(
      `  ${proxy.label.padEnd(8)} ${proxy.address}  current impl ${current}  OK`
    );
  }

  // ---- deterministic implementation address ------------------------------
  const initcode = factory.getDeployTransaction().data?.toString() as string;
  const initcodeHash = ethers.utils.keccak256(initcode);
  const predicted = ethers.utils.getCreate2Address(
    CREATE2_FACTORY,
    IMPLEMENTATION_SALT,
    initcodeHash
  );

  console.log(`\nNew implementation (CREATE2)`);
  console.log(`  factory:       ${CREATE2_FACTORY}`);
  console.log(`  salt:          ${IMPLEMENTATION_SALT}`);
  console.log(`  initcode hash: ${initcodeHash}`);
  console.log(`  address:       ${predicted}`);

  const deployedCode = await ethers.provider.getCode(predicted);
  if (deployedCode === "0x") {
    console.log(`  status:        not yet deployed on ${networkName}`);
    console.log(
      `\nNext: add ${CONTRACT_NAME} to scripts/create2-deploy/config.ts and run ` +
        `\`yarn create2-deploy\`, leaving the salt at its all-zero default. ` +
        `See scripts/generator-upgrade/README.md.`
    );
    return;
  }

  // Running the initcode through eth_call returns the runtime bytecode it would
  // deploy, which lets us prove the existing contract is this exact build. The
  // implementation declares no immutables, so the comparison is exact.
  const expectedRuntime = await ethCallOrThrow({ data: initcode });
  if (expectedRuntime.toLowerCase() !== deployedCode.toLowerCase()) {
    throw new Error(
      `Code already exists at ${predicted} but does not match the local build of ` +
        `${CONTRACT_NAME}. Do not upgrade to it. Recompile and re-check.`
    );
  }
  console.log(
    `  status:        already deployed on ${networkName}, runtime bytecode matches local build`
  );
  console.log(`\nNext: build the Safe batch with 2_build-upgrade-txs.ts.`);
}

async function currentImplementation(proxy: string): Promise<string> {
  const raw = await ethers.provider.getStorageAt(proxy, IMPLEMENTATION_SLOT);
  return ethers.utils.getAddress("0x" + raw.slice(-40));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
