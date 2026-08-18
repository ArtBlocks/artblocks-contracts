// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Step 5 — confirm the rollout, and prove it changed nothing it should not have.
 *
 * Run once with `CAPTURE=true` *before* the generator upgrade to record the HTML
 * every check project renders today, then again afterwards. Anything whose
 * dependency was not reconfigured must come back byte-identical; the ES module
 * projects are expected to differ, and are checked structurally instead.
 *
 * The expectations are read from the registry rather than hardcoded, so this
 * asserts the property the upgrade actually claims: that emitted HTML follows
 * what the registry prescribes.
 *
 * `RENDER_ONLY=true` compares rendering against the baseline without asserting
 * that the rollout has finished. It is the check to run *between* steps: neither
 * the registry upgrade nor the backfill may change any output, because the
 * still-deployed generator reads the legacy tuple and ignores the new fields.
 *
 *   CAPTURE=true yarn hardhat run --network sepolia scripts/registry-driven-rendering/5_verify.ts
 *   yarn hardhat run --network sepolia scripts/registry-driven-rendering/5_verify.ts
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { getNetworkName } from "../util/utils";
import {
  CanvasTagType,
  GENERATOR_CONTRACT_NAME,
  ProjectScriptTagType,
  REGISTRY_CONTRACT_NAME,
  dependencyName,
  getEnvironment,
} from "./config";
import { CheckProject, loadCheckProjects } from "./checks";
import { predictImplementation } from "./implementation";
import { buildBackfillPlan, describeCall } from "./plan";
import { readImplementation, resolveRollout } from "./topology";

const BASELINE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "deployments",
  "generator",
  "rollout-baselines"
);

const GENERATOR_ABI = [
  "function getTokenHtml(address coreContract, uint256 tokenId) view returns (string)",
];
const REGISTRY_ABI = [
  "function getDependencyDetailsV2(bytes32) view returns (tuple(string nameAndVersion, string licenseType, string preferredCDN, uint24 additionalCDNCount, string preferredRepository, uint24 additionalRepositoryCount, string dependencyWebsite, bool availableOnChain, uint24 scriptCount, bool loadAsModule, uint8 canvasTagType, uint8 projectScriptTagType, string projectScriptSpecialType))",
  "function getDependencyNamesAndVersions() view returns (string[])",
  "function getDependencyNameAndVersionForProject(address, uint256) view returns (string)",
];

const STYLE_RESET = "<style>html{height:100%}body{min-height:100%";

/**
 * Token data carries a `#web3call#` payload that encodes the current block
 * height, so the same token renders different bytes at different blocks. It is
 * assembled outside anything this rollout touches, and comparing it would report
 * drift on every run, so it is masked before hashing.
 */
const TOKEN_DATA_PAYLOAD = /#web3call#[A-Za-z0-9+/=]+/g;

function normalize(html: string): string {
  return html.replace(TOKEN_DATA_PAYLOAD, "#web3call#<masked>");
}

/**
 * Failures are recorded alongside successes so that a proxy which is already
 * broken for unrelated reasons — sepolia's staging generator points at an older
 * ScriptyBuilder and reverts today — is not mistaken for a regression.
 */
type BaselineEntry =
  | {
      length: number;
      hash: string;
      /**
       * What the project resolved to when the baseline was taken. An override
       * changes this, and changes the output with it, so a comparison across a
       * change of dependency is not a regression check.
       */
      dependency?: string;
    }
  | { failed: string };

type Baseline = Record<string, BaselineEntry>;

function baselinePath(networkName: string, label: string): string {
  return path.join(BASELINE_DIR, `${networkName}-${label}-baseline.json`);
}

function checkKey(check: CheckProject): string {
  return `${check.core}:${check.tokenId}`;
}

async function main() {
  const networkName = await getNetworkName();
  const environment = getEnvironment(networkName);
  const rollout = await resolveRollout(environment);
  const capture = process.env.CAPTURE === "true";
  const renderOnly = process.env.RENDER_ONLY === "true";

  console.log(`Network: ${networkName} (chain ${environment.chainId})\n`);

  const failures: string[] = [];
  const reviews: string[] = [];

  if (!capture && !renderOnly) {
    await verifyImplementations(networkName, rollout, failures);
  }
  if (renderOnly) {
    console.log(
      "RENDER_ONLY — comparing output against the baseline. Rollout completion\n" +
        "is not asserted; structural checks against the registry are skipped,\n" +
        "since the deployed generator may not read those fields yet.\n"
    );
  }

  for (const generator of rollout.generators) {
    console.log(`\n=== ${generator.label} ===`);
    const checks = await loadCheckProjects(networkName, generator.registry);
    const registry = new ethers.Contract(
      generator.registry,
      REGISTRY_ABI,
      ethers.provider
    );
    const generatorContract = new ethers.Contract(
      generator.address,
      GENERATOR_ABI,
      ethers.provider
    );
    // @dev `getDependencyDetailsV2` echoes the queried identifier back as
    // `nameAndVersion` whether or not a record exists, so membership in the
    // registered list is the only way to tell an unregistered string apart.
    const registered = new Set<string>(
      await registry.getDependencyNamesAndVersions()
    );

    const file = baselinePath(networkName, generator.label);
    const baseline: Baseline =
      !capture && fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : {};
    const captured: Baseline = {};

    for (const check of checks) {
      const previous = baseline[checkKey(check)];
      const previouslyFailed = previous !== undefined && "failed" in previous;

      let html: string;
      try {
        html = await generatorContract.getTokenHtml(check.core, check.tokenId);
      } catch (error: any) {
        const reason =
          error?.reason ??
          error?.error?.message ??
          error?.message ??
          `${error}`;
        captured[checkKey(check)] = { failed: reason };
        if (capture) {
          console.log(
            `  ${check.dependency.padEnd(22)} FAILS ALREADY  ${reason}`
          );
        } else if (previouslyFailed) {
          console.log(
            `  ${check.dependency.padEnd(22)} still failing, as before the upgrade`
          );
        } else {
          failures.push(
            `${check.dependency}: getTokenHtml failed for ${check.core} #${check.tokenId} — ${reason}`
          );
          console.log(`  ${check.dependency.padEnd(22)} FAILED  ${reason}`);
        }
        continue;
      }

      // @dev resolved live rather than read from the cached check list: an
      // override changes what a project declares, and the check list records
      // what it declared when it was discovered.
      let dependency = check.dependency;
      try {
        dependency = await registry.getDependencyNameAndVersionForProject(
          check.core,
          check.projectId
        );
      } catch {
        /* pre-V3 core with no override; the discovered label stands */
      }

      const hash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(normalize(html))
      );
      captured[checkKey(check)] = { length: html.length, hash, dependency };

      if (capture) {
        console.log(
          `  ${dependency.padEnd(22)} ${html.length} bytes  captured`
        );
        continue;
      }

      const before = previous && !("failed" in previous) ? previous : undefined;
      const delta = before ? html.length - before.length : null;

      // Between rollout steps the deployed generator still reads the legacy
      // tuple, so nothing may move until the generator itself is upgraded.
      if (renderOnly) {
        const changed = before !== undefined && before.hash !== hash;
        console.log(
          `  ${dependency.padEnd(22)} ${html.length} bytes` +
            `${formatDelta(delta)}  ${changed ? "CHANGED" : "unchanged"}`
        );
        if (changed) {
          failures.push(
            `${dependency}: output changed (${before!.length} -> ${html.length} ` +
              `bytes) before the generator upgrade — no step up to this point ` +
              `should alter rendering`
          );
        }
        continue;
      }

      const details = await registry.getDependencyDetailsV2(
        ethers.utils.formatBytes32String(dependency)
      );

      // A project may declare a script type that was never registered — mainnet
      // has `js@undefined` and `js@n/a`. The old generator matched those by the
      // name before the `@`; the new one has no record to read, so it renders
      // them with the defaults. That difference is real but deliberate, so it is
      // surfaced for review rather than counted as a regression.
      if (!registered.has(dependency)) {
        console.log(
          `  ${dependency.padEnd(22)} ${html.length} bytes` +
            `${formatDelta(delta)}  REVIEW  no registry record`
        );
        if (before && before.hash !== hash) {
          reviews.push(
            `${dependency}: renders ${delta! > 0 ? "+" : ""}${delta} bytes ` +
              `vs. before the upgrade; no registry record, so it now renders with ` +
              `the defaults (classic script, no canvas)`
          );
        }
        continue;
      }

      const problems = checkHtml(html, dependency, details);

      // A project that has been pointed at a different dependency is expected to
      // render differently — that is the point of the override — so the baseline
      // is reported rather than enforced.
      const remapped =
        before?.dependency !== undefined && before.dependency !== dependency;
      const reconfigured =
        details.loadAsModule ||
        Number(details.projectScriptTagType) === ProjectScriptTagType.Module;
      if (before && !reconfigured && !remapped && before.hash !== hash) {
        problems.push(
          `output changed (${before.length} -> ${html.length} bytes) but this ` +
            `dependency's rendering was not meant to change`
        );
      }
      if (remapped && before!.hash !== hash) {
        reviews.push(
          `${check.core} #${check.projectId}: now declares ${dependency} ` +
            `(was ${before!.dependency}) and renders ` +
            `${delta! > 0 ? "+" : ""}${delta} bytes`
        );
      }

      console.log(
        `  ${dependency.padEnd(22)} ${html.length} bytes` +
          `${formatDelta(delta)}` +
          `  ${problems.length === 0 ? (remapped ? "REVIEW" : "OK") : "FAILED"}`
      );
      for (const problem of problems) {
        console.log(`      ${problem}`);
        failures.push(`${dependency}: ${problem}`);
      }
    }

    if (capture) {
      fs.mkdirSync(BASELINE_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(captured, null, 2) + "\n");
      console.log(
        `\nWrote ${path.relative(process.cwd(), file)} — re-run without CAPTURE after the upgrade.`
      );
    } else if (Object.keys(baseline).length === 0) {
      console.log(
        `\nNo baseline at ${path.relative(process.cwd(), file)}; ` +
          `structural checks only, no regression comparison.`
      );
    }
  }

  if (reviews.length > 0) {
    console.log("\n=== for review ===");
    for (const review of reviews) console.log(`  ${review}`);
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} verification failure(s):\n` +
        failures.map((f) => `  ${f}`).join("\n")
    );
  }
  if (!capture) {
    console.log("\nAll checks passed.");
  }
}

function formatDelta(delta: number | null): string {
  if (delta === null) return "";
  if (delta === 0) return "  identical";
  return `  ${delta > 0 ? "+" : ""}${delta} bytes`;
}

async function verifyImplementations(
  networkName: string,
  rollout: Awaited<ReturnType<typeof resolveRollout>>,
  failures: string[]
) {
  const expected = {
    [REGISTRY_CONTRACT_NAME]: (
      await predictImplementation(REGISTRY_CONTRACT_NAME)
    ).address,
    [GENERATOR_CONTRACT_NAME]: (
      await predictImplementation(GENERATOR_CONTRACT_NAME)
    ).address,
  };

  console.log("=== implementations ===");
  const proxies = [
    ...rollout.registries.map((r) => ({
      ...r,
      contractName: REGISTRY_CONTRACT_NAME,
    })),
    ...rollout.generators.map((g) => ({
      ...g,
      contractName: GENERATOR_CONTRACT_NAME,
    })),
  ];
  for (const proxy of proxies) {
    const live = await readImplementation(proxy.address);
    const want = expected[proxy.contractName];
    const ok = live.toLowerCase() === want.toLowerCase();
    console.log(
      `  ${proxy.contractName} ${proxy.label.padEnd(8)} ${live}  ${ok ? "OK" : `EXPECTED ${want}`}`
    );
    if (!ok) {
      failures.push(
        `${proxy.contractName} ${proxy.label} runs ${live}, expected ${want}`
      );
    }
  }

  console.log("\n=== backfill ===");
  for (const registry of rollout.registries) {
    const plan = await buildBackfillPlan(networkName, registry.address);
    console.log(
      `  ${registry.label.padEnd(8)} ${plan.calls.length === 0 ? "complete" : `${plan.calls.length} outstanding`}`
    );
    for (const call of plan.calls) {
      failures.push(`backfill incomplete: ${describeCall(call)}`);
    }
  }
}

/**
 * Asserts the emitted HTML matches what the registry prescribes for the
 * dependency, which is the property the whole upgrade rests on.
 */
function checkHtml(
  html: string,
  dependency: string,
  details: {
    preferredCDN: string;
    loadAsModule: boolean;
    canvasTagType: number;
    projectScriptTagType: number;
    projectScriptSpecialType: string;
  }
): string[] {
  const problems: string[] = [];
  const name = dependencyName(dependency);

  // ---- project script wrapper ----
  const tagType = Number(details.projectScriptTagType);
  const wrappers: Record<number, string> = {
    [ProjectScriptTagType.ClassicScript]: "<script>",
    [ProjectScriptTagType.Module]: '<script type="module">',
    [ProjectScriptTagType.SpecialType]: `<script type='${details.projectScriptSpecialType}'>`,
  };
  const wrapper = wrappers[tagType];

  // @dev the project script is the *last* script the document opens: the token
  // data script and the gunzip shim both precede it, and the dependency script
  // sits between them. Searching from the front finds the token data script, so
  // every position here is resolved from the back.
  const scriptIndex = wrapper === undefined ? -1 : html.lastIndexOf(wrapper);

  if (tagType === ProjectScriptTagType.RawHtml) {
    if (html.includes(STYLE_RESET)) {
      problems.push("raw HTML document still carries the default style reset");
    }
    // A raw document brings its own script tags — Quine's is a complete HTML
    // document — so the assertion is that none of them wrap the document itself.
    if (/<script[^>]*>\s*(<!doctype|<html)/i.test(html)) {
      problems.push("raw HTML document is wrapped in a script tag");
    }
  } else if (scriptIndex === -1) {
    problems.push(`missing expected project script wrapper ${wrapper}`);
  } else {
    const lastOpened = Object.entries(wrappers)
      .map(([type, tag]) => ({
        type: Number(type),
        tag,
        at: html.lastIndexOf(tag),
      }))
      .filter((candidate) => candidate.at !== -1)
      .sort((a, b) => b.at - a.at)[0];
    if (lastOpened.type !== tagType) {
      problems.push(
        `project script is wrapped in ${lastOpened.tag}, registry asks for ${wrapper}`
      );
    }
  }

  // ---- canvas ----
  const canvasTagType = Number(details.canvasTagType);
  const canvas = `<canvas id='${name}-canvas'>`;
  const canvasIndex = html.indexOf(canvas);
  if (canvasTagType === CanvasTagType.NoCanvasTag) {
    if (canvasIndex !== -1) {
      problems.push(`emitted ${canvas} but the registry asks for no canvas`);
    }
  } else if (canvasIndex === -1) {
    problems.push(`missing ${canvas}`);
  } else if (scriptIndex !== -1) {
    const before = canvasIndex < scriptIndex;
    const wantBefore =
      canvasTagType === CanvasTagType.CanvasBeforeProjectScript;
    if (before !== wantBefore) {
      problems.push(
        `canvas is ${before ? "before" : "after"} the project script, ` +
          `registry asks for ${wantBefore ? "before" : "after"}`
      );
    }
  }

  // ---- ES module handling ----
  const importMap = `<script type="importmap">{"imports":{"${name}":"${details.preferredCDN}"}}`;
  const classicDependencyTag = `<script type="text/javascript" src="${details.preferredCDN}">`;
  if (details.loadAsModule) {
    if (!html.includes(importMap)) {
      problems.push("missing import map for a module dependency");
    }
    if (details.preferredCDN && html.includes(classicDependencyTag)) {
      problems.push(
        "module dependency is still loaded through a classic script tag"
      );
    }
    if (html.indexOf(importMap) > html.indexOf("</head>")) {
      problems.push("import map is not in <head>");
    }
  } else if (html.includes('<script type="importmap">')) {
    problems.push("emitted an import map for a non-module dependency");
  }

  return problems;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
