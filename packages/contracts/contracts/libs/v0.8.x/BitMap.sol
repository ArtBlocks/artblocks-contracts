// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @dev Library for using uint256 as a mapping to 256 bool values via a bit map.
 * This is useful for storing a large number of bool values in a compact way.
 * @dev This implementation is similar to OpenZeppelin's BitMaps library, but a
 * single uint256 is used directly in memory instead of operating within a
 * a mapping within a storage struct.
 * This design limits the number of indices to 256, but is more gas efficient
 * for use cases that fit within that limit. This is especially true for
 * operations that require many reads/writes, since SLOAD/STTORE can be managed
 * outside of the library.
 */
library BitMaps256 {
    function get(uint256 bitMap, uint8 index) internal pure returns (bool) {
        uint256 mask = 1 << (index & 0xff);
        return bitMap & mask != 0;
    }

    function set(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << (index & 0xff);
        return bitMap | mask;
    }

    function unset(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << (index & 0xff);
        return bitMap & ~mask;
    }

    function minBitSet(
        uint256 bitMap,
        uint8 startIndex
    ) internal pure returns (uint8 minIndex) {
        minIndex = startIndex;
        // TODO make this more efficient
        // @dev this is a linear search, worst case 256 iterations in memory
        while (minIndex < 256 && !get(bitMap, minIndex)) {
            minIndex++;
        }
    }
}
