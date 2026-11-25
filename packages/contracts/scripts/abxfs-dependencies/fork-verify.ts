// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * End-to-end rehearsal of the ABX FS dependency rollout on a local fork of mainnet or sepolia.
 *
 *   FORK_NETWORK=sepolia|mainnet FORK_RPC_URL=<that network's RPC> [FORK_BLOCK=<n>] \
 *     [FILE_DATA_READER_INITCODE=<hex file>] [DUMP_DIR=<dir>] \
 *     yarn hardhat run scripts/abxfs-dependencies/fork-verify.ts
 *
 * Runs on the in-process hardhat network, forked from FORK_RPC_URL; every transaction is sent on
 * the fork from the real ProxyAdmin owner and AdminACL superAdmin (impersonated). Nothing is sent
 * to any real network. If the ABX FS FileDataReader is not deployed on the network yet, it is
 * deployed on the fork through the keyless CREATE2 deployer from FILE_DATA_READER_INITCODE, which
 * must land at the canonical address.
 *
 * Steps, each checked:
 *   0. OpenZeppelin validates both implementations' storage layouts against the live ones.
 *   1. Every AB500 file is present on the network's ABX FS and decodes to the expected library.
 *   2. Baseline: every check token on every generator, with render gas.
 *   3. Step 1 batch (all proxies at once, the planner 1_upgrade.ts uses). Until step 2, each
 *      dependency inlined until now must render from its preferred CDN instead, with no other
 *      change, and every other token must be byte-identical.
 *   4. The registry refuses an absent CID, a directory, and a file that is not gzip.
 *   5. Step 2 calls (the planner 2_set-abxfs-files.ts uses), sent from the superAdmin; re-planning
 *      finds nothing left.
 *   6. Final renders. Each dependency with an ABX FS file renders it inlined, decoding to the
 *      library, and that is the only change to its document; everything else is byte-identical.
 *      On sepolia the repaired staging generator must render exactly what the dev generator does.
 *   7. The registry's indexed slices of the largest file concatenate to its base64.
 *
 * Every render is also classified against 2^24 of execution gas: EIP-8037's transaction budget
 * (live on sepolia; mainnet at Glamsterdam), which Sepolia RPCs on clients without the eth_call fix
 * (reth until it ships) also apply to eth_call. The call is repeated with a 16,777,216 gas limit,
 * which on a legacy-gas fork is the same budget, since a view creates no state.
 */

import { ethers, network, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import { getEnvironment } from "../registry-driven-rendering/config";
import {
  readRegistryAdmin,
  resolveRollout,
} from "../registry-driven-rendering/topology";
import {
  AB500_ABXFS_FILES,
  AB500_ABXFS_ROOT,
  ABXFS_CANONICAL_FILE_STORE,
  ABXFS_FILE_DATA_READER,
  CHECK_TOKENS,
  CheckToken,
  GENERATOR_CONFIG_FIXES,
} from "./config";
import { verifyAbxfsFile } from "./abxfs";
import { planAbxfsFileCalls } from "./plan";
import { planUpgradeBatch, readCdnWindow } from "./upgrade-batch";

const KEYLESS_CREATE2_DEPLOYER = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
const FILE_DATA_READER_SALT = ethers.utils.id("abx-fs/file-data-reader");
const CALL_GAS = 2_000_000_000;
const EXECUTION_CAP = 16_777_216; // 2^24, EIP-7825 / EIP-8037

// token data carries a block-height-dependent #web3call# payload; masked before comparing
const TOKEN_DATA_PAYLOAD = /#web3call#[A-Za-z0-9+/=]+/g;
const mask = (html: string) =>
  html.replace(TOKEN_DATA_PAYLOAD, "#web3call#<masked>");
const GZIP_TAG =
  /<script type="text\/javascript\+gzip" src="data:text\/javascript;base64,([A-Za-z0-9+/=]*)"><\/script>/g;
const cdnTag = (url: string) =>
  `<script type="text/javascript" src="${url}"></script>`;
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

type Render =
  | {
      ok: true;
      html: string;
      htmlGas: number;
      uriGas: number;
      htmlUnderCap: boolean;
      uriUnderCap: boolean;
    }
  | { ok: false; error: string };

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const context = (s: string) =>
    JSON.stringify(s.slice(Math.max(0, i - 60), i + 60));
  return `offset ${i}: expected ${context(a)}, got ${context(b)}`;
}

async function impersonate(address: string) {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  await network.provider.send("hardhat_setBalance", [
    address,
    "0x56BC75E2D63100000",
  ]);
  return ethers.provider.getSigner(address);
}

async function expectRevert(
  label: string,
  promise: Promise<unknown>,
  reason: string
) {
  try {
    await promise;
  } catch (e: any) {
    const message = `${e?.reason ?? ""} ${e?.message ?? ""} ${e?.error?.message ?? ""}`;
    if (!message.includes(reason)) {
      throw new Error(
        `${label}: reverted, but not with "${reason}": ${message}`
      );
    }
    console.log(`   ok  ${label}: "${reason}"`);
    return;
  }
  throw new Error(`${label}: expected a revert with "${reason}"`);
}

/** Deploys the canonical FileDataReader on the fork if the network does not have it yet. */
async function ensureFileDataReader() {
  if ((await ethers.provider.getCode(ABXFS_FILE_DATA_READER)) !== "0x") {
    console.log(
      `   FileDataReader already deployed at ${ABXFS_FILE_DATA_READER}`
    );
    return;
  }
  const initcodePath = process.env.FILE_DATA_READER_INITCODE;
  if (!initcodePath) {
    throw new Error(
      `No FileDataReader at ${ABXFS_FILE_DATA_READER} on this network: set FILE_DATA_READER_INITCODE ` +
        `to its init code (creation code with constructor arguments) to deploy it on the fork.`
    );
  }
  const initcode = fs.readFileSync(initcodePath, "utf8").trim();
  const predicted = ethers.utils.getCreate2Address(
    KEYLESS_CREATE2_DEPLOYER,
    FILE_DATA_READER_SALT,
    ethers.utils.keccak256(initcode)
  );
  if (predicted !== ethers.utils.getAddress(ABXFS_FILE_DATA_READER)) {
    throw new Error(
      `That init code lands at ${predicted}, not the canonical ${ABXFS_FILE_DATA_READER}.`
    );
  }
  const [funder] = await ethers.getSigners();
  await (
    await funder.sendTransaction({
      to: KEYLESS_CREATE2_DEPLOYER,
      data: ethers.utils.hexConcat([FILE_DATA_READER_SALT, initcode]),
      gasLimit: 15_000_000,
    })
  ).wait();
  if ((await ethers.provider.getCode(ABXFS_FILE_DATA_READER)) === "0x") {
    throw new Error("FileDataReader deployment failed");
  }
  console.log(
    `   deployed FileDataReader at ${ABXFS_FILE_DATA_READER} through the keyless deployer`
  );
}

async function main() {
  const networkName = process.env.FORK_NETWORK ?? "mainnet";
  const forkUrl = process.env.FORK_RPC_URL;
  if (!forkUrl) throw new Error(`Set FORK_RPC_URL to a ${networkName} RPC.`);
  if (network.name !== "hardhat")
    throw new Error("Run on the in-process hardhat network.");
  const environment = getEnvironment(networkName);
  const forkBlock = process.env.FORK_BLOCK
    ? Number(process.env.FORK_BLOCK)
    : (await new ethers.providers.JsonRpcProvider(forkUrl).getBlockNumber()) -
      5;
  await network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: { jsonRpcUrl: forkUrl, blockNumber: forkBlock } }],
  });
  await network.provider.send("evm_setBlockGasLimit", [
    ethers.utils.hexValue(CALL_GAS),
  ]);
  if (
    (await new ethers.providers.JsonRpcProvider(forkUrl).getNetwork())
      .chainId !== environment.chainId
  ) {
    throw new Error(`FORK_RPC_URL is not ${networkName}`);
  }
  console.log(`Forked ${networkName} at block ${forkBlock}.\n`);

  const rollout = await resolveRollout(environment);
  const tokens: CheckToken[] = CHECK_TOKENS[networkName];
  const generators = rollout.generators;

  // 0. storage layouts, against the layouts recorded in .openzeppelin/<network>.json
  console.log("0. OpenZeppelin storage layout validation");
  for (const r of rollout.registries) {
    await upgrades.validateUpgrade(
      r.address,
      await ethers.getContractFactory("DependencyRegistryV0")
    );
    console.log(`   ok  DependencyRegistryV0 at ${r.address}`);
  }
  for (const g of generators) {
    await upgrades.validateUpgrade(
      g.address,
      await ethers.getContractFactory("GenArt721GeneratorV0")
    );
    console.log(`   ok  GenArt721GeneratorV0 at ${g.address} [${g.label}]`);
  }

  // 1. files, and the FileDataReader
  console.log(`\n1. ABX FS on ${networkName}`);
  for (const entry of AB500_ABXFS_FILES) {
    const v = await verifyAbxfsFile(ABXFS_CANONICAL_FILE_STORE, entry);
    console.log(
      `   ok  ${entry.dependency.padEnd(20)} ${v.chunkCount} chunks, ${v.gzipBytes} B gzip -> ${v.decodedBytes} B`
    );
  }
  await ensureFileDataReader();

  const probe = await (
    await ethers.getContractFactory("GasProbeMock")
  ).deploy();
  const generatorContracts = await Promise.all(
    generators.map((g) =>
      ethers.getContractAt("GenArt721GeneratorV0", g.address)
    )
  );
  async function render(gi: number, token: CheckToken): Promise<Render> {
    const generator = generatorContracts[gi];
    try {
      const html: string = await generator.getTokenHtml(
        token.core,
        token.tokenId,
        { gasLimit: CALL_GAS }
      );
      const gasOf = async (fn: string) => {
        const [gasUsed, ok] = await probe.probe(
          generator.address,
          generator.interface.encodeFunctionData(fn, [
            token.core,
            token.tokenId,
          ]),
          { gasLimit: CALL_GAS }
        );
        if (!ok) throw new Error(`${fn} reverted`);
        return gasUsed.toNumber();
      };
      const underCap = async (fn: string) => {
        try {
          await (generator as any)[fn](token.core, token.tokenId, {
            gasLimit: EXECUTION_CAP,
          });
          return true;
        } catch {
          return false;
        }
      };
      return {
        ok: true,
        html,
        htmlGas: await gasOf("getTokenHtml"),
        uriGas: await gasOf("getTokenHtmlBase64EncodedDataUri"),
        htmlUnderCap: await underCap("getTokenHtml"),
        uriUnderCap: await underCap("getTokenHtmlBase64EncodedDataUri"),
      };
    } catch (e: any) {
      return {
        ok: false,
        error: (e?.reason ?? e?.message ?? `${e}`).slice(0, 120),
      };
    }
  }
  async function renderAll(): Promise<Render[][]> {
    const out: Render[][] = [];
    for (let gi = 0; gi < generators.length; gi++) {
      const row: Render[] = [];
      for (const token of tokens) row.push(await render(gi, token));
      out.push(row);
    }
    return out;
  }
  const htmlOf = (r: Render) => (r.ok ? mask(r.html) : `<reverts: ${r.error}>`);

  // 2. baseline
  console.log("\n2. Baseline renders on the deployed contracts");
  const before = await renderAll();
  const window = await readCdnWindow(rollout.registries.map((r) => r.address));
  const inlinedToday = new Map(
    window.map((w) => [w.dependency, w.preferredCDN])
  );
  const cdnByDependency: Record<string, string> = {};
  for (const r of rollout.registries) {
    const registry = await ethers.getContractAt(
      "DependencyRegistryV0",
      r.address
    );
    for (const t of tokens) {
      try {
        cdnByDependency[t.dependency] = (
          await registry.getDependencyDetails(
            ethers.utils.formatBytes32String(t.dependency)
          )
        ).preferredCDN;
      } catch {
        // not registered on this network: rendered with defaults
      }
    }
  }
  generators.forEach((g, gi) =>
    console.log(
      `   ${g.label}: ${before[gi].filter((r) => r.ok).length}/${tokens.length} render` +
        (before[gi].some((r) => !r.ok)
          ? ` (reverting: ${before[gi].find((r) => !r.ok && "error" in r) && (before[gi].find((r) => !r.ok) as any).error})`
          : "")
    )
  );
  console.log(
    `   inlined from registry scripts today: ${Array.from(inlinedToday.keys()).join(", ") || "none"}`
  );

  // 3. step 1 batch
  console.log(
    "\n3. Step 1: upgrade every registry and generator proxy in one batch"
  );
  const registryImpl = await (
    await ethers.getContractFactory("DependencyRegistryV0")
  ).deploy();
  const generatorImpl = await (
    await ethers.getContractFactory("GenArt721GeneratorV0")
  ).deploy();
  const upgradePlan = await planUpgradeBatch(environment, {
    registry: registryImpl.address,
    generator: generatorImpl.address,
  });
  const owner = await impersonate(upgradePlan.owner.owner);
  for (const u of upgradePlan.upgrades) {
    await (
      await owner.sendTransaction({ to: upgradePlan.proxyAdmin, data: u.data })
    ).wait();
    console.log(`   upgraded ${u.label}`);
  }
  const gap = await renderAll();
  let failures = 0;
  generators.forEach((g, gi) =>
    tokens.forEach((t, ti) => {
      const b = before[gi][ti];
      let expected = htmlOf(b);
      if (b.ok && inlinedToday.has(t.dependency)) {
        const tags = Array.from(b.html.matchAll(GZIP_TAG));
        if (tags.length !== 1) {
          failures++;
          console.log(
            `   FAIL ${g.label} ${t.dependency}: baseline has ${tags.length} gzip tags`
          );
          return;
        }
        expected = mask(
          b.html.replace(tags[0][0], () =>
            cdnTag(inlinedToday.get(t.dependency)!)
          )
        );
      }
      if (expected !== htmlOf(gap[gi][ti])) {
        failures++;
        console.log(
          `   FAIL ${g.label} ${t.dependency}: ${firstDifference(expected, htmlOf(gap[gi][ti]))}`
        );
      }
    })
  );
  if (failures > 0)
    throw new Error(`${failures} render(s) failed between steps 1 and 2`);
  console.log(
    `   ok  between steps 1 and 2, ${Array.from(inlinedToday.keys()).join(", ")} render from their CDN; everything else byte-identical`
  );

  // 4. the registry refuses files it cannot serve
  console.log(
    "\n4. The registry refuses CIDs that are not gzip files on this chain"
  );
  const { superAdmin } = await readRegistryAdmin(rollout.registries[0].address);
  const admin = await impersonate(superAdmin);
  const registry0 = (
    await ethers.getContractAt(
      "DependencyRegistryV0",
      rollout.registries[0].address
    )
  ).connect(admin);
  const someDependency = ethers.utils.formatBytes32String("p5@1.9.0");
  const fileStore = new ethers.Contract(
    ABXFS_CANONICAL_FILE_STORE,
    [
      "function createFile(bytes32 rootNode, string mimeType, bytes32 codec, bytes32 outputHash) returns (bytes32)",
      "function fileCid(bytes32 rootNode, string mimeType, bytes32 codec, bytes32 outputHash) pure returns (bytes32)",
    ],
    admin
  );
  // an empty file with no codec: anyone can create it, and it is not gzip
  const rawCid = await fileStore.fileCid(
    ethers.constants.HashZero,
    "text/javascript",
    ethers.constants.HashZero,
    ethers.constants.HashZero
  );
  await (
    await fileStore.createFile(
      ethers.constants.HashZero,
      "text/javascript",
      ethers.constants.HashZero,
      ethers.constants.HashZero
    )
  ).wait();
  await expectRevert(
    "absent CID",
    registry0.updateDependencyAbxfsFileCid(
      someDependency,
      ethers.utils.id("absent")
    ),
    "ABX FS file not found"
  );
  await expectRevert(
    "AB500 directory root",
    registry0.updateDependencyAbxfsFileCid(someDependency, AB500_ABXFS_ROOT),
    "ABX FS file not found"
  );
  await expectRevert(
    "file without a codec",
    registry0.updateDependencyAbxfsFileCid(someDependency, rawCid),
    "ABX FS file must be gzip"
  );

  // 5. step 2
  console.log(
    "\n5. Step 2 calls from the superAdmin (the planner 2_set-abxfs-files.ts uses)"
  );
  for (const r of rollout.registries) {
    const { superAdmin: sender } = await readRegistryAdmin(r.address);
    const signer = await impersonate(sender);
    const calls = await planAbxfsFileCalls(
      networkName,
      r.address,
      sender,
      (l) => console.log(` ${l}`)
    );
    for (const call of calls) {
      await (
        await signer.sendTransaction({ to: call.to, data: call.data })
      ).wait();
      console.log(`   sent ${call.label}`);
    }
    const remaining = await planAbxfsFileCalls(
      networkName,
      r.address,
      sender,
      () => {}
    );
    if (remaining.length !== 0) {
      throw new Error(
        `${remaining.length} call(s) still planned after sending`
      );
    }
  }
  console.log("   re-plan: nothing left to do");

  // 6. after
  console.log("\n6. Renders after the rollout\n");
  const after = await renderAll();
  const dumpDir = process.env.DUMP_DIR;
  if (dumpDir) {
    fs.mkdirSync(dumpDir, { recursive: true });
    generators.forEach((g, gi) =>
      tokens.forEach((t, ti) => {
        const stem = `${networkName}-${g.label}-${t.dependency}-${t.core}-${t.tokenId}`;
        for (const [when, r] of [
          ["before", before[gi][ti]],
          ["after", after[gi][ti]],
        ] as const) {
          if (r.ok)
            fs.writeFileSync(
              path.join(dumpDir, `${stem}-${when}.html`),
              r.html
            );
        }
      })
    );
    console.log(`   wrote before/after HTML to ${dumpDir}\n`);
  }
  const fixedGenerators = new Set(
    (GENERATOR_CONFIG_FIXES[networkName] ?? []).map((f) =>
      ethers.utils.getAddress(f.generator)
    )
  );
  const rows: string[] = [];
  generators.forEach((g, gi) =>
    tokens.forEach((t, ti) => {
      const entry = AB500_ABXFS_FILES.find(
        (e) => e.dependency === t.dependency
      );
      const a = after[gi][ti];
      // a repaired generator is compared with the first (working) generator's final output
      const reference =
        fixedGenerators.has(g.address) && gi > 0 ? after[0][ti] : undefined;
      const b = reference ? before[0][ti] : before[gi][ti];
      let result = "";
      let reason = "";
      if (!a.ok) {
        reason = `reverts: ${a.error}`;
      } else if (reference) {
        reason =
          htmlOf(reference) === htmlOf(a)
            ? ""
            : `differs from ${generators[0].label}: ${firstDifference(htmlOf(reference), htmlOf(a))}`;
        result = reason ? "" : `= ${generators[0].label}`;
      }
      if (!reason && !result && b.ok && a.ok) {
        if (entry && entry.set) {
          // the dependency's tag (CDN or registry gzip) must become a gzip tag that decodes to
          // the library, and nothing else may change
          const inlined = Array.from(a.html.matchAll(GZIP_TAG)).find(
            (m) =>
              sha256(gunzipSync(Buffer.from(m[1], "base64"))) === entry.sha256
          );
          const oldTag = inlinedToday.has(t.dependency)
            ? Array.from(b.html.matchAll(GZIP_TAG))[0]?.[0]
            : cdnTag(cdnByDependency[t.dependency]);
          if (!inlined) {
            reason = "no gzip tag decodes to the library";
          } else if (!oldTag || !b.html.includes(oldTag)) {
            reason = "baseline has no tag for the dependency";
          } else {
            const expected = mask(b.html.replace(oldTag, () => inlined[0]));
            reason =
              expected === htmlOf(a)
                ? ""
                : `differs from the expected document at ${firstDifference(expected, htmlOf(a))}`;
            result = inlinedToday.has(t.dependency)
              ? "inlined from ABX FS (was registry)"
              : "inlined from ABX FS (was CDN)";
          }
        } else {
          reason =
            htmlOf(b) === htmlOf(a)
              ? ""
              : `changed at ${firstDifference(htmlOf(b), htmlOf(a))}`;
          result = "unchanged";
        }
      } else if (!reason && !result && !b.ok) {
        reason = "baseline reverted";
      }
      if (reason) {
        failures++;
        console.log(`   FAIL ${g.label} ${t.dependency}: ${reason}`);
        result = "FAIL";
      }
      const inlinedNow = !!entry && entry.set;
      const cap = !a.ok
        ? "-"
        : !inlinedNow
          ? a.htmlUnderCap
            ? "CDN, renders under cap"
            : "CDN, reverts under cap"
          : a.htmlUnderCap
            ? "renders under cap"
            : "reverts under cap";
      const g6 = (r: Render) =>
        r.ok
          ? `${(r.htmlGas / 1e6).toFixed(1)}M / ${(r.uriGas / 1e6).toFixed(1)}M`
          : "reverts";
      const fit = (r: Render) =>
        r.ok
          ? `${r.htmlUnderCap ? "yes" : "no"} / ${r.uriUnderCap ? "yes" : "no"}`
          : "-";
      rows.push(
        `| ${g.label} | ${t.dependency} | \`${t.core.slice(0, 10)}…\` ${t.tokenId} | ${g6(before[gi][ti])} | ${g6(a)} | ${fit(a)} | ${cap} | ${result} |`
      );
    })
  );
  console.log(
    "| Generator | Dependency | Token | Gas before (html / data URI) | Gas after (html / data URI) | Fits 2^24 after (html / data URI) | Within 2^24 | Result |"
  );
  console.log("|---|---|---|---|---|---|---|---|");
  rows.forEach((r) => console.log(r));
  if (failures > 0) throw new Error(`${failures} render(s) failed`);

  // 7. indexed slices
  console.log("\n7. The registry's indexed slices");
  const largest = AB500_ABXFS_FILES.filter((e) => e.set).find(
    (e) => e.dependency === "babylon@5.0.0"
  )!;
  const registry = await ethers.getContractAt(
    "DependencyRegistryV0",
    rollout.registries[0].address
  );
  const id = ethers.utils.formatBytes32String(largest.dependency);
  const count = (await registry.getDependencyScriptCount(id)).toNumber();
  const slices: string[] = [];
  let maxSliceGas = 0;
  for (let i = 0; i < count; i++) {
    slices.push(await registry.getDependencyScript(id, i));
    const gas = (
      await probe.probe(
        registry.address,
        registry.interface.encodeFunctionData("getDependencyScript", [id, i]),
        { gasLimit: CALL_GAS }
      )
    )[0].toNumber();
    maxSliceGas = Math.max(maxSliceGas, gas);
  }
  const decoded = gunzipSync(Buffer.from(slices.join(""), "base64"));
  if (sha256(decoded) !== largest.sha256) {
    throw new Error(
      `${largest.dependency}: slices do not decode to the library`
    );
  }
  console.log(
    `   ok  ${largest.dependency}: ${count} slices decode to the library; the costliest read is ` +
      `${(maxSliceGas / 1e6).toFixed(2)}M gas (cap ${EXECUTION_CAP})`
  );

  console.log(`\nAll checks pass on ${networkName}.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
