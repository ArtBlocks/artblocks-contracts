// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Topology and backfill rules for the registry-driven rendering rollout.
 *
 * The rollout upgrades two proxies and writes a set of registry values between
 * them, in a fixed order. See
 * `deployments/generator/GenArt721GeneratorV0-registry-driven-rendering.md`.
 *
 * Only addresses are configured here. Everything else — ProxyAdmins, their
 * owners, the AdminACL superAdmin, and the backfill itself — is derived from
 * chain state at run time, so this file cannot drift out of sync with reality.
 */

// @dev the same factory and salt used for the previous generator upgrade, so
// implementations land at one address across every chain. See that config for why
// the salt must stay all-zero.
export {
  CREATE2_FACTORY,
  IMPLEMENTATION_SALT,
} from "../generator-upgrade/config";

export const REGISTRY_CONTRACT_NAME = "DependencyRegistryV0";
export const GENERATOR_CONTRACT_NAME = "GenArt721GeneratorV0";

export type LabelledProxy = {
  /** Environment label, used in file names and log output. */
  label: string;
  address: string;
};

export type RolloutEnvironment = {
  /** hardhat network name, as passed to `--network`. */
  network: string;
  chainId: number;
  explorer: string;
  /**
   * Generator proxies. The registry each one uses is read from its
   * `dependencyRegistry()` rather than configured, because the pairing is not
   * what the deployment records imply: on sepolia both generators read the dev
   * registry.
   */
  generators: LabelledProxy[];
  /**
   * Registries to upgrade that no generator reads. Listed explicitly so that
   * upgrading an unused registry is always a deliberate choice.
   */
  additionalRegistries: LabelledProxy[];
};

export const ROLLOUT_ENVIRONMENTS: RolloutEnvironment[] = [
  {
    network: "sepolia",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    generators: [
      { label: "dev", address: "0x705E55FCD5CB00eB727213aa777C914B814817Be" },
      {
        label: "staging",
        address: "0xdC862938cA0a2D8dcabe5733C23e54ac7aAFFF27",
      },
    ],
    additionalRegistries: [],
  },
  {
    network: "mainnet",
    chainId: 1,
    explorer: "https://etherscan.io",
    generators: [
      {
        label: "mainnet",
        address: "0x953D288708bB771F969FCfD9BA0819eF506Ac718",
      },
    ],
    additionalRegistries: [],
  },
];

export function getEnvironment(network: string): RolloutEnvironment {
  const environment = ROLLOUT_ENVIRONMENTS.find((e) => e.network === network);
  if (!environment) {
    throw new Error(
      `No generator/registry pair is deployed on "${network}". Supported: ` +
        ROLLOUT_ENVIRONMENTS.map((e) => e.network).join(", ")
    );
  }
  return environment;
}

// ---------------------------------------------------------------------------
// Backfill rules
// ---------------------------------------------------------------------------

export enum CanvasTagType {
  NoCanvasTag = 0,
  CanvasBeforeProjectScript = 1,
  CanvasAfterProjectScript = 2,
}

export enum ProjectScriptTagType {
  ClassicScript = 0,
  Module = 1,
  SpecialType = 2,
  RawHtml = 3,
}

/**
 * Dependency names the pre-upgrade generator matched on to emit a canvas. The
 * check was on the name only, so every version of these names got a canvas.
 */
const CANVAS_DEPENDENCY_NAMES = ["js", "babylon", "tone", "zdog"];

/** The pre-upgrade generator placed this dependency's canvas after the script. */
const CANVAS_AFTER_DEPENDENCY_NAME = "processing-js";

/**
 * Exact identifier the pre-upgrade generator matched to emit
 * `<script type='application/processing'>`. Unlike the canvas check, this one
 * included the version.
 */
const PROCESSING_NAME_AND_VERSION = "processing-js@1.4.6";
const PROCESSING_SPECIAL_TYPE = "application/processing";

/** The pre-upgrade generator injected this dependency's script as raw HTML. */
const RAW_HTML_NAME_AND_VERSION = "custom@na";

/**
 * Dependencies whose own script is an ES module. This is the only genuinely new
 * behavior in the rollout — everything else reproduces what the generator already
 * did — so it is stated explicitly rather than derived.
 *
 * A module is exposed to project scripts through an import map keyed on the
 * dependency name and pointing at `preferredCDN`, and the project script is
 * wrapped in `<script type="module">`. Both follow from the same fact, so they are
 * configured together.
 */
export const MODULE_DEPENDENCIES = ["three@0.167.0"];

export function dependencyName(nameAndVersion: string): string {
  const atIndex = nameAndVersion.indexOf("@");
  return atIndex === -1 ? nameAndVersion : nameAndVersion.slice(0, atIndex);
}

/** Canvas requirement the pre-upgrade generator applied to this dependency. */
export function deriveCanvasTagType(nameAndVersion: string): CanvasTagType {
  const name = dependencyName(nameAndVersion);
  if (name === CANVAS_AFTER_DEPENDENCY_NAME) {
    return CanvasTagType.CanvasAfterProjectScript;
  }
  if (CANVAS_DEPENDENCY_NAMES.includes(name)) {
    return CanvasTagType.CanvasBeforeProjectScript;
  }
  return CanvasTagType.NoCanvasTag;
}

/** Project script wrapper the pre-upgrade generator applied, plus ESM handling. */
export function deriveProjectScriptTagType(nameAndVersion: string): {
  tagType: ProjectScriptTagType;
  specialType: string;
} {
  if (nameAndVersion === PROCESSING_NAME_AND_VERSION) {
    return {
      tagType: ProjectScriptTagType.SpecialType,
      specialType: PROCESSING_SPECIAL_TYPE,
    };
  }
  if (nameAndVersion === RAW_HTML_NAME_AND_VERSION) {
    return { tagType: ProjectScriptTagType.RawHtml, specialType: "" };
  }
  if (MODULE_DEPENDENCIES.includes(nameAndVersion)) {
    return { tagType: ProjectScriptTagType.Module, specialType: "" };
  }
  return { tagType: ProjectScriptTagType.ClassicScript, specialType: "" };
}

export function deriveLoadAsModule(nameAndVersion: string): boolean {
  return MODULE_DEPENDENCIES.includes(nameAndVersion);
}

/**
 * Ways a project spells "I declare no dependency version". A project configured
 * with one of these means the `@na` dependency of the same name, and the
 * pre-upgrade generator treated it that way because it matched on the name
 * alone. Rendering is now driven by the registry record, and these strings have
 * none, so the projects are pointed at the dependency they already meant.
 */
const NO_VERSION_SPELLINGS = ["", "na", "n/a", "none", "null", "undefined"];

/**
 * The registered dependency a project declaring `declared` should be overridden
 * to, or null to leave it alone.
 *
 * Deliberately narrow: it only normalizes spellings of "no version", and only
 * when the matching `@na` dependency is actually registered. It never maps one
 * version onto another — `p5@1.11.11` is not registered on mainnet, but guessing
 * `p5@1.9.0` for it would silently swap the library a project loads.
 */
export function deriveDependencyOverride(
  declared: string,
  registered: Set<string>
): string | null {
  if (registered.has(declared)) return null;

  const atIndex = declared.indexOf("@");
  if (atIndex === -1) return null;
  const version = declared.slice(atIndex + 1).toLowerCase();
  if (!NO_VERSION_SPELLINGS.includes(version)) return null;

  const target = `${declared.slice(0, atIndex)}@na`;
  return registered.has(target) ? target : null;
}
