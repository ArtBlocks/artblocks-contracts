// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Derives the superAdmin calls of the ABX FS dependency rollout (step 2) from current chain
 * state: an ABX FS file for each AB500 dependency, zdog's preferred CDN pin, and any generator
 * configuration fix listed for the network. Shared by 2_set-abxfs-files.ts, which writes them as
 * a Safe batch or serves them to a browser wallet, and fork-verify.ts, which sends them on a
 * fork — so the batch builder is the code path the rehearsal exercises.
 */

import { ethers } from "hardhat";
import https from "https";
import { createHash } from "crypto";
import { ethCallOrThrow } from "../generator-upgrade/eth-call";
import {
  SafeContractMethod,
  SafeTransaction,
} from "../generator-upgrade/safe-tx-builder";
import {
  AB500_ABXFS_FILES,
  GENERATOR_CONFIG_FIXES,
  PREFERRED_CDN_FIXES,
} from "./config";

/**
 * GET a URL's body, following redirects, uncompressed.
 * @dev plain https rather than fetch: under hardhat, fetch can resolve to a node-fetch polyfill
 * that fails on some CDN responses.
 */
function httpsGet(url: string, redirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "accept-encoding": "identity" } }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects === 0)
            return reject(new Error(`Too many redirects: ${url}`));
          return resolve(
            httpsGet(
              new URL(res.headers.location, url).toString(),
              redirects - 1
            )
          );
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`GET ${url}: HTTP ${status}`));
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

const REGISTRY_ABI = [
  "function getDependencyAbxfsFileCid(bytes32) view returns (bytes32)",
  "function getDependencyNamesAndVersions() view returns (string[])",
  "function getDependencyDetails(bytes32) view returns (string,string,string preferredCDN,uint24,string,uint24,string,bool,uint24)",
  "function updateDependencyAbxfsFileCid(bytes32 dependencyNameAndVersion, bytes32 abxfsFileCid)",
  "function updateDependencyPreferredCDN(bytes32 dependencyNameAndVersion, string preferredCDN)",
];

const SET_FILE_METHOD: SafeContractMethod = {
  inputs: [
    {
      name: "dependencyNameAndVersion",
      type: "bytes32",
      internalType: "bytes32",
    },
    { name: "abxfsFileCid", type: "bytes32", internalType: "bytes32" },
  ],
  name: "updateDependencyAbxfsFileCid",
  payable: false,
};

const GENERATOR_ABI = [
  "function scriptyBuilder() view returns (address)",
  "function updateScriptyBuilder(address _scriptyBuilder)",
];

const SET_SCRIPTY_METHOD: SafeContractMethod = {
  inputs: [
    { name: "_scriptyBuilder", type: "address", internalType: "address" },
  ],
  name: "updateScriptyBuilder",
  payable: false,
};

const SET_CDN_METHOD: SafeContractMethod = {
  inputs: [
    {
      name: "dependencyNameAndVersion",
      type: "bytes32",
      internalType: "bytes32",
    },
    { name: "preferredCDN", type: "string", internalType: "string" },
  ],
  name: "updateDependencyPreferredCDN",
  payable: false,
};

export type PlannedCall = {
  label: string;
  /** The contract called: the registry, or a generator for a configuration fix. */
  to: string;
  /** Encoded calldata, for simulation and direct sending. */
  data: string;
  /** The same call for the Safe Transaction Builder, which re-encodes it from the values. */
  safeTransaction: SafeTransaction;
};

/**
 * Builds the outstanding calls for `registryAddress` (and the generator fixes listed for
 * `networkName`) and simulates each from `sender`. Skips calls already applied and dependencies
 * not registered on this network. The files' contents are checked separately, with
 * verifyAbxfsFile; the registry itself refuses a CID that is absent or not gzip.
 */
export async function planAbxfsFileCalls(
  networkName: string,
  registryAddress: string,
  sender: string,
  log: (line: string) => void = console.log
): Promise<PlannedCall[]> {
  const registry = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    ethers.provider
  );
  const iface = registry.interface;

  try {
    await registry.getDependencyAbxfsFileCid(ethers.constants.HashZero);
  } catch {
    throw new Error(
      `Registry ${registryAddress} is not upgraded yet — run step 1 and execute its batches first.`
    );
  }

  const registered = new Set<string>(
    await registry.getDependencyNamesAndVersions()
  );
  const calls: PlannedCall[] = [];

  for (const entry of AB500_ABXFS_FILES.filter((e) => e.set)) {
    if (!registered.has(entry.dependency)) {
      log(`  skip ${entry.dependency}: not registered on this network`);
      continue;
    }
    const id = ethers.utils.formatBytes32String(entry.dependency);
    const current: string = await registry.getDependencyAbxfsFileCid(id);
    if (current.toLowerCase() === entry.cid.toLowerCase()) {
      log(`  done ${entry.dependency}: already set`);
      continue;
    }
    calls.push({
      label: `updateDependencyAbxfsFileCid(${entry.dependency}, ${entry.cid})`,
      to: ethers.utils.getAddress(registryAddress),
      data: iface.encodeFunctionData("updateDependencyAbxfsFileCid", [
        id,
        entry.cid,
      ]),
      safeTransaction: {
        to: ethers.utils.getAddress(registryAddress),
        value: "0",
        data: null,
        contractMethod: SET_FILE_METHOD,
        contractInputsValues: {
          dependencyNameAndVersion: id,
          abxfsFileCid: entry.cid,
        },
      },
    });
  }

  for (const fix of PREFERRED_CDN_FIXES) {
    if (!registered.has(fix.dependency)) continue;
    const id = ethers.utils.formatBytes32String(fix.dependency);
    const current: string = (await registry.getDependencyDetails(id))
      .preferredCDN;
    if (current === fix.to) {
      log(`  done ${fix.dependency}: preferred CDN already pinned`);
      continue;
    }
    if (current !== fix.from) {
      log(
        `  skip ${fix.dependency}: preferred CDN is ${current}, not ${fix.from}`
      );
      continue;
    }
    // the pinned URL must serve the same file ABX FS holds
    const entry = AB500_ABXFS_FILES.find(
      (e) => e.dependency === fix.dependency
    );
    const body = await httpsGet(fix.to);
    const sha = createHash("sha256").update(body).digest("hex");
    if (!entry || sha !== entry.sha256) {
      throw new Error(
        `${fix.to} serves SHA-256 ${sha}, expected ${entry?.sha256}`
      );
    }
    calls.push({
      label: `updateDependencyPreferredCDN(${fix.dependency}, ${fix.to})`,
      to: ethers.utils.getAddress(registryAddress),
      data: iface.encodeFunctionData("updateDependencyPreferredCDN", [
        id,
        fix.to,
      ]),
      safeTransaction: {
        to: ethers.utils.getAddress(registryAddress),
        value: "0",
        data: null,
        contractMethod: SET_CDN_METHOD,
        contractInputsValues: {
          dependencyNameAndVersion: id,
          preferredCDN: fix.to,
        },
      },
    });
  }

  for (const fix of GENERATOR_CONFIG_FIXES[networkName] ?? []) {
    const generator = new ethers.Contract(
      fix.generator,
      GENERATOR_ABI,
      ethers.provider
    );
    const current = ethers.utils.getAddress(await generator.scriptyBuilder());
    const { from, to } = fix.scriptyBuilder;
    if (current === ethers.utils.getAddress(to)) {
      log(`  done ${fix.label} generator: ScriptyBuilder already ${to}`);
      continue;
    }
    if (current !== ethers.utils.getAddress(from)) {
      log(
        `  skip ${fix.label} generator: ScriptyBuilder is ${current}, not ${from}`
      );
      continue;
    }
    if ((await ethers.provider.getCode(to)) === "0x") {
      throw new Error(`No ScriptyBuilder at ${to}`);
    }
    calls.push({
      label: `updateScriptyBuilder(${to}) on the ${fix.label} generator`,
      to: ethers.utils.getAddress(fix.generator),
      data: generator.interface.encodeFunctionData("updateScriptyBuilder", [
        to,
      ]),
      safeTransaction: {
        to: ethers.utils.getAddress(fix.generator),
        value: "0",
        data: null,
        contractMethod: SET_SCRIPTY_METHOD,
        contractInputsValues: { _scriptyBuilder: to },
      },
    });
  }

  for (const call of calls) {
    await ethCallOrThrow({ from: sender, to: call.to, data: call.data });
  }
  return calls;
}
