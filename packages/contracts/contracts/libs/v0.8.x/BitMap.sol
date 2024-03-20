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
    /**
     * @notice Checks if the bit at a specific index in the bit map is set.
     * A bit is considered set if it is 1, and unset if it is 0.
     * @param bitMap BitMap to check.
     * @param index The index of the bit to check.
     * @return Indicating if the bit at the specified index is set, false otherwise.
     */
    function get(uint256 bitMap, uint8 index) internal pure returns (bool) {
        uint256 mask = 1 << index;
        return bitMap & mask != 0;
    }

    /**
     * @notice Sets the bit at a specific index in the bit map to 1.
     * This function creates a new bit map where the bit at the specified index is set,
     * leaving other bits unchanged.
     * @param bitMap The original BitMap.
     * @param index The index of the bit to set.
     * @return newBitMap The new bit map after setting the bit at the specified index.
     */
    function set(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << index;
        return bitMap | mask;
    }

    /**
     * @notice Unsets the bit at a specific index in the bit map, setting it to 0.
     * This function creates a new bit map where the bit at the specified index is unset,
     * leaving other bits unchanged.
     * @param bitMap The original BitMap.
     * @param index The index of the bit to unset.
     * @return newBitMap The new bit map after unsetting the bit at the specified index.
     */
    function unset(
        uint256 bitMap,
        uint8 index
    ) internal pure returns (uint256 newBitMap) {
        uint256 mask = 1 << index;
        return bitMap & ~mask;
    }

    /**
     * @notice Finds the index of the first bit that is set in the bit map
     * starting from a given index.
     * Returns (255, false) if no set bits were found.
     * @param bitMap BitMap to search
     * @param startIndex Index to start searching from, inclusive
     * @return minIndex Index of first set bit, or 255 if no bits were found
     * @return foundSetBit True if a set bit was found, false otherwise
     */
    function minBitSet(
        uint256 bitMap,
        uint8 startIndex
    ) internal pure returns (uint256 minIndex, bool foundSetBit) {
        // check if there's any set bit at or above startIndex
        if ((bitMap >> startIndex) == 0) {
            return (255, false);
        }
        minIndex = startIndex;
        // @dev this is a linear search, optimized to start only if there's a set bit at or above startIndex
        // worst case 255 iterations in memory
        while (minIndex < 255 && !get(bitMap, uint8(minIndex))) {
            minIndex++;
        }
        foundSetBit = get(bitMap, uint8(minIndex));
    }

    /**
     * @notice Finds the index of the highest bit that is set in the bit map
     * starting from a given index and counting down.
     * Returns (0, false) if no set bits were found.
     * @param bitMap BitMap to search
     * @param startIndex Index to start searching from, inclusive
     * @return maxIndex Index of last set bit, or 0 if no bits were found
     * @return foundSetBit True if a set bit was found, false otherwise
     */
    function maxBitSet(
        uint256 bitMap,
        uint8 startIndex
    ) internal pure returns (uint256 maxIndex, bool foundSetBit) {
        if ((bitMap << (255 - startIndex)) == 0) {
            return (0, false);
        }

        maxIndex = startIndex;
        // @dev this is a linear search, worst case 255 iterations in memory
        while (maxIndex > 0 && !get(bitMap, uint8(maxIndex))) {
            maxIndex--;
        }
        foundSetBit = get(bitMap, uint8(maxIndex));
    }
}
