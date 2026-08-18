// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Reads the live ownership topology of a proxy pair.
 *
 * Nothing about who controls what is configured; it is all read from chain state
 * so that a rotated Safe or a re-pointed AdminACL surfaces immediately rather
 * than producing a batch that reverts on execution.
 */

import { ethers } from "hardhat";
import { LabelledProxy } from "./config";

const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

const OWNABLE_ABI = ["function owner() view returns (address)"];
const REGISTRY_ABI = [
  "function adminACLContract() view returns (address)",
  "function owner() view returns (address)",
];
const ADMIN_ACL_ABI = ["function superAdmin() view returns (address)"];

function addressFromSlot(raw: string): string {
  return ethers.utils.getAddress("0x" + raw.slice(-40));
}

export async function readImplementation(proxy: string): Promise<string> {
  return addressFromSlot(
    await ethers.provider.getStorageAt(proxy, IMPLEMENTATION_SLOT)
  );
}

export async function readProxyAdmin(proxy: string): Promise<string> {
  return addressFromSlot(await ethers.provider.getStorageAt(proxy, ADMIN_SLOT));
}

export async function isContract(address: string): Promise<boolean> {
  return (await ethers.provider.getCode(address)) !== "0x";
}

export type SafeInfo = { threshold: number; owners: number };

/**
 * Safe threshold and owner count, or null if the address is not a Safe. Used to
 * describe a signer in log output rather than to gate anything.
 */
export async function readSafeInfo(address: string): Promise<SafeInfo | null> {
  const safe = new ethers.Contract(
    address,
    [
      "function getThreshold() view returns (uint256)",
      "function getOwners() view returns (address[])",
    ],
    ethers.provider
  );
  try {
    const [threshold, owners] = await Promise.all([
      safe.getThreshold(),
      safe.getOwners(),
    ]);
    return { threshold: threshold.toNumber(), owners: owners.length };
  } catch {
    return null;
  }
}

export function describeSigner(
  address: string,
  isContractAddress: boolean,
  safe: SafeInfo | null
): string {
  if (safe) {
    return `${address} (Safe ${safe.threshold}-of-${safe.owners})`;
  }
  return `${address} (${isContractAddress ? "contract, not a Safe" : "EOA"})`;
}

export type ProxyOwnership = {
  proxy: string;
  implementation: string;
  proxyAdmin: string;
  /** Owner of the ProxyAdmin — the account that must send `upgrade`. */
  owner: string;
  ownerIsContract: boolean;
  ownerSafe: SafeInfo | null;
};

export async function readProxyOwnership(
  proxy: string
): Promise<ProxyOwnership> {
  const proxyAdmin = await readProxyAdmin(proxy);
  const rawOwner = await new ethers.Contract(
    proxyAdmin,
    OWNABLE_ABI,
    ethers.provider
  ).owner();
  const owner = ethers.utils.getAddress(rawOwner);
  return {
    proxy: ethers.utils.getAddress(proxy),
    implementation: await readImplementation(proxy),
    proxyAdmin,
    owner,
    ownerIsContract: await isContract(owner),
    ownerSafe: await readSafeInfo(owner),
  };
}

export type RegistryAdmin = {
  adminACL: string;
  /** The account that must send the backfill transactions. */
  superAdmin: string;
  superAdminIsContract: boolean;
  superAdminSafe: SafeInfo | null;
};

export async function readRegistryAdmin(
  registry: string
): Promise<RegistryAdmin> {
  const adminACL = await new ethers.Contract(
    registry,
    REGISTRY_ABI,
    ethers.provider
  ).adminACLContract();
  const rawSuperAdmin = await new ethers.Contract(
    adminACL,
    ADMIN_ACL_ABI,
    ethers.provider
  ).superAdmin();
  const superAdmin = ethers.utils.getAddress(rawSuperAdmin);
  return {
    adminACL: ethers.utils.getAddress(adminACL),
    superAdmin,
    superAdminIsContract: await isContract(superAdmin),
    superAdminSafe: await readSafeInfo(superAdmin),
  };
}

/**
 * The registry a generator actually reads from. Asserted against config rather
 * than assumed, so a dev/staging mix-up cannot produce a batch that backfills one
 * registry while upgrading a generator pointed at another.
 */
export async function readGeneratorRegistry(
  generator: string
): Promise<string> {
  const value = await new ethers.Contract(
    generator,
    ["function dependencyRegistry() view returns (address)"],
    ethers.provider
  ).dependencyRegistry();
  return ethers.utils.getAddress(value);
}

export type ResolvedGenerator = LabelledProxy & { registry: string };

export type ResolvedRollout = {
  generators: ResolvedGenerator[];
  /**
   * Every distinct registry to upgrade and backfill, with the generator labels
   * that read it. Deduplicated, because two generators can share one registry.
   */
  registries: { label: string; address: string; readBy: string[] }[];
};

/**
 * Resolves which registries a network's rollout actually touches by asking each
 * generator which registry it reads.
 */
export async function resolveRollout(environment: {
  generators: LabelledProxy[];
  additionalRegistries: LabelledProxy[];
}): Promise<ResolvedRollout> {
  const generators: ResolvedGenerator[] = [];
  for (const generator of environment.generators) {
    generators.push({
      ...generator,
      address: ethers.utils.getAddress(generator.address),
      registry: await readGeneratorRegistry(generator.address),
    });
  }

  const byAddress = new Map<string, { label: string; readBy: string[] }>();
  for (const generator of generators) {
    const existing = byAddress.get(generator.registry);
    if (existing) {
      existing.readBy.push(generator.label);
    } else {
      byAddress.set(generator.registry, {
        label: generator.label,
        readBy: [generator.label],
      });
    }
  }
  for (const registry of environment.additionalRegistries) {
    const address = ethers.utils.getAddress(registry.address);
    if (!byAddress.has(address)) {
      byAddress.set(address, { label: registry.label, readBy: [] });
    }
  }

  return {
    generators,
    registries: Array.from(byAddress.entries()).map(([address, meta]) => ({
      address,
      label: meta.label,
      readBy: meta.readBy,
    })),
  };
}
