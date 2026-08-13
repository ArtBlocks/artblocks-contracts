// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Builder for Gnosis Safe Transaction Builder batch files.
 *
 * The output is uploaded to the Safe's Transaction Builder app, which re-encodes
 * each call from `contractMethod` + `contractInputsValues`. Leaving `data` null
 * means the app derives the calldata itself, so a reviewer reads argument values
 * rather than a hex blob.
 */

import { ethers } from "ethers";

export type SafeContractMethod = {
  inputs: { name: string; type: string; internalType?: string }[];
  name: string;
  payable: boolean;
};

export type SafeTransaction = {
  to: string;
  value: string;
  data: string | null;
  contractMethod: SafeContractMethod;
  contractInputsValues: Record<string, string>;
};

export type SafeBatchFile = {
  version: string;
  chainId: string;
  createdAt: number;
  meta: {
    name: string;
    description: string;
    txBuilderVersion: string;
    createdFromSafeAddress: string;
    createdFromOwnerAddress: string;
    checksum?: string;
  };
  transactions: SafeTransaction[];
};

/**
 * Deterministic serialization matching the Transaction Builder's own format.
 * Keys are sorted and the array of keys is emitted alongside the values, so the
 * checksum is stable regardless of property insertion order.
 */
function serializeJSONObject(json: unknown): string {
  if (Array.isArray(json)) {
    return `[${json.map((el) => serializeJSONObject(el)).join(",")}]`;
  }

  if (typeof json === "object" && json !== null) {
    let acc = "";
    const keys = Object.keys(json).sort();
    acc += `{${JSON.stringify(keys)}`;

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject(
        (json as Record<string, unknown>)[keys[i]]
      )},`;
    }

    return `${acc}}`;
  }

  return `${JSON.stringify(json === undefined ? null : json)}`;
}

function calculateChecksum(batchFile: SafeBatchFile): string {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta, name: null },
  });
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serialized));
}

export function buildSafeBatch(params: {
  chainId: number;
  safeAddress: string;
  name: string;
  description: string;
  transactions: SafeTransaction[];
}): SafeBatchFile {
  const withoutChecksum: SafeBatchFile = {
    version: "1.0",
    chainId: params.chainId.toString(),
    createdAt: Date.now(),
    meta: {
      name: params.name,
      description: params.description,
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: ethers.utils.getAddress(params.safeAddress),
      createdFromOwnerAddress: "",
    },
    transactions: params.transactions,
  };

  return {
    ...withoutChecksum,
    meta: {
      ...withoutChecksum.meta,
      checksum: calculateChecksum(withoutChecksum),
    },
  };
}

/** `ProxyAdmin.upgrade(TransparentUpgradeableProxy proxy, address implementation)` */
export const PROXY_ADMIN_UPGRADE_METHOD: SafeContractMethod = {
  inputs: [
    {
      name: "proxy",
      type: "address",
      internalType: "contract TransparentUpgradeableProxy",
    },
    { name: "implementation", type: "address", internalType: "address" },
  ],
  name: "upgrade",
  payable: false,
};

export function buildProxyAdminUpgradeTx(params: {
  proxyAdmin: string;
  proxy: string;
  implementation: string;
}): SafeTransaction {
  return {
    to: ethers.utils.getAddress(params.proxyAdmin),
    value: "0",
    data: null,
    contractMethod: PROXY_ADMIN_UPGRADE_METHOD,
    contractInputsValues: {
      proxy: ethers.utils.getAddress(params.proxy),
      implementation: ethers.utils.getAddress(params.implementation),
    },
  };
}
