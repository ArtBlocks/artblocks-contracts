// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 1: build ONE Safe batch that upgrades every DependencyRegistryV0 and GenArt721GeneratorV0
 * proxy on the network together (see upgrade-batch.ts for why it must be atomic).
 *
 * Refuses unless both implementations are deployed at their CREATE2 addresses
 * (`yarn create2-deploy`, all-zero salt) with exactly the local build's code, the ABX FS
 * FileDataReader the generator reads through is deployed, and every upgrade simulates from the
 * ProxyAdmin's owner.
 *
 * Between this batch and step 2, no dependency has an ABX FS file yet, so every dependency renders
 * from its preferred CDN. The script lists the dependencies whose rendering changes in that window
 * (those that were inlined until now) and refuses if one has no preferred CDN.
 *
 *   yarn hardhat run --network sepolia scripts/abxfs-dependencies/1_upgrade.ts
 *   yarn hardhat run --network mainnet scripts/abxfs-dependencies/1_upgrade.ts
 */

import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import { buildSafeBatch } from "../generator-upgrade/safe-tx-builder";
import { getEnvironment } from "../registry-driven-rendering/config";
import {
  describeSigner,
  resolveRollout,
} from "../registry-driven-rendering/topology";
import { planUpgradeBatch, readCdnWindow } from "./upgrade-batch";

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

  const plan = await planUpgradeBatch(environment);
  if (plan.upgrades.length === 0) {
    console.log(
      `Every proxy already runs the new implementations (${plan.done.join(", ")}). Nothing to do.`
    );
    return;
  }

  const window = await readCdnWindow(rollout.registries.map((r) => r.address));
  const missingCdn = window.filter((w) => w.preferredCDN === "");
  if (missingCdn.length > 0) {
    throw new Error(
      `Inlined today with no preferred CDN, so they would render nothing between steps 1 and 2: ` +
        missingCdn.map((w) => w.dependency).join(", ")
    );
  }

  const batch = buildSafeBatch({
    chainId: environment.chainId,
    safeAddress: plan.owner.owner,
    name: "ABX FS dependencies: upgrade DependencyRegistryV0 and GenArt721GeneratorV0",
    description:
      "Upgrades the dependency registry and generator proxies together. The registry becomes " +
      "ABX FS-only and the generator reads dependency files through the ABX FS FileDataReader. " +
      "Neither upgrade works alone, so they are one batch. Dependencies render from their " +
      "preferred CDN until step 2 sets their ABX FS files.",
    transactions: plan.upgrades.map((u) => u.safeTransaction),
  });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `${networkName}-abxfs-upgrade-registry-and-generator.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");

  console.log(`ProxyAdmin: ${plan.proxyAdmin}`);
  console.log(
    `Signer:     ${describeSigner(plan.owner.owner, plan.owner.ownerIsContract, plan.owner.ownerSafe)}\n`
  );
  console.log(
    `${plan.upgrades.length} upgrade(s) in one batch, each simulated from the Safe:`
  );
  for (const u of plan.upgrades) {
    console.log(`  upgrade(${u.proxy}, ${u.implementation})   [${u.label}]`);
  }
  console.log(
    `\nBetween this batch and step 2 these render from their preferred CDN instead of inline:`
  );
  for (const w of window) {
    console.log(`  ${w.dependency.padEnd(24)} ${w.preferredCDN}`);
  }
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(
    `Upload it to the Transaction Builder app for Safe ${plan.owner.owner}, then run step 2.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
