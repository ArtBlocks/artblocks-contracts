// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 2 — build the batch that points registry dependencies at their ABX FS files, from the
 * registry's AdminACL superAdmin. Each call switches one dependency from its CDN to an inlined,
 * on-chain copy (or, where the registry already stores scripts, records the file without
 * changing any output). The batch also pins zdog's floating preferred CDN.
 *
 * Refuses to build anything unless, on the target network:
 *   - every file is present on the ABX FS FileStore the generator reads, gzip-encoded, and
 *     decodes to the library recorded in config.ts;
 *   - the registry has been upgraded (step 1);
 *   - every call simulates successfully from the superAdmin.
 * Already-applied calls are skipped, so re-running is safe and shows progress.
 *
 *   yarn hardhat run --network mainnet scripts/abxfs-dependencies/2_set-abxfs-files.ts
 *
 * On sepolia the AB500 files are not on ABX FS, so this refuses there by design.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import { buildSafeBatch } from "../generator-upgrade/safe-tx-builder";
import { getEnvironment } from "../registry-driven-rendering/config";
import {
  describeSigner,
  readRegistryAdmin,
  resolveRollout,
} from "../registry-driven-rendering/topology";
import { AB500_ABXFS_FILES, ABXFS_CANONICAL_FILE_STORE } from "./config";
import { verifyAbxfsFile } from "./abxfs";
import { planAbxfsFileCalls } from "./plan";

const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "deployments",
  "generator",
  "safe-txs"
);

async function readFileStore(generator: string): Promise<string> {
  try {
    const value = await new ethers.Contract(
      generator,
      ["function abxfsFileStore() view returns (address)"],
      ethers.provider
    ).abxfsFileStore();
    return ethers.utils.getAddress(value);
  } catch {
    // generator not upgraded yet; it will default to the canonical FileStore
    return ABXFS_CANONICAL_FILE_STORE;
  }
}

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);
  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  for (const registryInfo of rollout.registries) {
    const { superAdmin, superAdminIsContract, superAdminSafe } =
      await readRegistryAdmin(registryInfo.address);
    console.log(`Registry ${registryInfo.address} [${registryInfo.label}]`);
    console.log(
      `  sender: ${describeSigner(superAdmin, superAdminIsContract, superAdminSafe)}`
    );

    // every generator reading this registry must be able to read every file
    const fileStores = new Set<string>();
    for (const g of rollout.generators.filter(
      (g) => g.registry === registryInfo.address
    )) {
      fileStores.add(await readFileStore(g.address));
    }
    for (const fileStore of fileStores) {
      console.log(`  verifying files on ABX FS FileStore ${fileStore}`);
      for (const entry of AB500_ABXFS_FILES.filter((e) => e.set)) {
        const v = await verifyAbxfsFile(fileStore, entry);
        console.log(
          `    ok  ${entry.dependency.padEnd(20)} ${v.chunkCount} chunks, decodes to ${v.decodedBytes} B`
        );
      }
    }

    const calls = await planAbxfsFileCalls(registryInfo.address, superAdmin);
    if (calls.length === 0) {
      console.log("  nothing to do\n");
      continue;
    }
    console.log(
      `\n  ${calls.length} call(s), each simulated from the superAdmin:`
    );
    calls.forEach((c) => console.log(`    ${c.label}`));

    if (superAdminSafe) {
      const batch = buildSafeBatch({
        chainId: environment.chainId,
        safeAddress: superAdmin,
        name: `Set ABX FS files for AB500 dependencies (${registryInfo.label})`,
        description:
          "Points registry dependencies at their gzip ABX FS files, so the generator inlines " +
          "them on chain instead of loading them from a CDN, and pins zdog's preferred CDN.",
        transactions: calls.map((c) => c.safeTransaction),
      });
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const outPath = path.join(
        OUTPUT_DIR,
        `${networkName}-abxfs-set-files-${registryInfo.label}.json`
      );
      fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");
      console.log(`\n  Wrote ${path.relative(process.cwd(), outPath)}`);
      console.log(
        `  Upload it to the Transaction Builder app for Safe ${superAdmin}.\n`
      );
    } else {
      console.log(
        `\n  ${superAdmin} is an EOA: send the calls above directly, in order.\n`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
