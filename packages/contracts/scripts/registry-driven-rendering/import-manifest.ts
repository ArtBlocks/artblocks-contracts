// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Registers a live implementation's storage layout in this network's OpenZeppelin
 * manifest, so `validateUpgrade` has something to compare against.
 *
 * These proxies were upgraded outside `hardhat-upgrades`, so a manifest can be
 * missing the layout of whatever implementation a proxy is currently running.
 * The usual remedy, `forceImport`, requires having the *old* source checked out.
 * That is unnecessary here: implementations are deployed through the CREATE2
 * factory, so an identical address on two chains can only have come from
 * identical initcode. This copies the layout across, but only after confirming
 * the deployed runtime bytecode is byte-identical on both chains — so the
 * inference is verified rather than assumed.
 *
 * Writes to `.openzeppelin/`; commit the result.
 *
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/import-manifest.ts
 */

import hre, { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import { getEnvironment } from "./config";
import { readImplementation, resolveRollout } from "./topology";

const MANIFEST_DIR = path.resolve(__dirname, "..", "..", ".openzeppelin");

type Manifest = {
  impls: Record<string, { address: string; layout: unknown }>;
};

function manifestPath(networkName: string): string {
  return path.join(MANIFEST_DIR, `${networkName}.json`);
}

function readManifest(file: string): Manifest {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function findImpl(
  manifest: Manifest,
  address: string
): [string, { address: string; layout: unknown }] | undefined {
  return Object.entries(manifest.impls ?? {}).find(
    ([, impl]) => impl.address.toLowerCase() === address.toLowerCase()
  );
}

/** Runtime bytecode at `address` on another configured network. */
async function codeOnNetwork(
  networkName: string,
  address: string
): Promise<string> {
  const config = hre.config.networks[networkName] as { url?: string };
  if (!config?.url) {
    throw new Error(
      `Cannot verify against "${networkName}": no RPC URL is configured for it.`
    );
  }
  const provider = new ethers.providers.JsonRpcProvider(config.url);
  return provider.getCode(address);
}

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);

  const targetFile = manifestPath(networkName);
  const target = readManifest(targetFile);

  const proxies = [
    ...rollout.registries.map((r) => r.address),
    ...rollout.generators.map((g) => g.address),
  ];

  const otherNetworks = fs
    .readdirSync(MANIFEST_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .filter((name) => name !== networkName);

  let imported = 0;
  for (const proxy of proxies) {
    const implementation = await readImplementation(proxy);
    if (findImpl(target, implementation)) {
      console.log(`${proxy}  impl ${implementation}  already registered`);
      continue;
    }

    const source = otherNetworks
      .map((name) => ({
        name,
        entry: findImpl(readManifest(manifestPath(name)), implementation),
      }))
      .find((candidate) => candidate.entry);

    if (!source?.entry) {
      throw new Error(
        `Implementation ${implementation} (proxy ${proxy}) is not in any manifest. ` +
          `Check out the source it was built from and use \`upgrades.forceImport\`.`
      );
    }

    const [here, there] = await Promise.all([
      ethers.provider.getCode(implementation),
      codeOnNetwork(source.name, implementation),
    ]);
    if (here === "0x" || here.toLowerCase() !== there.toLowerCase()) {
      throw new Error(
        `Runtime bytecode at ${implementation} differs between ${networkName} and ` +
          `${source.name}. Refusing to copy a storage layout between them.`
      );
    }

    const [key, entry] = source.entry;
    target.impls[key] = entry;
    imported++;
    console.log(
      `${proxy}  impl ${implementation}  imported layout from ${source.name} ` +
        `(bytecode verified identical, ${(here.length - 2) / 2} bytes)`
    );
  }

  if (imported > 0) {
    fs.writeFileSync(targetFile, JSON.stringify(target, null, 2) + "\n");
    console.log(
      `\nWrote ${imported} entr${imported === 1 ? "y" : "ies"} to ` +
        `${path.relative(process.cwd(), targetFile)} — commit this.`
    );
  } else {
    console.log("\nNothing to import.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
