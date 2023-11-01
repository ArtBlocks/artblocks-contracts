// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface IPseudorandomAtomic {
    /**
     * @notice This function atomically returns a pseudorandom bytes32 value.
     * @param _entropy entropy to be included during the pseudorandom
     * generation process. An example of entropy might be the hash of a core
     * contract's address, and the ID of the token being generated.
     */
    function getPseudorandomAtomic(bytes32 _entropy) external returns (bytes32);
}
