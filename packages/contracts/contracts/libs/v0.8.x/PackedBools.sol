// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @dev Library for packing multiple boolean values into a single uint256.
 * This is useful for storing a large number of bool values in a more compact
 * way than solidify's native bool type, which uses 8 bytes per bool.
 *
 * The implementation is similar to a BitMap, but function names are more
 * descriptive for packing and unpacking multiple bools.
 *
 * Note that the library may still be used in cases where less than 256 bools
 * are needed to be packed. For example, if <= 8 bools are needed, casting may
 * be used outside of the library for compatibility with any size uint.
 */
library PackedBools {
    function getBool(
        uint256 packedBool,
        uint8 index
    ) internal pure returns (bool) {
        uint256 mask = 1 << index;
        return packedBool & mask != 0;
    }

    function setBoolTrue(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << index;
        return bitMap | mask;
    }

    function setBoolFalse(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << index;
        return bitMap & ~mask;
    }
}
