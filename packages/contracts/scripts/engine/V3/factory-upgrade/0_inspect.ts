// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 0 — read the live state this rollout has to reproduce.
 *
 * Nothing is sent, and nothing here is configured: the outgoing factory's
 * address comes from `MAIN_CONFIG`, and every other fact is read off chain.
 * The constructor arguments printed here are the exact arguments the new
 * factory must be deployed with — five of the six are copied verbatim from the
 * outgoing factory, and only the two implementations change.
 *
 *   yarn hardhat run --network mainnet  scripts/engine/V3/factory-upgrade/0_inspect.ts
 *   NODE_ENV=staging yarn hardhat run --network sepolia scripts/engine/V3/factory-upgrade/0_inspect.ts
 */

import { ethers } from "hardhat";
import path from "path";
import { getNetworkName } from "../../../util/utils";
import {
  getActiveCoreRegistry,
  getActiveEngineFactoryAddress,
} from "../../../util/constants";
import { getEnvironment, IMPLEMENTATIONS } from "./config";
import { readFactoryState, writeFactoryStateSnapshot } from "./factory-state";

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);

  const outgoingFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    environment.environment
  );
  const outgoing = await readFactoryState(outgoingFactoryAddress);

  // @dev derived from the shared minter filter rather than configured, which is
  // how every other script in this repo resolves the registry.
  const coreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    environment.environment
  );
  const coreRegistry = await ethers.getContractAt(
    "CoreRegistryV1",
    coreRegistryAddress
  );
  const coreRegistryOwner = await coreRegistry.owner();
  const numRegistered = await coreRegistry.getNumRegisteredContracts();

  console.log(
    `Network:  ${networkName} (chain ${environment.chainId}), environment ${environment.environment}\n`
  );

  console.log(`Outgoing EngineFactoryV0: ${outgoingFactoryAddress}`);
  console.log(`  owner (Safe):                    ${outgoing.owner}`);
  console.log(`  coreRegistry:                    ${outgoing.coreRegistry}`);
  console.log(
    `  defaultBaseURIHost:              ${outgoing.defaultBaseURIHost}`
  );
  console.log(
    `  universalBytecodeStorageReader:  ${outgoing.universalBytecodeStorageReader}`
  );
  console.log(
    `  engineImplementation:            ${outgoing.engineImplementation} (${outgoing.engineCoreVersion})`
  );
  console.log(
    `  engineFlexImplementation:        ${outgoing.engineFlexImplementation} (${outgoing.flexCoreVersion})`
  );
  console.log(`  isAbandoned:                     ${outgoing.isAbandoned}\n`);

  console.log(`CoreRegistryV1: ${coreRegistryAddress}`);
  console.log(`  owner:                ${coreRegistryOwner}`);
  console.log(`  registered contracts: ${numRegistered.toString()}`);
  if (
    coreRegistryOwner.toLowerCase() !== outgoingFactoryAddress.toLowerCase()
  ) {
    console.log(
      `  [WARN] registry is NOT owned by the factory in MAIN_CONFIG. The handoff ` +
        `in 2_build-handoff-txs.ts assumes the outgoing factory holds ownership.`
    );
  }
  if (
    outgoing.coreRegistry.toLowerCase() !== coreRegistryAddress.toLowerCase()
  ) {
    console.log(
      `  [WARN] the factory's immutable coreRegistry (${outgoing.coreRegistry}) is not ` +
        `the registry the shared minter filter points at (${coreRegistryAddress}).`
    );
  }
  console.log("");

  console.log(`New factory constructor arguments:`);
  console.log(
    `  engineImplementation_          ${IMPLEMENTATIONS.engine.address || "<phase 2 — not yet mined>"}   (${IMPLEMENTATIONS.engine.version}, replaces ${outgoing.engineCoreVersion})`
  );
  console.log(
    `  engineFlexImplementation_      ${IMPLEMENTATIONS.flex.address || "<phase 2 — not yet mined>"}   (${IMPLEMENTATIONS.flex.version}, replaces ${outgoing.flexCoreVersion})`
  );
  console.log(`  coreRegistry_                  ${outgoing.coreRegistry}`);
  console.log(`  owner_                         ${outgoing.owner}`);
  console.log(
    `  defaultBaseURIHost_            ${outgoing.defaultBaseURIHost}`
  );
  console.log(
    `  universalBytecodeStorageReader_ ${outgoing.universalBytecodeStorageReader}\n`
  );

  console.log(
    `Handoff to send from ${outgoing.owner} once the new factory is deployed:`
  );
  console.log(
    `  ${outgoingFactoryAddress}.transferCoreRegistryOwnership(<new factory>)`
  );
  console.log(`  ${outgoingFactoryAddress}.abandon()`);
  const snapshotPath = writeFactoryStateSnapshot(environment.label, outgoing);
  console.log(
    `\nWrote ${path.relative(process.cwd(), snapshotPath)} — 1_prepare-deployments.ts ` +
      `reads it under PREDICT_ONLY so factory initcode can be computed for every ` +
      `network without an RPC connection to each.`
  );
  console.log(
    `\nRun 1_prepare-deployments.ts to compute initcode for each phase.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
