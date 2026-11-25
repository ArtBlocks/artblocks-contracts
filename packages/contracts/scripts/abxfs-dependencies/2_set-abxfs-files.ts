// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 2 — from the registry's AdminACL superAdmin, give each AB500 dependency its ABX FS file
 * (putting it on chain), pin zdog's floating preferred CDN, and apply any generator configuration
 * fix listed for the network (sepolia: the staging generator's ScriptyBuilder).
 *
 * Refuses to build anything unless, on the target network:
 *   - every file is present on ABX FS, gzip-encoded, and decodes to the library recorded in
 *     config.ts (the registry refuses absent or non-gzip files itself; the content check is
 *     this script's);
 *   - step 1 has executed;
 *   - every call simulates successfully from the superAdmin.
 * Already-applied calls are skipped, so re-running is safe and shows progress.
 *
 * A Safe superAdmin (mainnet) gets a Transaction Builder batch. An EOA superAdmin (sepolia) gets
 * the calls as JSON, and with SERVE=true a local page that sends them from a browser wallet, so
 * no key is ever handed to this repo.
 *
 *   yarn hardhat run --network mainnet scripts/abxfs-dependencies/2_set-abxfs-files.ts
 *   SERVE=true yarn hardhat run --network sepolia scripts/abxfs-dependencies/2_set-abxfs-files.ts
 */

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
import { serveCalls } from "./serve";

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
  const rollout = await resolveRollout(environment);
  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  console.log(
    `Verifying files on ABX FS (FileStore ${ABXFS_CANONICAL_FILE_STORE})`
  );
  for (const entry of AB500_ABXFS_FILES.filter((e) => e.set)) {
    const v = await verifyAbxfsFile(ABXFS_CANONICAL_FILE_STORE, entry);
    console.log(
      `  ok  ${entry.dependency.padEnd(20)} ${v.chunkCount} chunks, ${v.gzipBytes} B gzip, decodes to ${v.decodedBytes} B`
    );
  }
  console.log("");

  for (const registryInfo of rollout.registries) {
    const { superAdmin, superAdminIsContract, superAdminSafe } =
      await readRegistryAdmin(registryInfo.address);
    console.log(`Registry ${registryInfo.address} [${registryInfo.label}]`);
    console.log(
      `  sender: ${describeSigner(superAdmin, superAdminIsContract, superAdminSafe)}`
    );

    const calls = await planAbxfsFileCalls(
      networkName,
      registryInfo.address,
      superAdmin
    );
    if (calls.length === 0) {
      console.log("  nothing to do\n");
      continue;
    }
    console.log(
      `\n  ${calls.length} call(s), each simulated from the superAdmin:`
    );
    calls.forEach((c) => console.log(`    ${c.label}`));

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const stem = `${networkName}-abxfs-set-files-${registryInfo.label}`;
    if (superAdminSafe) {
      const batch = buildSafeBatch({
        chainId: environment.chainId,
        safeAddress: superAdmin,
        name: `ABX FS dependencies: set ABX FS files (${registryInfo.label})`,
        description:
          "Gives each AB500 dependency its gzip ABX FS file, so the generator inlines it on " +
          "chain, and pins zdog's preferred CDN.",
        transactions: calls.map((c) => c.safeTransaction),
      });
      const outPath = path.join(OUTPUT_DIR, `${stem}.json`);
      fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");
      console.log(`\n  Wrote ${path.relative(process.cwd(), outPath)}`);
      console.log(
        `  Upload it to the Transaction Builder app for Safe ${superAdmin}.\n`
      );
      continue;
    }

    const outPath = path.join(OUTPUT_DIR, `${stem}-calls.json`);
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          chainId: environment.chainId,
          from: superAdmin,
          calls: calls.map((c) => ({ label: c.label, to: c.to, data: c.data })),
        },
        null,
        2
      ) + "\n"
    );
    console.log(`\n  Wrote ${path.relative(process.cwd(), outPath)}`);
    console.log(
      `  ${superAdmin} is an externally owned account: send the calls in order.`
    );
    if (process.env.SERVE === "true") {
      await serveCalls({
        network: networkName,
        chainId: environment.chainId,
        explorer: environment.explorer,
        registry: registryInfo.address,
        superAdmin,
        calls,
        remaining: async () =>
          (
            await planAbxfsFileCalls(
              networkName,
              registryInfo.address,
              superAdmin,
              () => {}
            )
          ).length,
      });
    } else {
      console.log(
        "  Re-run with SERVE=true to send them from a browser wallet.\n"
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
