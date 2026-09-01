// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 2 — build the Safe batch that hands the Core Registry to the new factory.
 *
 * This is the only permissioned step of the rollout. Deploying the libraries,
 * the implementations, and the factory itself are all permissionless CREATE2
 * calls that anyone can send; none of them changes any live behavior. What makes
 * the new factory usable is ownership of `CoreRegistryV1`, because
 * `createEngineContract` finishes by calling `registerContract` on it, and the
 * registry is `Ownable` with a single owner. So exactly one contract can create
 * Engine contracts at a time, and the switch is a single transaction:
 *
 *   1. `outgoingFactory.transferCoreRegistryOwnership(newFactory)`
 *   2. `outgoingFactory.abandon()`                     (set SKIP_ABANDON=true to omit)
 *
 * Both are sent by the factory's owner, a Gnosis Safe. Step 2 is defense in
 * depth rather than a requirement — after step 1 the outgoing factory can no
 * longer register anything, so `createEngineContract` on it would revert
 * anyway — but it is one-way, so it is called out explicitly in the batch
 * description and can be omitted.
 *
 * The batch is only written once the deployed factory has been checked field by
 * field against the one it replaces, and both calls have been simulated from
 * the Safe.
 *
 *   yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts
 *   NODE_ENV=staging yarn hardhat run --network sepolia scripts/engine/V3/factory-upgrade/2_build-handoff-txs.ts
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../../../util/utils";
import {
  getActiveCoreRegistry,
  getActiveEngineFactoryAddress,
} from "../../../util/constants";
import {
  IMPLEMENTATIONS,
  getEnvironment,
  requireImplementations,
  requireNewFactory,
} from "./config";
import { readFactoryState } from "./factory-state";
import {
  buildSafeBatch,
  SafeContractMethod,
  SafeTransaction,
} from "../../../generator-upgrade/safe-tx-builder";
import { ethCallOrThrow } from "../../../generator-upgrade/eth-call";

const OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "deployments",
  "engine",
  "V3",
  "factory-and-implementations",
  "safe-txs"
);

const TRANSFER_CORE_REGISTRY_OWNERSHIP_METHOD: SafeContractMethod = {
  inputs: [{ name: "_owner", type: "address", internalType: "address" }],
  name: "transferCoreRegistryOwnership",
  payable: false,
};

const ABANDON_METHOD: SafeContractMethod = {
  inputs: [],
  name: "abandon",
  payable: false,
};

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const implementations = requireImplementations();
  const newFactoryAddress = ethers.utils.getAddress(
    requireNewFactory(environment.label)
  );

  const outgoingFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    environment.environment
  );
  if (
    outgoingFactoryAddress.toLowerCase() === newFactoryAddress.toLowerCase()
  ) {
    throw new Error(
      `MAIN_CONFIG already points at ${newFactoryAddress} for ${networkName}/` +
        `${environment.environment}. The handoff has already been done, or ` +
        `constants.ts was updated too early.`
    );
  }
  const outgoing = await readFactoryState(outgoingFactoryAddress);
  const incoming = await readFactoryState(newFactoryAddress);

  // The replacement must differ from the factory it replaces in the two
  // implementations and nothing else. Anything else silently changing is the
  // failure mode that a hand-written constructor argument list produces.
  const mismatches: string[] = [];
  const compare = (field: string, before: string, after: string) => {
    if (before.toLowerCase() !== after.toLowerCase()) {
      mismatches.push(`  ${field}: outgoing ${before} -> incoming ${after}`);
    }
  };
  compare("owner", outgoing.owner, incoming.owner);
  compare("coreRegistry", outgoing.coreRegistry, incoming.coreRegistry);
  compare(
    "defaultBaseURIHost",
    outgoing.defaultBaseURIHost,
    incoming.defaultBaseURIHost
  );
  compare(
    "universalBytecodeStorageReader",
    outgoing.universalBytecodeStorageReader,
    incoming.universalBytecodeStorageReader
  );
  if (mismatches.length > 0) {
    throw new Error(
      `New factory ${newFactoryAddress} does not carry over the outgoing ` +
        `factory's configuration:\n${mismatches.join("\n")}`
    );
  }

  const implementationErrors: string[] = [];
  if (
    incoming.engineImplementation.toLowerCase() !==
    implementations.engine.toLowerCase()
  ) {
    implementationErrors.push(
      `  engineImplementation: ${incoming.engineImplementation}, expected ${implementations.engine}`
    );
  }
  if (
    incoming.engineFlexImplementation.toLowerCase() !==
    implementations.flex.toLowerCase()
  ) {
    implementationErrors.push(
      `  engineFlexImplementation: ${incoming.engineFlexImplementation}, expected ${implementations.flex}`
    );
  }
  if (incoming.engineCoreVersion !== IMPLEMENTATIONS.engine.version) {
    implementationErrors.push(
      `  engineCoreVersion: ${incoming.engineCoreVersion}, expected ${IMPLEMENTATIONS.engine.version}`
    );
  }
  if (incoming.flexCoreVersion !== IMPLEMENTATIONS.flex.version) {
    implementationErrors.push(
      `  flexCoreVersion: ${incoming.flexCoreVersion}, expected ${IMPLEMENTATIONS.flex.version}`
    );
  }
  if (incoming.isAbandoned) {
    implementationErrors.push(`  isAbandoned: true — factory is unusable`);
  }
  if (implementationErrors.length > 0) {
    throw new Error(
      `New factory ${newFactoryAddress} is misconfigured:\n${implementationErrors.join("\n")}`
    );
  }

  // The registry the minter filter actually points at, which is what
  // `createEngineContract` writes to.
  const coreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    environment.environment
  );
  if (
    coreRegistryAddress.toLowerCase() !== outgoing.coreRegistry.toLowerCase()
  ) {
    throw new Error(
      `The shared minter filter reads registry ${coreRegistryAddress}, but the ` +
        `factories are built against ${outgoing.coreRegistry}. Transferring ` +
        `ownership of the wrong registry would leave new cores unregistered.`
    );
  }
  const coreRegistry = await ethers.getContractAt(
    "CoreRegistryV1",
    coreRegistryAddress
  );
  const currentRegistryOwner = await coreRegistry.owner();
  if (
    currentRegistryOwner.toLowerCase() !== outgoingFactoryAddress.toLowerCase()
  ) {
    throw new Error(
      `Core Registry ${coreRegistryAddress} is owned by ${currentRegistryOwner}, ` +
        `not by the outgoing factory ${outgoingFactoryAddress}. This batch is ` +
        `sent through the outgoing factory, so it would revert.`
    );
  }

  // Pre-flight both calls as the Safe, so a batch is never handed to signers
  // unless it is known to execute.
  const factoryInterface = new ethers.utils.Interface([
    "function transferCoreRegistryOwnership(address _owner) external",
    "function abandon() external",
  ]);
  await ethCallOrThrow({
    from: outgoing.owner,
    to: outgoingFactoryAddress,
    data: factoryInterface.encodeFunctionData("transferCoreRegistryOwnership", [
      newFactoryAddress,
    ]),
  });
  const skipAbandon = process.env.SKIP_ABANDON === "true";
  if (!skipAbandon) {
    await ethCallOrThrow({
      from: outgoing.owner,
      to: outgoingFactoryAddress,
      data: factoryInterface.encodeFunctionData("abandon", []),
    });
  }

  const transactions: SafeTransaction[] = [
    {
      to: outgoingFactoryAddress,
      value: "0",
      data: null,
      contractMethod: TRANSFER_CORE_REGISTRY_OWNERSHIP_METHOD,
      contractInputsValues: { _owner: newFactoryAddress },
    },
  ];
  if (!skipAbandon) {
    transactions.push({
      to: outgoingFactoryAddress,
      value: "0",
      data: null,
      contractMethod: ABANDON_METHOD,
      contractInputsValues: {},
    });
  }

  const batch = buildSafeBatch({
    chainId: environment.chainId,
    safeAddress: outgoing.owner,
    name: `Engine Factory handoff to v3.3 (${environment.label})`,
    description:
      `Transfer CoreRegistryV1 ${coreRegistryAddress} from EngineFactoryV0 ` +
      `${outgoingFactoryAddress} (${outgoing.engineCoreVersion}/${outgoing.flexCoreVersion}) ` +
      `to ${newFactoryAddress} (${incoming.engineCoreVersion}/${incoming.flexCoreVersion}), ` +
      `so new Engine and Engine Flex contracts are created with transfer hook support.` +
      (skipAbandon
        ? ` The outgoing factory is NOT abandoned by this batch.`
        : ` Then permanently abandon the outgoing factory. Abandoning is one-way.`),
    transactions,
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(
    OUTPUT_DIR,
    `${environment.label}-engine-factory-handoff-${newFactoryAddress.slice(0, 10)}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2) + "\n");

  console.log(
    `Network:          ${networkName} (chain ${environment.chainId}), environment ${environment.environment}`
  );
  console.log(`Safe:             ${outgoing.owner}`);
  console.log(
    `Outgoing factory: ${outgoingFactoryAddress}  (${outgoing.engineCoreVersion} / ${outgoing.flexCoreVersion})`
  );
  console.log(
    `New factory:      ${newFactoryAddress}  (${incoming.engineCoreVersion} / ${incoming.flexCoreVersion})`
  );
  console.log(`Core Registry:    ${coreRegistryAddress}\n`);
  console.log(
    `${transactions.length} transaction(s), each simulated from the Safe:`
  );
  console.log(`  transferCoreRegistryOwnership(${newFactoryAddress})`);
  if (!skipAbandon) {
    console.log(`  abandon()   [one-way]`);
  } else {
    console.log(`  abandon() omitted — SKIP_ABANDON=true`);
  }
  console.log(`\nWrote ${path.relative(process.cwd(), outPath)}`);
  console.log(
    `Upload it to the Transaction Builder app for Safe ${outgoing.owner} ` +
      `(${environment.transactionServiceUrl}), then run 3_verify.ts once executed.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
