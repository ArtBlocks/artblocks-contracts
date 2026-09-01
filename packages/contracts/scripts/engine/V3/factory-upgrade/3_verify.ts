// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 3 — verify the rollout on one network, after the Safe batch has executed.
 *
 * Reads only. Every check is against chain state rather than the deployment
 * records, and the deployed libraries, implementations and factory are each
 * compared byte for byte against the local build, so a wrong salt, a stale
 * artifact, or a library linked to the wrong address is caught here rather than
 * by the first artist to configure a transfer hook.
 *
 * Ends by printing the exact `constants.ts` and `INFRASTRUCTURE.md` edits the
 * rollout still needs, since those are the two files that make the new factory
 * the one the deploy scripts use.
 *
 *   yarn hardhat run --network mainnet scripts/engine/V3/factory-upgrade/3_verify.ts
 *   NODE_ENV=staging yarn hardhat run --network sepolia scripts/engine/V3/factory-upgrade/3_verify.ts
 */

import hre, { ethers } from "hardhat";
import { getNetworkName } from "../../../util/utils";
import {
  getActiveCoreRegistry,
  getActiveEngineFactoryAddress,
} from "../../../util/constants";
import {
  IMPLEMENTATIONS,
  REUSED_LIBRARIES,
  getEnvironment,
  implementationLibraries,
  requireImplementations,
  requireNewFactory,
  requireNewLibraries,
} from "./config";
import { newFactoryConstructorArgs, readFactoryState } from "./factory-state";
import { ethCallOrThrow } from "../../../generator-upgrade/eth-call";
import { runtimeMatches } from "./bytecode";

type Check = { ok: boolean; label: string; detail?: string };
const checks: Check[] = [];

function record(ok: boolean, label: string, detail?: string) {
  checks.push({ ok, label, detail });
}

/**
 * Compare deployed runtime bytecode against the local build.
 *
 * The local runtime is obtained by `eth_call`-ing the initcode as a contract
 * creation, which returns exactly what a real deploy would store. None of these
 * contracts uses `immutable`, so the comparison is exact rather than
 * approximate — cores are ERC-1167 clone targets and keep everything in storage.
 */
async function checkBytecode(params: {
  label: string;
  address: string;
  contractName: string;
  args?: unknown[];
  libraries?: Record<string, string>;
}) {
  const deployed = await ethers.provider.getCode(params.address);
  if (deployed === "0x") {
    record(false, params.label, `no code at ${params.address}`);
    return;
  }
  const factory = await hre.ethers.getContractFactory(params.contractName, {
    libraries: params.libraries ?? {},
  });
  const initcode = factory
    .getDeployTransaction(...((params.args ?? []) as never[]))
    .data?.toString() as string;
  const expected = await ethCallOrThrow({ data: initcode });
  const artifact = await hre.artifacts.readArtifact(params.contractName);
  const matches = runtimeMatches({
    expected,
    deployed,
    artifactDeployedBytecode: artifact.deployedBytecode,
  });
  record(
    matches,
    params.label,
    matches
      ? params.address
      : `${params.address} does not match the local build of ${params.contractName}`
  );
}

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const newLibraries = requireNewLibraries();
  const implementations = requireImplementations();
  const newFactoryAddress = ethers.utils.getAddress(
    requireNewFactory(environment.label)
  );

  console.log(
    `Verifying ${environment.label} (${networkName}, chain ${environment.chainId})\n`
  );

  // --- libraries -----------------------------------------------------------
  for (const [name, address] of Object.entries(newLibraries)) {
    await checkBytecode({
      label: `library ${name}`,
      address,
      contractName: name,
    });
  }
  for (const [key, address] of Object.entries(REUSED_LIBRARIES)) {
    const code = await ethers.provider.getCode(address);
    // @dev V3FlexLib is deliberately the v3.2-era deployment, whose appended
    // metadata hash differs from a fresh compile, so only presence is checked.
    record(code !== "0x", `reused library ${key} present`, address);
  }

  // --- implementations -----------------------------------------------------
  for (const spec of [IMPLEMENTATIONS.engine, IMPLEMENTATIONS.flex]) {
    const address =
      spec === IMPLEMENTATIONS.engine
        ? implementations.engine
        : implementations.flex;
    await checkBytecode({
      label: `${spec.contractName} ${spec.version} bytecode`,
      address,
      contractName: spec.contractName,
      libraries: implementationLibraries(spec.contractName),
    });
    const core = await ethers.getContractAt(
      "IGenArt721CoreContractV3_Engine",
      address
    );
    const [coreType, coreVersion] = await Promise.all([
      core.coreType(),
      core.coreVersion(),
    ]);
    record(
      coreType === spec.contractName && coreVersion === spec.version,
      `${spec.contractName} reports ${spec.version}`,
      `${coreType} ${coreVersion}`
    );
  }

  // --- factory -------------------------------------------------------------
  const outgoingFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    environment.environment
  );
  const constantsUpdated =
    outgoingFactoryAddress.toLowerCase() === newFactoryAddress.toLowerCase();
  const referenceFactoryAddress = constantsUpdated
    ? newFactoryAddress
    : outgoingFactoryAddress;
  const outgoing = await readFactoryState(referenceFactoryAddress);
  const incoming = await readFactoryState(newFactoryAddress);

  await checkBytecode({
    label: "EngineFactoryV0 bytecode",
    address: newFactoryAddress,
    contractName: "EngineFactoryV0",
    args: newFactoryConstructorArgs({
      source: incoming,
      engineImplementation: implementations.engine,
      engineFlexImplementation: implementations.flex,
    }),
  });
  record(
    incoming.engineImplementation.toLowerCase() ===
      implementations.engine.toLowerCase() &&
      incoming.engineFlexImplementation.toLowerCase() ===
        implementations.flex.toLowerCase(),
    "factory clones the v3.3 implementations",
    `${incoming.engineImplementation} / ${incoming.engineFlexImplementation}`
  );
  record(
    incoming.engineCoreVersion === IMPLEMENTATIONS.engine.version &&
      incoming.flexCoreVersion === IMPLEMENTATIONS.flex.version,
    "factory caches the v3.3 versions",
    `${incoming.engineCoreVersion} / ${incoming.flexCoreVersion}`
  );
  record(!incoming.isAbandoned, "new factory is not abandoned");

  // --- ownership -----------------------------------------------------------
  const coreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    environment.environment
  );
  const coreRegistry = await ethers.getContractAt(
    "CoreRegistryV1",
    coreRegistryAddress
  );
  const registryOwner = await coreRegistry.owner();
  record(
    registryOwner.toLowerCase() === newFactoryAddress.toLowerCase(),
    "Core Registry is owned by the new factory",
    `${coreRegistryAddress} owner = ${registryOwner}`
  );
  record(
    incoming.coreRegistry.toLowerCase() === coreRegistryAddress.toLowerCase(),
    "factory's immutable coreRegistry matches the minter filter's",
    incoming.coreRegistry
  );
  if (!constantsUpdated) {
    record(
      outgoing.isAbandoned,
      "outgoing factory is abandoned",
      outgoing.isAbandoned
        ? outgoingFactoryAddress
        : `${outgoingFactoryAddress} is not abandoned (fine if SKIP_ABANDON was used)`
    );
  }

  // --- the factory can still be driven by its owner ------------------------
  // `createEngineContract` is `onlyOwner`, so a simulation from anywhere else
  // would revert on access control and prove nothing. Predicting a clone address
  // is unpermissioned and exercises the same implementation pointer the real
  // call clones.
  const predicted = await (
    await ethers.getContractAt("EngineFactoryV0", newFactoryAddress)
  ).predictDeterministicAddress(0, ethers.utils.hexZeroPad("0x01", 32));
  record(
    ethers.utils.isAddress(predicted),
    "factory predicts clone addresses",
    `salt 0x..01 -> ${predicted}`
  );

  // --- report --------------------------------------------------------------
  let failures = 0;
  for (const check of checks) {
    if (!check.ok) failures++;
    console.log(
      `  ${check.ok ? "PASS" : "FAIL"}  ${check.label}${check.detail ? `  —  ${check.detail}` : ""}`
    );
  }
  console.log("");

  if (constantsUpdated) {
    console.log(
      `MAIN_CONFIG already points ${networkName}/${environment.environment} at the new factory.`
    );
  } else {
    console.log(`Still to do for ${environment.label}:`);
    console.log(
      `  scripts/util/constants.ts — MAIN_CONFIG.${networkName}.${environment.environment}.engineFactory:`
    );
    console.log(
      `      "${outgoingFactoryAddress}"  ->  "${newFactoryAddress}"`
    );
    console.log(
      `  INFRASTRUCTURE.md — set the EngineFactory address in the ${environment.label} diagram to`
    );
    console.log(`      ${newFactoryAddress}`);
    console.log(
      `      and move ${outgoingFactoryAddress} into the deprecated permissioned table as`
    );
    console.log(
      `      "${environment.label}:EngineFactory (${outgoing.engineCoreVersion}, ${outgoing.flexCoreVersion})".`
    );
  }

  if (failures > 0) {
    throw new Error(`${failures} check(s) failed.`);
  }
  console.log(`\nAll ${checks.length} checks passed.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
