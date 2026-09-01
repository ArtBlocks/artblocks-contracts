// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Reads the full public configuration of a deployed `EngineFactoryV0`.
 *
 * Every field the constructor takes is exposed by the factory, so the new
 * factory's arguments can be derived from the one it replaces rather than
 * transcribed from a deployment record. Five of the six arguments are copied
 * verbatim; only the two implementations change.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Snapshots of each outgoing factory's live configuration.
 *
 * Gitignored: they are a cache of chain state, not a record. `0_inspect.ts`
 * writes one per environment, and `1_prepare-deployments.ts` reads them when
 * computing factory initcode ahead of a deploy, so the constructor arguments a
 * salt is mined against come from chain rather than from a transcription of a
 * deployment record. `owner` and `defaultBaseURIHost` are mutable on the
 * factory, so transcribing them from the v004 records would not be safe.
 */
export const SNAPSHOT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "deployments",
  "engine",
  "V3",
  "factory-and-implementations",
  "factory-state"
);

export function writeFactoryStateSnapshot(
  label: string,
  state: FactoryState
): string {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const file = path.join(SNAPSHOT_DIR, `${label}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      { ...state, capturedAt: new Date().toISOString() },
      null,
      2
    ) + "\n"
  );
  return file;
}

export function readFactoryStateSnapshot(label: string): FactoryState | null {
  const file = path.join(SNAPSHOT_DIR, `${label}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as FactoryState;
}

export type FactoryState = {
  address: string;
  owner: string;
  coreRegistry: string;
  defaultBaseURIHost: string;
  universalBytecodeStorageReader: string;
  engineImplementation: string;
  engineFlexImplementation: string;
  engineCoreType: string;
  engineCoreVersion: string;
  flexCoreType: string;
  flexCoreVersion: string;
  isAbandoned: boolean;
};

export async function readFactoryState(address: string): Promise<FactoryState> {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    throw new Error(
      `No contract at ${address} on this network. Check MAIN_CONFIG in ` +
        `scripts/util/constants.ts and the --network flag.`
    );
  }
  const factory = await ethers.getContractAt("EngineFactoryV0", address);
  const [
    owner,
    coreRegistry,
    defaultBaseURIHost,
    universalBytecodeStorageReader,
    engineImplementation,
    engineFlexImplementation,
    engineCoreType,
    engineCoreVersion,
    flexCoreType,
    flexCoreVersion,
    isAbandoned,
  ] = await Promise.all([
    factory.owner(),
    factory.coreRegistry(),
    factory.defaultBaseURIHost(),
    factory.universalBytecodeStorageReader(),
    factory.engineImplementation(),
    factory.engineFlexImplementation(),
    factory.engineCoreType(),
    factory.engineCoreVersion(),
    factory.flexCoreType(),
    factory.flexCoreVersion(),
    factory.isAbandoned(),
  ]);

  return {
    address: ethers.utils.getAddress(address),
    owner,
    coreRegistry,
    defaultBaseURIHost,
    universalBytecodeStorageReader,
    engineImplementation,
    engineFlexImplementation,
    engineCoreType,
    engineCoreVersion,
    flexCoreType,
    flexCoreVersion,
    isAbandoned,
  };
}

/**
 * Constructor arguments for the replacement factory, in the order
 * `EngineFactoryV0`'s constructor takes them.
 */
export function newFactoryConstructorArgs(params: {
  /**
   * Factory to copy the four network-specific arguments from. Normally the
   * outgoing factory; a verification pass instead passes the newly deployed
   * factory, to reproduce its own initcode from its own state.
   */
  source: FactoryState;
  engineImplementation: string;
  engineFlexImplementation: string;
}): [string, string, string, string, string, string] {
  return [
    ethers.utils.getAddress(params.engineImplementation),
    ethers.utils.getAddress(params.engineFlexImplementation),
    params.source.coreRegistry,
    params.source.owner,
    params.source.defaultBaseURIHost,
    params.source.universalBytecodeStorageReader,
  ];
}
