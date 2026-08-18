// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 4 — build the Safe batch that upgrades GenArt721GeneratorV0.
 *
 * This must land *after* the backfill. The new generator has no hardcoded
 * dependency rules left, so on a registry that has not been backfilled it would
 * emit every project without its canvas, and Processing and raw-HTML projects
 * with the wrong wrapper. The script refuses to build a batch in that state.
 *
 * `PREVIEW=true` relaxes only that ordering check, so the batch can be read
 * ahead of its turn. The calls are still simulated, and the file is named
 * `-PREVIEW`; regenerate without the flag when it is actually time to execute.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/4_upgrade-generator.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/4_upgrade-generator.ts
 */

import { getNetworkName } from "../util/utils";
import { GENERATOR_CONTRACT_NAME, getEnvironment } from "./config";
import { buildBackfillPlan, describeCall } from "./plan";
import { resolveRollout } from "./topology";
import { buildUpgradeBatch } from "./upgrade-batch";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  const preview = process.env.PREVIEW === "true";

  console.log(`Network:        ${networkName} (chain ${environment.chainId})`);

  // The ordering guard. Upgrading ahead of the backfill is the one sequence that
  // visibly breaks live artwork, so it is blocked here rather than documented.
  for (const registry of rollout.registries) {
    const plan = await buildBackfillPlan(networkName, registry.address);
    const outstanding = !plan.registryUpgraded
      ? `the registry has not been upgraded yet`
      : plan.calls.length > 0
        ? `the registry still needs ${plan.calls.length} backfill call(s):\n` +
          plan.calls.map((call) => `  ${describeCall(call)}`).join("\n")
        : null;

    if (outstanding !== null && !preview) {
      throw new Error(
        `Registry ${registry.address}: ${outstanding}\n` +
          `Run 2_upgrade-registry.ts and 3_backfill.ts first — upgrading the ` +
          `generator now would drop canvas tags and script wrappers for every ` +
          `project on this network.`
      );
    }
    if (outstanding !== null) {
      console.log(
        `\n!! PREVIEW ONLY — ${outstanding.split("\n")[0]}.\n` +
          `!! Executing this batch now would break live artwork. Regenerate ` +
          `without PREVIEW when the backfill is complete.\n`
      );
    } else {
      console.log(
        `Backfill check: ${registry.address} fully backfilled (${plan.dependencies.length} dependencies)`
      );
    }
  }

  await buildUpgradeBatch({
    networkName,
    chainId: environment.chainId,
    contractName: GENERATOR_CONTRACT_NAME,
    proxies: rollout.generators.map((g) => ({
      label: g.label,
      address: g.address,
    })),
    description:
      "Drive rendering entirely from the dependency registry: canvas placement, " +
      "project script tag type, and ES module import maps are read per dependency " +
      "instead of being hardcoded. Fixes ES module projects such as Gas Wars.",
    fileStem: "upgrade-generator",
    preview,
  });

  console.log(`\nNext: confirm the rollout with 5_verify.ts.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
