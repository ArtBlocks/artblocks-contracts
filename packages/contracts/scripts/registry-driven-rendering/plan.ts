// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Derives the backfill for a registry by walking its dependencies and applying
 * the rules the pre-upgrade generator had hardcoded.
 *
 * The backfill is computed, never hand-listed. Every value except the ES module
 * settings reproduces a decision the deployed generator already makes, so a
 * dependency that is added to a network later, or a network with a different set
 * of dependencies, is handled without editing this tooling.
 */

import { ethers } from "hardhat";
import {
  CanvasTagType,
  ProjectScriptTagType,
  deriveCanvasTagType,
  deriveDependencyOverride,
  deriveLoadAsModule,
  deriveProjectScriptTagType,
} from "./config";
import { findUnregisteredProjects } from "./unregistered";

const REGISTRY_ABI = [
  "function getDependencyCount() view returns (uint256)",
  "function getDependencyNamesAndVersions() view returns (string[])",
  "function getDependencyDetailsV2(bytes32) view returns (tuple(string nameAndVersion, string licenseType, string preferredCDN, uint24 additionalCDNCount, string preferredRepository, uint24 additionalRepositoryCount, string dependencyWebsite, bool availableOnChain, uint24 scriptCount, bool loadAsModule, uint8 canvasTagType, uint8 projectScriptTagType, string projectScriptSpecialType))",
  // @dev legacy getter: reachable before the registry upgrade too, which is when
  // the override calls are checked for safety.
  "function getDependencyDetails(bytes32) view returns (string nameAndVersion, string licenseType, string preferredCDN, uint24 additionalCDNCount, string preferredRepository, uint24 additionalRepositoryCount, string dependencyWebsite, bool availableOnChain, uint24 scriptCount)",
  "function getDependencyNameAndVersionForProject(address, uint256) view returns (string)",
];

export type DesiredState = {
  nameAndVersion: string;
  nameAndVersionBytes: string;
  preferredCDN: string;
  canvasTagType: CanvasTagType;
  projectScriptTagType: ProjectScriptTagType;
  projectScriptSpecialType: string;
  loadAsModule: boolean;
};

export type BackfillCall =
  | {
      kind: "canvasTagType";
      nameAndVersion: string;
      nameAndVersionBytes: string;
      canvasTagType: CanvasTagType;
    }
  | {
      kind: "loadAsModule";
      nameAndVersion: string;
      nameAndVersionBytes: string;
      loadAsModule: boolean;
    }
  | {
      kind: "projectScriptTagType";
      nameAndVersion: string;
      nameAndVersionBytes: string;
      projectScriptTagType: ProjectScriptTagType;
      projectScriptSpecialType: string;
    }
  | {
      kind: "projectDependencyOverride";
      core: string;
      projectId: number;
      /** The unregistered string the project declares today. */
      declared: string;
      /** The registered dependency it is pointed at. */
      nameAndVersion: string;
      nameAndVersionBytes: string;
    };

export type BackfillPlan = {
  /** True once the registry implementation exposes the new fields. */
  registryUpgraded: boolean;
  dependencies: DesiredState[];
  /** Calls still needed. Empty once the backfill has been applied. */
  calls: BackfillCall[];
  /** Dependencies whose desired state is entirely default, so need no calls. */
  unchangedCount: number;
};

export async function buildBackfillPlan(
  networkName: string,
  registryAddress: string
): Promise<BackfillPlan> {
  const registry = new ethers.Contract(
    registryAddress,
    REGISTRY_ABI,
    ethers.provider
  );

  const namesAndVersions: string[] =
    await registry.getDependencyNamesAndVersions();

  const dependencies: DesiredState[] = [];
  const calls: BackfillCall[] = [];
  let registryUpgraded = true;
  let unchangedCount = 0;

  for (const nameAndVersion of namesAndVersions) {
    const nameAndVersionBytes =
      ethers.utils.formatBytes32String(nameAndVersion);
    const canvasTagType = deriveCanvasTagType(nameAndVersion);
    const { tagType, specialType } = deriveProjectScriptTagType(nameAndVersion);
    const loadAsModule = deriveLoadAsModule(nameAndVersion);

    // Reading the new fields is also how we detect whether the registry has been
    // upgraded yet; the legacy implementation has no such function.
    let current: {
      preferredCDN: string;
      canvasTagType: number;
      projectScriptTagType: number;
      projectScriptSpecialType: string;
      loadAsModule: boolean;
    } | null = null;
    try {
      const details = await registry.getDependencyDetailsV2(
        nameAndVersionBytes
      );
      current = {
        preferredCDN: details.preferredCDN,
        canvasTagType: details.canvasTagType,
        projectScriptTagType: details.projectScriptTagType,
        projectScriptSpecialType: details.projectScriptSpecialType,
        loadAsModule: details.loadAsModule,
      };
    } catch {
      registryUpgraded = false;
    }

    dependencies.push({
      nameAndVersion,
      nameAndVersionBytes,
      preferredCDN: current?.preferredCDN ?? "",
      canvasTagType,
      projectScriptTagType: tagType,
      projectScriptSpecialType: specialType,
      loadAsModule,
    });

    const isDefault =
      canvasTagType === CanvasTagType.NoCanvasTag &&
      tagType === ProjectScriptTagType.ClassicScript &&
      !loadAsModule;

    // Before the registry is upgraded every non-default value is outstanding.
    // After it is, only the values that differ from what is stored are.
    if (canvasTagType !== (current?.canvasTagType ?? CanvasTagType.NoCanvasTag)) {
      calls.push({
        kind: "canvasTagType",
        nameAndVersion,
        nameAndVersionBytes,
        canvasTagType,
      });
    }
    if (loadAsModule !== (current?.loadAsModule ?? false)) {
      calls.push({
        kind: "loadAsModule",
        nameAndVersion,
        nameAndVersionBytes,
        loadAsModule,
      });
    }
    if (
      tagType !==
        (current?.projectScriptTagType ?? ProjectScriptTagType.ClassicScript) ||
      specialType !== (current?.projectScriptSpecialType ?? "")
    ) {
      calls.push({
        kind: "projectScriptTagType",
        nameAndVersion,
        nameAndVersionBytes,
        projectScriptTagType: tagType,
        projectScriptSpecialType: specialType,
      });
    }

    if (isDefault) {
      unchangedCount++;
    }
  }

  calls.push(
    ...(await deriveOverrideCalls(
      registry,
      networkName,
      registryAddress,
      new Set(namesAndVersions)
    ))
  );

  return { registryUpgraded, dependencies, calls, unchangedCount };
}

/**
 * Points projects declaring an unregistered script type at the dependency they
 * mean, so registry-driven rendering reaches them.
 *
 * These belong in the backfill rather than in a step of their own: they are
 * required before the generator upgrade for the same reason every other call is,
 * and putting them here means the ordering guard and the verification both cover
 * them without knowing they exist.
 */
async function deriveOverrideCalls(
  registry: ethers.Contract,
  networkName: string,
  registryAddress: string,
  registered: Set<string>
): Promise<BackfillCall[]> {
  const calls: BackfillCall[] = [];
  const projects = await findUnregisteredProjects(networkName, registryAddress);
  const checkedTargets = new Set<string>();

  for (const project of projects) {
    const target = deriveDependencyOverride(project.declared, registered);
    if (target === null) continue;

    // An override takes effect immediately, while the pre-upgrade generator is
    // still live, so the target must not pull in a script the project is not
    // already loading. `@na` dependencies are placeholders with neither a CDN nor
    // on-chain scripts; anything else is a configuration change in disguise.
    if (!checkedTargets.has(target)) {
      const details = await registry.getDependencyDetails(
        ethers.utils.formatBytes32String(target)
      );
      if (details.preferredCDN !== "" || details.availableOnChain) {
        throw new Error(
          `Refusing to override projects onto ${target}: it has a preferred CDN ` +
            `or on-chain scripts, so the override would change what those ` +
            `projects load rather than only how they are rendered.`
        );
      }
      checkedTargets.add(target);
    }

    // Idempotent: the getter returns the override once it is set.
    const resolved = await registry.getDependencyNameAndVersionForProject(
      project.core,
      project.projectId
    );
    if (resolved === target) continue;

    calls.push({
      kind: "projectDependencyOverride",
      core: project.core,
      projectId: project.projectId,
      declared: project.declared,
      nameAndVersion: target,
      nameAndVersionBytes: ethers.utils.formatBytes32String(target),
    });
  }

  return calls;
}

export function describeCall(call: BackfillCall): string {
  switch (call.kind) {
    case "canvasTagType":
      return `updateDependencyCanvasTagType(${call.nameAndVersion}, ${CanvasTagType[call.canvasTagType]})`;
    case "loadAsModule":
      return `updateDependencyLoadAsModule(${call.nameAndVersion}, ${call.loadAsModule})`;
    case "projectScriptTagType":
      return (
        `updateDependencyProjectScriptTagType(${call.nameAndVersion}, ` +
        `${ProjectScriptTagType[call.projectScriptTagType]}` +
        `${call.projectScriptSpecialType ? `, "${call.projectScriptSpecialType}"` : ""})`
      );
    case "projectDependencyOverride":
      return (
        `addProjectDependencyOverride(${call.core} #${call.projectId}, ` +
        `${call.nameAndVersion})  — declares "${call.declared}"`
      );
  }
}
