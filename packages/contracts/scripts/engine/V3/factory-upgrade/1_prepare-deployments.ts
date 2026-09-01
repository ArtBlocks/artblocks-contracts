// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 1 — produce the initcode for each phase of the rollout.
 *
 * The three phases are ordered by what each one has to know:
 *
 *   1. libraries      `V3EngineLib`, `V3TransferHookLib` — link nothing, so
 *                     their initcode is fixed by the source alone. The
 *                     reference transfer hooks ride along here: they are an
 *                     input to nothing, and deploy the same way.
 *   2. implementations link the phase 1 libraries, so their initcode — and
 *                     therefore the salt mined for it — depends on where those
 *                     libraries landed.
 *   3. factories      take both implementations as constructor arguments, so
 *                     their initcode depends on phase 2. One per network,
 *                     because the remaining arguments differ per network.
 *
 * Record each phase's addresses in `config.ts` before running the next. The
 * script selects the furthest phase whose inputs are populated, or takes an
 * explicit `PHASE=1|2|3`.
 *
 * Nothing is sent. The output is a `scripts/create2-deploy/config.ts` block plus
 * the initcode hash to hand to a salt miner.
 *
 *   yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/1_prepare-deployments.ts
 *   PHASE=1 yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/1_prepare-deployments.ts
 */

import hre, { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../../../util/utils";
import { ethCallOrThrow } from "../../../generator-upgrade/eth-call";
import { runtimeMatches } from "./bytecode";
import { getActiveEngineFactoryAddress } from "../../../util/constants";
import {
  CREATE2_FACTORY,
  FACTORY_ENVIRONMENTS,
  FACTORY_SALTS,
  NEW_FACTORIES,
  IMPLEMENTATIONS,
  MINED_SALTS,
  NEW_LIBRARIES,
  REFERENCE_HOOKS,
  REUSED_LIBRARIES,
  getEnvironment,
  implementationLibraries,
  requireImplementations,
  requireNewLibraries,
} from "./config";
import {
  newFactoryConstructorArgs,
  readFactoryState,
  readFactoryStateSnapshot,
  SNAPSHOT_DIR,
} from "./factory-state";

type Phase = 1 | 2 | 3;

/**
 * Catch a working tree that has drifted from the version this rollout is named
 * for, before a salt is mined against the wrong bytecode.
 *
 * @dev Read from source rather than from the compiled bytecode. `CORE_VERSION`
 * is a `bytes32` constant, but at `runs: 10` solc's constant optimizer is free
 * to synthesize the value arithmetically instead of emitting a literal — it
 * does exactly that for `GenArt721CoreV3_Engine`, whose initcode contains no
 * byte-aligned `"v3.3."` anywhere, while `GenArt721CoreV3_Engine_Flex` keeps
 * its literal. Searching the bytecode therefore produces false failures. The
 * deployed value is checked for real against `coreVersion()` in phase 3 and in
 * `3_verify.ts`.
 */
async function assertVersionInSource(contractName: string, version: string) {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const source = fs.readFileSync(
    path.resolve(__dirname, "..", "..", "..", "..", artifact.sourceName),
    "utf8"
  );
  const match = source.match(/CORE_VERSION\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error(
      `Could not find a CORE_VERSION constant in ${artifact.sourceName}.`
    );
  }
  if (match[1] !== version) {
    throw new Error(
      `${artifact.sourceName} declares coreVersion "${match[1]}", but config.ts ` +
        `names "${version}". Reconcile before mining a salt.`
    );
  }
}

/**
 * Salts are mined against an initcode hash, which for an implementation depends
 * on the library addresses linked into it. Those addresses are known as soon as
 * the library salts are mined — deployment is not required — so mining can run
 * ahead of any deploy. `PREDICT_ONLY=true` allows that, and is the only reason
 * this check is ever skipped.
 */
const PREDICT_ONLY = process.env.PREDICT_ONLY === "true";

async function assertHasCode(label: string, address: string, because: string) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    if (PREDICT_ONLY) {
      console.log(
        `  [PREDICT_ONLY] ${label} has no code at ${address} on this network yet.`
      );
      return;
    }
    throw new Error(
      `${label} is configured as ${address}, but that address has no code on ` +
        `this network. ${because} Set PREDICT_ONLY=true only to compute initcode ` +
        `ahead of deployment.`
    );
  }
}

const LIBRARY_REASON =
  "An implementation linked against it would revert on every call into the library.";
/**
 * @dev not merely unwise: `EngineFactoryV0`'s constructor calls `coreType()`
 * and `coreVersion()` on both implementations, so deploying the factory first
 * reverts outright.
 */
const IMPLEMENTATION_REASON =
  "The factory's constructor calls coreType() and coreVersion() on both implementations, so deploying it first reverts.";

async function initcodeFor(params: {
  contractName: string;
  args: unknown[];
  libraries: Record<string, string>;
}): Promise<{ initcode: string; initcodeHash: string }> {
  const factory = await hre.ethers.getContractFactory(params.contractName, {
    libraries: params.libraries,
  });
  const initcode = factory
    .getDeployTransaction(...(params.args as never[]))
    .data?.toString() as string;
  return { initcode, initcodeHash: ethers.utils.keccak256(initcode) };
}

/**
 * Close the loop between initcode, salt, and the address recorded in config.ts.
 *
 * The recorded address is what everything downstream is built on — the
 * implementations link the library addresses, the factories take the
 * implementation addresses — so if a recompile moved the initcode, every
 * downstream salt is already invalid. Deriving the address here rather than
 * trusting the record turns that into a failure at the top of the pipeline
 * instead of a contract deployed to an address nothing expects.
 */
async function reportSalt(params: {
  contractName: string;
  initcode: string;
  initcodeHash: string;
  recordedAddress: string | undefined;
}) {
  const salt = MINED_SALTS[params.contractName];
  if (!salt) {
    console.log(`    salt:          <not yet mined>`);
    return;
  }
  const predicted = ethers.utils.getCreate2Address(
    CREATE2_FACTORY,
    salt,
    params.initcodeHash
  );
  console.log(`    salt:          ${salt}`);
  console.log(`    deploys to:    ${predicted}`);
  if (
    params.recordedAddress &&
    predicted.toLowerCase() !== params.recordedAddress.toLowerCase()
  ) {
    throw new Error(
      `${params.contractName}: salt ${salt} against this build deploys to ` +
        `${predicted}, but config.ts records ${params.recordedAddress}. The build ` +
        `has changed since the salt was mined — re-mine, and re-mine everything ` +
        `downstream of it.`
    );
  }
  if (PREDICT_ONLY) {
    return;
  }
  // Against a live network, report whether the address is still empty. Re-running
  // this during a multi-network deploy session turns it into a status board, and
  // a mismatch means something else is already at the address the salt targets.
  const deployed = await ethers.provider.getCode(predicted);
  if (deployed === "0x") {
    console.log(`    on chain:      not deployed`);
    return;
  }
  const expected = await ethCallOrThrow({ data: params.initcode });
  const artifact = await hre.artifacts.readArtifact(params.contractName);
  console.log(
    runtimeMatches({
      expected,
      deployed,
      artifactDeployedBytecode: artifact.deployedBytecode,
    })
      ? `    on chain:      already deployed, matches this build`
      : `    on chain:      OCCUPIED by code that does NOT match this build`
  );
}

/**
 * The factory equivalent of `reportSalt`, keyed by environment rather than by
 * contract name — all six factories are `EngineFactoryV0` and differ only in
 * their constructor arguments.
 */
async function reportFactorySalt(params: {
  label: string;
  initcode: string;
  initcodeHash: string;
}) {
  const salt = FACTORY_SALTS[params.label];
  if (!salt) {
    console.log(`    salt:          <not yet mined>`);
    return;
  }
  const predicted = ethers.utils.getCreate2Address(
    CREATE2_FACTORY,
    salt,
    params.initcodeHash
  );
  console.log(`    salt:          ${salt}`);
  console.log(`    deploys to:    ${predicted}`);
  const recorded = NEW_FACTORIES[params.label];
  if (recorded && predicted.toLowerCase() !== recorded.toLowerCase()) {
    throw new Error(
      `EngineFactoryV0 (${params.label}): salt ${salt} against this build deploys ` +
        `to ${predicted}, but config.ts records ${recorded}. Either the build ` +
        `changed, or the outgoing factory's owner / defaultBaseURIHost changed ` +
        `since 0_inspect.ts captured it. Re-capture and re-mine.`
    );
  }
  if (PREDICT_ONLY) {
    return;
  }
  const deployed = await ethers.provider.getCode(predicted);
  if (deployed === "0x") {
    console.log(`    on chain:      not deployed`);
    return;
  }
  const expected = await ethCallOrThrow({ data: params.initcode });
  const artifact = await hre.artifacts.readArtifact("EngineFactoryV0");
  console.log(
    runtimeMatches({
      expected,
      deployed,
      artifactDeployedBytecode: artifact.deployedBytecode,
    })
      ? `    on chain:      already deployed, matches this build`
      : `    on chain:      OCCUPIED by code that does NOT match this build`
  );
}

function printCreate2Config(
  entries: {
    contractName: string;
    args: unknown[];
    libraries: Record<string, string>;
    chainIds: number[];
  }[]
) {
  console.log(
    `Paste into scripts/create2-deploy/config.ts, then \`yarn create2-deploy\`:\n`
  );
  console.log(`export const deployConfigs: DeployConfig[] = [`);
  for (const entry of entries) {
    console.log(`  {`);
    console.log(`    contractName: ${JSON.stringify(entry.contractName)},`);
    console.log(`    args: ${JSON.stringify(entry.args)},`);
    console.log(`    libraries: ${JSON.stringify(entry.libraries)},`);
    console.log(`    chainIds: [${entry.chainIds.join(", ")}],`);
    console.log(`  },`);
  }
  console.log(`];\n`);
}

function selectPhase(): Phase {
  const explicit = process.env.PHASE;
  if (explicit) {
    const parsed = Number(explicit);
    if (parsed !== 1 && parsed !== 2 && parsed !== 3) {
      throw new Error(`PHASE must be 1, 2, or 3; got ${explicit}`);
    }
    return parsed as Phase;
  }
  const librariesReady = Object.values(NEW_LIBRARIES).every(Boolean);
  const implementationsReady = Object.values(IMPLEMENTATIONS).every(
    (spec) => spec.address
  );
  if (!librariesReady) return 1;
  if (!implementationsReady) return 2;
  return 3;
}

async function phase1() {
  console.log(`Phase 1 — v3.3 libraries and reference transfer hooks\n`);
  console.log(
    `None of these link anything or take constructor arguments, so their ` +
      `initcode is identical on every network. Deploy each to one address ` +
      `across all six.\n`
  );

  // @dev the reference hooks have no dependency on the rest of the rollout and
  // ride along here only because they are deployed the same way.
  const recorded: Record<string, string> = {
    ...NEW_LIBRARIES,
    ...REFERENCE_HOOKS,
  };
  const names = Object.keys(recorded);
  for (const name of names) {
    const { initcode, initcodeHash } = await initcodeFor({
      contractName: name,
      args: [],
      libraries: {},
    });
    console.log(`  ${name}`);
    console.log(`    initcode hash: ${initcodeHash}`);
    await reportSalt({
      contractName: name,
      initcode,
      initcodeHash,
      recordedAddress: recorded[name],
    });
  }
  console.log("");

  printCreate2Config(
    names.map((contractName) => ({
      contractName,
      args: [],
      libraries: {},
      chainIds: FACTORY_ENVIRONMENTS.map((e) => e.chainId).filter(
        (id, i, arr) => arr.indexOf(id) === i
      ),
    }))
  );

  console.log(
    names.every((n) => MINED_SALTS[n])
      ? `Salts recorded and confirmed against this build. Deploy with ` +
          `\`yarn create2-deploy\`, then re-run phase 2.`
      : `Mine a salt for each initcode hash and record it in MINED_SALTS, along ` +
          `with the address it deploys to in NEW_LIBRARIES / REFERENCE_HOOKS, ` +
          `then re-run for phase 2. The reference hooks are not inputs to any ` +
          `later phase.`
  );
}

async function phase2(networkName: string) {
  const newLibraries = requireNewLibraries();
  console.log(`Phase 2 — v3.3 implementations\n`);

  for (const [key, address] of Object.entries(REUSED_LIBRARIES)) {
    await assertHasCode(`Reused library ${key}`, address, LIBRARY_REASON);
  }
  for (const [name, address] of Object.entries(newLibraries)) {
    await assertHasCode(`v3.3 library ${name}`, address, LIBRARY_REASON);
  }
  console.log(
    PREDICT_ONLY
      ? `\n[PREDICT_ONLY] library code presence not enforced. Re-run without it ` +
          `against each network before deploying.\n`
      : `All linked libraries have code on ${networkName}. Note the implementation ` +
          `address depends on these, so every network must have them at the same ` +
          `addresses for the implementations to land at one address everywhere.\n`
  );

  const entries: {
    contractName: string;
    args: unknown[];
    libraries: Record<string, string>;
    chainIds: number[];
  }[] = [];

  for (const spec of [IMPLEMENTATIONS.engine, IMPLEMENTATIONS.flex]) {
    const libraries = implementationLibraries(spec.contractName);
    const { initcode, initcodeHash } = await initcodeFor({
      contractName: spec.contractName,
      args: [],
      libraries,
    });
    await assertVersionInSource(spec.contractName, spec.version);
    console.log(`  ${spec.contractName} (${spec.version})`);
    console.log(`    initcode hash: ${initcodeHash}`);
    await reportSalt({
      contractName: spec.contractName,
      initcode,
      initcodeHash,
      recordedAddress: spec.address,
    });
    console.log(`    libraries:`);
    for (const [key, address] of Object.entries(libraries)) {
      console.log(`      ${key} -> ${address}`);
    }
    entries.push({
      contractName: spec.contractName,
      args: [],
      libraries,
      chainIds: FACTORY_ENVIRONMENTS.map((e) => e.chainId).filter(
        (id, i, arr) => arr.indexOf(id) === i
      ),
    });
  }
  console.log("");
  printCreate2Config(entries);
  console.log(
    [IMPLEMENTATIONS.engine, IMPLEMENTATIONS.flex].every(
      (spec) => MINED_SALTS[spec.contractName]
    )
      ? `Salts recorded and confirmed against this build. Deploy with ` +
          `\`yarn create2-deploy\`, then re-run phase 3.`
      : `Mine a salt for each initcode hash and record it in MINED_SALTS, along ` +
          `with the address it deploys to in IMPLEMENTATIONS, then re-run for ` +
          `phase 3.`
  );
}

/**
 * Under PREDICT_ONLY, compute factory initcode for every environment that has a
 * snapshot from `0_inspect.ts`, so all six salts can be mined in one pass and
 * ahead of any deploy. The constructor arguments still come from chain — just
 * from a captured read rather than a live one.
 */
async function phase3PredictAll() {
  const implementations = requireImplementations();
  console.log(
    `Phase 3 — EngineFactoryV0 initcode, from captured factory state\n`
  );

  const missing: string[] = [];
  for (const environment of FACTORY_ENVIRONMENTS) {
    const outgoing = readFactoryStateSnapshot(environment.label);
    if (!outgoing) {
      missing.push(environment.label);
      continue;
    }
    const args = newFactoryConstructorArgs({
      source: outgoing,
      engineImplementation: implementations.engine,
      engineFlexImplementation: implementations.flex,
    });
    const { initcode, initcodeHash } = await initcodeFor({
      contractName: "EngineFactoryV0",
      args,
      libraries: {},
    });
    console.log(
      `  ${environment.label.padEnd(9)} chain ${String(environment.chainId).padEnd(9)} outgoing ${outgoing.address}`
    );
    console.log(`    coreRegistry                   ${args[2]}`);
    console.log(`    owner                          ${args[3]}`);
    console.log(`    defaultBaseURIHost             ${args[4]}`);
    console.log(`    universalBytecodeStorageReader ${args[5]}`);
    console.log(`    initcode hash: ${initcodeHash}`);
    await reportFactorySalt({
      label: environment.label,
      initcode,
      initcodeHash,
    });
    console.log("");
  }

  if (missing.length > 0) {
    console.log(
      `No captured state for: ${missing.join(", ")}. Run 0_inspect.ts against ` +
        `each of those networks first; snapshots land in\n  ${SNAPSHOT_DIR}\n`
    );
  }
  console.log(
    `Captured state is a cache. Re-run phase 3 without PREDICT_ONLY against each ` +
      `network before deploying — the initcode hash it prints must match the one ` +
      `the salt was mined against, or \`owner\` / \`defaultBaseURIHost\` changed ` +
      `since the snapshot.`
  );
}

async function phase3(networkName: string) {
  if (PREDICT_ONLY) {
    return phase3PredictAll();
  }
  const implementations = requireImplementations();
  const environment = getEnvironment(networkName);
  console.log(
    `Phase 3 — EngineFactoryV0 for ${environment.label} (${networkName}, chain ${environment.chainId})\n`
  );

  await assertHasCode(
    `${IMPLEMENTATIONS.engine.contractName} implementation`,
    implementations.engine,
    IMPLEMENTATION_REASON
  );
  await assertHasCode(
    `${IMPLEMENTATIONS.flex.contractName} implementation`,
    implementations.flex,
    IMPLEMENTATION_REASON
  );

  // @dev read the deployed implementations rather than trusting config.ts, so a
  // transcription error in an address cannot produce a factory that clones the
  // wrong core.
  for (const [key, spec] of [
    ["engine", IMPLEMENTATIONS.engine] as const,
    ["flex", IMPLEMENTATIONS.flex] as const,
  ]) {
    const core = await ethers.getContractAt(
      "IGenArt721CoreContractV3_Engine",
      implementations[key]
    );
    const [coreType, coreVersion] = await Promise.all([
      core.coreType(),
      core.coreVersion(),
    ]);
    if (coreVersion !== spec.version || coreType !== spec.contractName) {
      throw new Error(
        `${implementations[key]} reports ${coreType} ${coreVersion}, expected ` +
          `${spec.contractName} ${spec.version}.`
      );
    }
    console.log(
      `  ${key}: ${implementations[key]} -> ${coreType} ${coreVersion}`
    );
  }

  const outgoingFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    environment.environment
  );
  const outgoing = await readFactoryState(outgoingFactoryAddress);
  const args = newFactoryConstructorArgs({
    source: outgoing,
    engineImplementation: implementations.engine,
    engineFlexImplementation: implementations.flex,
  });

  const { initcode, initcodeHash } = await initcodeFor({
    contractName: "EngineFactoryV0",
    args,
    libraries: {},
  });

  console.log(`\n  Outgoing factory: ${outgoing.address}`);
  console.log(`  Arguments copied verbatim from it:`);
  console.log(`    coreRegistry                   ${args[2]}`);
  console.log(`    owner                          ${args[3]}`);
  console.log(`    defaultBaseURIHost             ${args[4]}`);
  console.log(`    universalBytecodeStorageReader ${args[5]}`);
  console.log(`\n  initcode hash: ${initcodeHash}`);
  await reportFactorySalt({
    label: environment.label,
    initcode,
    initcodeHash,
  });
  console.log(
    `\n  The factory is intentionally at a different address on every network, ` +
      `because these arguments differ. Mine a salt per network.\n`
  );

  printCreate2Config([
    {
      contractName: "EngineFactoryV0",
      args: [...args],
      libraries: {},
      chainIds: [environment.chainId],
    },
  ]);

  console.log(
    `Salts for the factory have historically been prefixed with the deploying ` +
      `EOA, which restricts who may deploy to the resulting address. See ` +
      `deployments/engine/V3/factory-and-implementations/v3.3/ROLLOUT.md.\n`
  );
  console.log(
    `CREATE2 factory: ${CREATE2_FACTORY}\n` +
      `After deploying, run 2_build-handoff-txs.ts to produce the Safe batch ` +
      `that moves Core Registry ownership to the new factory.`
  );
}

async function main() {
  const networkName = await getNetworkName();
  const phase = selectPhase();
  if (phase === 1) return phase1();
  if (phase === 2) return phase2(networkName);
  return phase3(networkName);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
