// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";

const ERROR_STRING_SELECTOR = "0x08c379a0";
const PANIC_SELECTOR = "0x4e487b71";

/**
 * A simulated call that actually fails when the call reverts.
 *
 * `hre.ethers.provider.call` resolves with the raw revert data rather than
 * rejecting, so a reverting call is indistinguishable from a successful one by
 * its return value alone. Going through the underlying EIP-1193 provider
 * restores the rejection, and the returned data is checked as well so a revert
 * can never be mistaken for success.
 */
export async function ethCallOrThrow(tx: {
  from?: string;
  /** Omitted for a contract-creation call, which returns the runtime bytecode. */
  to?: string;
  data: string;
}): Promise<string> {
  let result: string;
  try {
    result = await (ethers.provider as any).send("eth_call", [tx, "latest"]);
  } catch (e: any) {
    throw new Error(
      `eth_call reverted (from ${tx.from ?? "default"} to ${tx.to ?? "<create>"}): ` +
        `${e?.data?.message ?? e?.message ?? e}`
    );
  }

  if (typeof result === "string" && result.startsWith(ERROR_STRING_SELECTOR)) {
    const [reason] = ethers.utils.defaultAbiCoder.decode(
      ["string"],
      "0x" + result.slice(10)
    );
    throw new Error(
      `eth_call reverted (from ${tx.from ?? "default"} to ${
        tx.to ?? "<create>"
      }): ${reason}`
    );
  }
  if (typeof result === "string" && result.startsWith(PANIC_SELECTOR)) {
    throw new Error(
      `eth_call panicked (from ${tx.from ?? "default"} to ${
        tx.to ?? "<create>"
      }): ${result}`
    );
  }

  return result;
}
