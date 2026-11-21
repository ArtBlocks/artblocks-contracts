// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * End-to-end rehearsal of the ABX FS dependency rollout on a local mainnet fork.
 *
 *   FORK_RPC_URL=<any mainnet RPC> [FORK_BLOCK=<n>] \
 *     yarn hardhat run scripts/abxfs-dependencies/fork-verify.ts
 *
 * Runs on the in-process hardhat network, forked from FORK_RPC_URL. The fork only reads state
 * from that RPC and executes every call locally, so a public endpoint with a low eth_call gas cap
 * is fine. Nothing is sent to any real network. Pin FORK_BLOCK to re-run quickly from hardhat's
 * fork cache. Set DUMP_DIR to also write each token's HTML before and after, e.g. to open in a
 * browser.
 *
 * Steps, each checked:
 *   0. OpenZeppelin validates both new implementations' storage layouts against the live ones.
 *   1. Every AB500 file is present on mainnet ABX FS and decodes to the expected library.
 *   2. Capture the HTML and render gas of one live token per dependency.
 *   3. Upgrade the registry only. The deployed generator must render byte-identical HTML: it
 *      decodes getDependencyDetailsV2 with the struct that precedes abxfsFileCid.
 *   4. Upgrade the generator. Byte-identical again, because no CID is set yet.
 *   5. Build the step 2 calls with the same planner 2_set-abxfs-files.ts uses (12 CIDs plus the
 *      zdog preferred CDN pin), and send them from the registry's AdminACL superAdmin. Planning
 *      again afterwards must find nothing left to do.
 *   6. Re-render. A dependency that loaded from its CDN must now inline its ABX FS file - and
 *      that must be the only change to its HTML. Every other token stays byte-identical.
 */

import { ethers, network, upgrades } from "hardhat";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import {
  AB500_ABXFS_FILES,
  ABXFS_CANONICAL_FILE_STORE,
  MAINNET_CHECK_TOKENS,
} from "./config";
import { verifyAbxfsFile } from "./abxfs";
import { planAbxfsFileCalls } from "./plan";

const GENERATOR_PROXY = "0x953D288708bB771F969FCfD9BA0819eF506Ac718";
const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
const CALL_GAS = 1_000_000_000;
// Alchemy's documented eth_call gas cap; public endpoints are commonly 50M
const LARGE_RPC_CAP = 550_000_000;
const PUBLIC_RPC_CAP = 50_000_000;

// token data carries a block-height-dependent #web3call# payload; masked before comparing
const TOKEN_DATA_PAYLOAD = /#web3call#[A-Za-z0-9+/=]+/g;
const mask = (html: string) =>
  html.replace(TOKEN_DATA_PAYLOAD, "#web3call#<masked>");
const GZIP_TAG =
  /<script type="text\/javascript\+gzip" src="data:text\/javascript;base64,([A-Za-z0-9+/=]*)"><\/script>/g;
const cdnTag = (url: string) =>
  `<script type="text/javascript" src="${url}"></script>`;
const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

type Render = { html: string; gas: number };

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

async function main() {
  const forkUrl = process.env.FORK_RPC_URL;
  if (!forkUrl) throw new Error("Set FORK_RPC_URL to a mainnet RPC endpoint.");
  if (network.name !== "hardhat")
    throw new Error("Run on the in-process hardhat network.");
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
  console.log(`Forked mainnet at block ${forkBlock}.\n`);

  const generator = await ethers.getContractAt(
    "GenArt721GeneratorV0",
    GENERATOR_PROXY
  );
  const registryAddress = await generator.dependencyRegistry();
  const registry = await ethers.getContractAt(
    "DependencyRegistryV0",
    registryAddress
  );
  const proxyAdmin = ethers.utils.getAddress(
    "0x" +
      (
        await ethers.provider.getStorageAt(GENERATOR_PROXY, EIP1967_ADMIN_SLOT)
      ).slice(26)
  );
  const registryProxyAdmin = ethers.utils.getAddress(
    "0x" +
      (
        await ethers.provider.getStorageAt(registryAddress, EIP1967_ADMIN_SLOT)
      ).slice(26)
  );
  const proxyAdminContract = new ethers.Contract(
    proxyAdmin,
    [
      "function owner() view returns (address)",
      "function upgrade(address proxy, address implementation)",
    ],
    ethers.provider
  );
  const proxyAdminOwner = await proxyAdminContract.owner();
  const adminACL = await registry.adminACLContract();
  const superAdmin = await new ethers.Contract(
    adminACL,
    ["function superAdmin() view returns (address)"],
    ethers.provider
  ).superAdmin();
  console.log(`Registry ${registryAddress}, ProxyAdmin ${registryProxyAdmin}`);
  console.log(
    `Generator ${GENERATOR_PROXY}, ProxyAdmin ${proxyAdmin}, owner ${proxyAdminOwner}`
  );
  console.log(`Registry AdminACL superAdmin ${superAdmin}\n`);
  if (registryProxyAdmin !== proxyAdmin)
    throw new Error("Registry and generator ProxyAdmins differ");

  // 0. storage layouts, against the layouts recorded in .openzeppelin/mainnet.json for the live
  // implementations (the plugin reads the forked network's manifest)
  console.log("0. OpenZeppelin storage layout validation");
  for (const [name, proxy] of [
    ["DependencyRegistryV0", registryAddress],
    ["GenArt721GeneratorV0", GENERATOR_PROXY],
  ]) {
    await upgrades.validateUpgrade(
      proxy,
      await ethers.getContractFactory(name)
    );
    console.log(`   ok  ${name} at ${proxy}`);
  }
  console.log("");

  // 1. files
  console.log("1. ABX FS files on mainnet");
  for (const entry of AB500_ABXFS_FILES) {
    const v = await verifyAbxfsFile(ABXFS_CANONICAL_FILE_STORE, entry);
    console.log(
      `   ok  ${entry.dependency.padEnd(20)} ${v.chunkCount} chunks, ${v.gzipBytes} B gzip -> ${v.decodedBytes} B`
    );
  }

  const probe = await (
    await ethers.getContractFactory("GasProbeMock")
  ).deploy();
  async function render(token: {
    core: string;
    tokenId: string;
  }): Promise<Render> {
    const html: string = await generator.getTokenHtml(
      token.core,
      token.tokenId,
      { gasLimit: CALL_GAS }
    );
    const data = generator.interface.encodeFunctionData(
      "getTokenHtmlBase64EncodedDataUri",
      [token.core, token.tokenId]
    );
    const [gasUsed, ok] = await probe.probe(GENERATOR_PROXY, data, {
      gasLimit: CALL_GAS,
    });
    if (!ok)
      throw new Error(
        `getTokenHtmlBase64EncodedDataUri reverted for ${token.core}:${token.tokenId}`
      );
    return { html, gas: gasUsed.toNumber() };
  }
  async function renderAll(): Promise<Render[]> {
    const out: Render[] = [];
    for (const token of MAINNET_CHECK_TOKENS) out.push(await render(token));
    return out;
  }
  function expectUnchanged(label: string, before: Render[], after: Render[]) {
    MAINNET_CHECK_TOKENS.forEach((t, i) => {
      if (mask(before[i].html) !== mask(after[i].html)) {
        throw new Error(
          `${label}: ${t.dependency} (${t.core}:${t.tokenId}) HTML changed`
        );
      }
    });
    console.log(
      `   ok  all ${MAINNET_CHECK_TOKENS.length} tokens byte-identical`
    );
  }

  // 2. baseline
  console.log("\n2. Baseline renders on the deployed contracts");
  const before = await renderAll();
  // preferred CDN of each dependency, read before any change
  const cdnByDependency: Record<string, string> = {};
  const scriptCountByDependency: Record<string, number> = {};
  for (const t of MAINNET_CHECK_TOKENS) {
    const details = await registry.getDependencyDetails(
      ethers.utils.formatBytes32String(t.dependency)
    );
    cdnByDependency[t.dependency] = details.preferredCDN;
    scriptCountByDependency[t.dependency] = details.scriptCount;
  }
  console.log(`   rendered ${before.length} tokens`);

  // 3. registry upgrade only
  console.log("\n3. Upgrade DependencyRegistryV0 only");
  const owner = await impersonate(proxyAdminOwner);
  const registryImpl = await (
    await ethers.getContractFactory("DependencyRegistryV0")
  ).deploy();
  await (
    await proxyAdminContract
      .connect(owner)
      .upgrade(registryAddress, registryImpl.address)
  ).wait();
  expectUnchanged("registry-only upgrade", before, await renderAll());

  // 4. generator upgrade
  console.log("\n4. Upgrade GenArt721GeneratorV0");
  const generatorImpl = await (
    await ethers.getContractFactory("GenArt721GeneratorV0")
  ).deploy();
  await (
    await proxyAdminContract
      .connect(owner)
      .upgrade(GENERATOR_PROXY, generatorImpl.address)
  ).wait();
  if ((await generator.abxfsFileStore()) !== ABXFS_CANONICAL_FILE_STORE) {
    throw new Error(
      "Generator does not default to the canonical ABX FS FileStore"
    );
  }
  expectUnchanged("generator upgrade, no CIDs set", before, await renderAll());

  // 5. set CIDs
  console.log(
    "\n5. Plan and send the step 2 calls from the superAdmin (same planner as 2_set-abxfs-files.ts)"
  );
  const admin = await impersonate(superAdmin);
  const calls = await planAbxfsFileCalls(registryAddress, superAdmin, (l) =>
    console.log(` ${l}`)
  );
  const expectedCalls =
    AB500_ABXFS_FILES.filter((e) => e.set).length + 1; /* zdog CDN pin */
  if (calls.length !== expectedCalls) {
    throw new Error(`Planned ${calls.length} calls, expected ${expectedCalls}`);
  }
  for (const call of calls) {
    await (
      await admin.sendTransaction({ to: registryAddress, data: call.data })
    ).wait();
    console.log(`   sent ${call.label}`);
  }
  const remaining = await planAbxfsFileCalls(
    registryAddress,
    superAdmin,
    () => {}
  );
  if (remaining.length !== 0) {
    throw new Error(`${remaining.length} call(s) still planned after sending`);
  }
  console.log("   re-plan: nothing left to do");

  // 6. after
  console.log("\n6. Renders after the rollout\n");
  const after = await renderAll();
  const dumpDir = process.env.DUMP_DIR;
  if (dumpDir) {
    fs.mkdirSync(dumpDir, { recursive: true });
    MAINNET_CHECK_TOKENS.forEach((t, i) => {
      const stem = `${t.dependency}-${t.core}-${t.tokenId}`;
      fs.writeFileSync(
        path.join(dumpDir, `${stem}-before.html`),
        before[i].html
      );
      fs.writeFileSync(path.join(dumpDir, `${stem}-after.html`), after[i].html);
    });
    console.log(`   wrote before/after HTML to ${dumpDir}\n`);
  }
  const rows: string[] = [];
  let failures = 0;
  MAINNET_CHECK_TOKENS.forEach((t, i) => {
    const entry = AB500_ABXFS_FILES.find((e) => e.dependency === t.dependency);
    const switched =
      !!entry && entry.set && scriptCountByDependency[t.dependency] === 0;
    let result: string;
    let reason = "";
    if (switched) {
      // the CDN tag must be replaced by a gzip data URI tag that decodes to the library, and
      // nothing else in the document may change
      // @dev Array.from, not spread: scripts compile to ES5, where spreading an iterator
      // silently yields an empty array
      const tags = Array.from(after[i].html.matchAll(GZIP_TAG));
      const inlined = tags.find(
        (m) => sha256(gunzipSync(Buffer.from(m[1], "base64"))) === entry!.sha256
      );
      const cdn = cdnTag(cdnByDependency[t.dependency]);
      if (!inlined) {
        reason = `no gzip tag decodes to the library (${tags.length} gzip tag(s))`;
      } else if (!mask(before[i].html).includes(cdn)) {
        reason = `baseline has no ${cdn}`;
      } else {
        // @dev a replacer function, so "$" sequences in the replacement are never special
        const expected = mask(before[i].html).replace(cdn, () => inlined[0]);
        reason =
          expected === mask(after[i].html)
            ? ""
            : `differs from the expected document at ${firstDifference(expected, mask(after[i].html))}`;
      }
      result = reason ? "FAIL" : "INLINED from ABX FS";
    } else {
      reason =
        mask(before[i].html) === mask(after[i].html)
          ? ""
          : `changed at ${firstDifference(mask(before[i].html), mask(after[i].html))}`;
      result = reason ? "FAIL" : "unchanged";
    }
    if (reason) {
      failures++;
      console.log(`   FAIL ${t.dependency}: ${reason}`);
    }
    const capNote =
      after[i].gas > LARGE_RPC_CAP
        ? " > 550M"
        : after[i].gas > PUBLIC_RPC_CAP
          ? " > 50M"
          : "";
    rows.push(
      `| ${t.dependency} | \`${t.core.slice(0, 10)}…\` ${t.tokenId} | ${before[i].html.length} | ${after[i].html.length} | ` +
        `${(before[i].gas / 1e6).toFixed(1)}M | ${(after[i].gas / 1e6).toFixed(1)}M${capNote} | ${result} |`
    );
  });
  console.log(
    "| Dependency | Token | HTML before | HTML after | Gas before | Gas after | Result |"
  );
  console.log("|---|---|---|---|---|---|---|");
  rows.forEach((r) => console.log(r));
  if (failures > 0) throw new Error(`${failures} token(s) failed`);
  console.log(`\nAll ${MAINNET_CHECK_TOKENS.length} tokens pass.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
