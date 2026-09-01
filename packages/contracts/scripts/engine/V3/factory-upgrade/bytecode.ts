// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Comparing deployed runtime bytecode against a local build.
 *
 * The expectation is produced by `eth_call`-ing the initcode as a contract
 * creation, which returns exactly what a real deploy would store — with one
 * exception. A Solidity library with external functions is emitted with a
 * *call-protection preamble*:
 *
 *   PUSH20 <library's own address> ; ADDRESS ; EQ ; ...
 *
 * so that a direct CALL (rather than DELEGATECALL) reverts. The address is a
 * placeholder of 20 zero bytes in the artifact, and the library's constructor
 * patches in `address(this)` at deployment. A creation `eth_call` therefore
 * bakes in the phantom address the call executed at, and comparing it byte for
 * byte against the real deployment reports a mismatch for every correctly
 * deployed library.
 *
 * Everything after those 21 bytes is identical, so normalizing them away makes
 * the comparison exact for libraries and unchanged for everything else.
 */

/** `PUSH20` followed by the 20-byte zero placeholder, as emitted in artifacts. */
const CALL_PROTECTION_PLACEHOLDER = "73" + "0".repeat(40);
/** hex characters covering `PUSH20` + its 20-byte operand */
const PREAMBLE_HEX_LENGTH = 2 + 40;

/**
 * True if this artifact's runtime carries the library call-protection preamble.
 * @param artifactDeployedBytecode `deployedBytecode` as compiled, i.e. with the
 * self-address still zeroed.
 */
export function hasCallProtection(artifactDeployedBytecode: string): boolean {
  return artifactDeployedBytecode
    .toLowerCase()
    .startsWith(`0x${CALL_PROTECTION_PLACEHOLDER}`);
}

/** Zero the call-protection self-address so two deployments can be compared. */
function normalize(code: string): string {
  const body = code.toLowerCase().replace(/^0x/, "");
  return (
    "0x" + body.slice(0, 2) + "0".repeat(40) + body.slice(PREAMBLE_HEX_LENGTH)
  );
}

/**
 * Whether deployed runtime bytecode matches a locally built expectation.
 * @param artifactDeployedBytecode used only to detect a library; the comparison
 * itself is between `expected` and `deployed`.
 */
export function runtimeMatches(params: {
  expected: string;
  deployed: string;
  artifactDeployedBytecode: string;
}): boolean {
  const { expected, deployed, artifactDeployedBytecode } = params;
  if (hasCallProtection(artifactDeployedBytecode)) {
    return normalize(expected) === normalize(deployed);
  }
  return expected.toLowerCase() === deployed.toLowerCase();
}
