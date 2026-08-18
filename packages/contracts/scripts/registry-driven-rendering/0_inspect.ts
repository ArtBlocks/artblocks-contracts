// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 0 — report the live topology and the backfill this network needs.
 *
 * Read-only. Run it before anything else to see who controls each proxy, whether
 * the backfill sender is an EOA or a Safe, and exactly which registry values will
 * change. Run it again at any point to see how far the rollout has progressed.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/0_inspect.ts
 *   yarn hardhat run --network mainnet scripts/registry-driven-rendering/0_inspect.ts
 */

import { getNetworkName } from "../util/utils";
import { deriveDependencyOverride, getEnvironment } from "./config";
import { buildBackfillPlan, describeCall } from "./plan";
import {
  describeSigner,
  readProxyOwnership,
  readRegistryAdmin,
  resolveRollout,
} from "./topology";
import { findUnregisteredProjects, groupByDeclared } from "./unregistered";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  console.log("=== generator proxies ===");
  for (const generator of rollout.generators) {
    const ownership = await readProxyOwnership(generator.address);
    console.log(`${generator.label}  ${ownership.proxy}`);
    console.log(`  impl       ${ownership.implementation}`);
    console.log(`  proxyAdmin ${ownership.proxyAdmin}`);
    console.log(
      `  owner      ${describeSigner(ownership.owner, ownership.ownerIsContract, ownership.ownerSafe)}`
    );
    console.log(`  registry   ${generator.registry}`);
  }

  console.log("\n=== registry proxies ===");
  for (const registry of rollout.registries) {
    const ownership = await readProxyOwnership(registry.address);
    const admin = await readRegistryAdmin(registry.address);
    console.log(
      `${registry.label}  ${ownership.proxy}` +
        `  [read by: ${registry.readBy.length ? registry.readBy.join(", ") : "no generator"}]`
    );
    console.log(`  impl       ${ownership.implementation}`);
    console.log(`  proxyAdmin ${ownership.proxyAdmin}`);
    console.log(
      `  owner      ${describeSigner(ownership.owner, ownership.ownerIsContract, ownership.ownerSafe)}`
    );
    console.log(`  adminACL   ${admin.adminACL}`);
    console.log(
      `  superAdmin ${describeSigner(admin.superAdmin, admin.superAdminIsContract, admin.superAdminSafe)}` +
        `${admin.superAdminIsContract ? " — backfill needs a Safe batch" : " — backfill can be sent directly"}`
    );

    const plan = await buildBackfillPlan(networkName, registry.address);
    console.log(
      `  ${plan.dependencies.length} dependencies; new fields ` +
        `${plan.registryUpgraded ? "readable (registry upgraded)" : "unreadable (registry not yet upgraded)"}`
    );
    if (plan.calls.length === 0) {
      console.log("  backfill complete — no calls outstanding");
    } else {
      console.log(`  ${plan.calls.length} backfill call(s) outstanding:`);
      for (const call of plan.calls) {
        console.log(`    ${describeCall(call)}`);
      }
    }
    console.log(
      `  ${plan.unchangedCount} dependencies keep all-default values`
    );

    // Rendering follows the registry, so a project declaring a script type with
    // no record behind it gets the defaults regardless of how its dependency is
    // configured. Worth seeing on every inspection, not only during a rollout.
    const unregistered = groupByDeclared(
      await findUnregisteredProjects(networkName, registry.address)
    );
    if (unregistered.size === 0) {
      console.log("  every project declares a registered dependency");
    } else {
      console.log(`  ${unregistered.size} unregistered script type(s) in use:`);
      // @dev Array.from rather than iterating the Map directly, which this
      // project's TypeScript target downlevels into an empty loop.
      for (const [declared, projects] of Array.from(unregistered.entries())) {
        const override = deriveDependencyOverride(
          declared,
          new Set(plan.dependencies.map((d) => d.nameAndVersion))
        );
        console.log(
          `    ${declared.padEnd(16)} ${String(projects.length).padStart(3)} project(s)  ` +
            `${override ? `override -> ${override}` : "left as-is; renders with defaults"}`
        );
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
