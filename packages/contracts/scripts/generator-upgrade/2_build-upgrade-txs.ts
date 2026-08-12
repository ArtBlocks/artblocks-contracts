// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 2 — build the Gnosis Safe Transaction Builder batch that switches each
 * proxy to the new implementation.
 *
 * Nothing is sent on-chain here. The batch is written to the gitignored
 * `deployments/generator/safe-txs/` and uploaded to the Safe's Transaction
 * Builder app; it is a throwaway artifact, since the batch is reproducible by
 * re-running this script. Sepolia's two proxies share one ProxyAdmin and Safe,
 * so they land in a single batch of two calls.
 *
 * The implementation must already be deployed at the address reported by
 * `1_validate-and-prepare.ts`; this script refuses to build a batch pointing at
 * an address with no code, or at code that does not match the local build.
 *
 *   yarn hardhat run --network sepolia scripts/generator-upgrade/2_build-upgrade-txs.ts
 *   yarn hardhat run --network mainnet scripts/generator-upgrade/2_build-upgrade-txs.ts
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import {
  CONTRACT_NAME,
  CREATE2_FACTORY,
  IMPLEMENTATION_SALT,
  getEnvironment,
} from "./config";
import { buildProxyAdminUpgradeTx, buildSafeBatch } from "./safe-tx-builder";
import { ethCallOrThrow } from "./eth-call";

const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "deployments",
  "generator",
  "safe-txs"
);

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);

  const factory = await ethers.getContractFactory(CONTRACT_NAME);
  const initcode = factory.getDeployTransaction().data?.toString() as string;
  const implementation = ethers.utils.getCreate2Address(
    CREATE2_FACTORY,
    IMPLEMENTATION_SALT,
    ethers.utils.keccak256(initcode)
  );

  const deployedCode = await ethers.provider.getCode(implementation);
  if (deployedCode === "0x") {
    throw new Error(
      `No contract at ${implementation} on ${networkName}. Deploy the implementation ` +
        `with \`yarn create2-deploy\` before building the Safe batch.`
    );
  }
  const expectedRuntime = await ethCallOrThrow({ data: initcode });
  if (expectedRuntime.toLowerCase() !== deployedCode.toLowerCase()) {
    throw new Error(
      `Code at ${implementation} does not match the local build of ${CONTRACT_NAME}. ` +
        `Refusing to build an upgrade batch.`
    );
  }

  // Pre-flight each call as if the Safe were sending it, so a batch is never
  // handed to signers unless it is known to execute.
  const proxyAdmin = new ethers.utils.Interface([
    "function upgrade(address proxy, address implementation) external",
  ]);
  for (const proxy of environment.proxies) {
    await ethCallOrThrow({
      from: environment.safe.address,
      to: environment.proxyAdmin,
      data: proxyAdmin.encodeFunctionData("upgrade", [
        proxy.address,
        implementation,
      ]),
    });
  }

  const transactions = environment.proxies.map((proxy) =>
    buildProxyAdminUpgradeTx({
      proxyAdmin: environment.proxyAdmin,
      proxy: proxy.address,
      implementation,
    })
  );

  const labels = environment.proxies.map((p) => p.label).join(" + ");
  const batch = buildSafeBatch({
    chainId: environment.chainId,
    safeAddress: environment.safe.address,
    name: `Upgrade GenArt721GeneratorV0 (${labels})`,
    description:
      `Point the on-chain generator ${environment.proxies.length > 1 ? "proxies" : "proxy"} ` +
      `at implementation ${implementation}, which injects custom@na project scripts ` +
      `verbatim instead of wrapping them in a <script> tag.`,
    transactions,
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `${networkName}-upgrade-generator-${implementation.slice(0, 10)}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");

  console.log(`Network:        ${networkName} (chain ${environment.chainId})`);
  console.log(`Implementation: ${implementation}`);
  console.log(
    `Safe:           ${environment.safe.address} (${environment.safe.threshold}-of-${environment.safe.owners})`
  );
  console.log(`ProxyAdmin:     ${environment.proxyAdmin}\n`);
  console.log(`${transactions.length} transaction(s), each simulated from the Safe:`);
  for (const proxy of environment.proxies) {
    console.log(
      `  upgrade(${proxy.address}, ${implementation})   [${proxy.label}]`
    );
  }
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(
    `Upload it to the Transaction Builder app for Safe ${environment.safe.address}, ` +
      `then run 3_verify-upgrade.ts once executed.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
