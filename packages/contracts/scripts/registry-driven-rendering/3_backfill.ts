// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 3 — write the rendering directives the upgraded generator will read.
 *
 * The values are derived, not listed: every dependency is checked against the
 * rules the pre-upgrade generator had hardcoded, so the backfill reproduces the
 * behavior already live on that network. The only value that is new rather than
 * reproduced is ES module loading. See `config.ts`.
 *
 * The sender is the registry's AdminACL superAdmin, which is not the same account
 * that owns the ProxyAdmin — so this step cannot be folded into the upgrade
 * batches. Whether it is a Safe or an EOA differs by network, and this script
 * follows whichever is live. Neither path involves a private key:
 *
 *   - Safe (mainnet): writes a Transaction Builder batch, sends nothing.
 *   - EOA (sepolia):  serves the calls at http://localhost:3001 for a browser
 *                     wallet to sign.
 *
 * `PREVIEW=true` builds the batch before the registry upgrade has landed, so it
 * can be reviewed early. The setters do not exist yet at that point, so nothing
 * can be simulated and the file is named `-PREVIEW`; regenerate without the flag
 * once step 2 has executed.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/3_backfill.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/3_backfill.ts
 */

import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import { buildSafeBatch } from "../generator-upgrade/safe-tx-builder";
import { getEnvironment } from "./config";
import { buildBackfillSafeTx, encodeBackfillCall } from "./calls";
import { buildBackfillPlan, describeCall } from "./plan";
import { serveBackfill } from "./backfill-server";
import { describeSigner, readRegistryAdmin, resolveRollout } from "./topology";

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
  const preview = process.env.PREVIEW === "true";

  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  for (const registry of rollout.registries) {
    console.log(`=== ${registry.label} registry ${registry.address} ===`);

    const plan = await buildBackfillPlan(networkName, registry.address);
    if (!plan.registryUpgraded && !preview) {
      throw new Error(
        `Registry ${registry.address} is still running the old implementation, which ` +
          `has no rendering-directive setters. Execute 2_upgrade-registry.ts first.`
      );
    }
    if (plan.calls.length === 0) {
      console.log("Already fully backfilled — nothing to do.\n");
      continue;
    }

    const admin = await readRegistryAdmin(registry.address);
    console.log(
      `Sender: ${describeSigner(admin.superAdmin, admin.superAdminIsContract, admin.superAdminSafe)}`
    );
    console.log(`${plan.calls.length} call(s):`);

    // Simulated individually from the superAdmin. Each call touches a different
    // dependency or field, so none depends on another having landed first.
    //
    // The setters do not exist until the registry is upgraded, so a preview built
    // beforehand cannot be simulated. That is the whole reason the file is marked.
    for (const call of plan.calls) {
      if (plan.registryUpgraded) {
        await ethCallOrThrow({
          from: admin.superAdmin,
          to: registry.address,
          data: encodeBackfillCall(call),
        });
      }
      console.log(`  ${describeCall(call)}`);
    }
    if (plan.registryUpgraded) {
      console.log("All calls simulated successfully from the superAdmin.");
    } else {
      console.log(
        `\n!! PREVIEW ONLY — the registry still runs the old implementation, so ` +
          `these\n!! calls could not be simulated and would revert today. ` +
          `Regenerate after\n!! 2_upgrade-registry.ts has executed.\n`
      );
    }

    if (admin.superAdminIsContract) {
      const batch = buildSafeBatch({
        chainId: environment.chainId,
        safeAddress: admin.superAdmin,
        name: `Backfill rendering directives (${registry.label})`,
        description:
          "Record, per dependency, what the on-chain generator currently hardcodes: " +
          "canvas placement and project script tag type, plus ES module loading for " +
          "three@0.167.0. Also points projects declaring an unregistered spelling of " +
          "a no-version script type at the registered dependency they mean, so they " +
          "keep the canvas the generator gives them today. Must execute before the " +
          "generator is upgraded.",
        transactions: plan.calls.map((call) =>
          buildBackfillSafeTx(registry.address, call)
        ),
      });

      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const outPath = path.join(
        OUTPUT_DIR,
        `${networkName}-backfill-${registry.label}` +
          `${plan.registryUpgraded ? "" : "-PREVIEW"}.json`
      );
      fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");
      console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
      console.log(
        `Upload it to the Transaction Builder app for Safe ${admin.superAdmin}.\n`
      );
      continue;
    }

    if (preview) {
      console.log(
        `Sender is an EOA, so there is no batch to review — the calls above are ` +
          `what\nthe signing page will offer. Re-run without PREVIEW to serve it.\n`
      );
      continue;
    }

    // Signing happens in a browser wallet, so no key is handed to this repo.
    // Blocks until interrupted; the server logs each transaction and reports
    // when the registry has nothing outstanding.
    await serveBackfill({
      network: networkName,
      chainId: environment.chainId,
      explorer: environment.explorer,
      registry: registry.address,
      superAdmin: admin.superAdmin,
      calls: plan.calls,
    });
    return;
  }

  console.log(`Next: upgrade the generator with 4_upgrade-generator.ts.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
