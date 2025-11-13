// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title EnumerableSetUint16
 * @author Art Blocks Inc.
 * @notice Gas-optimized enumerable set library for uint16 values.
 * @dev This library efficiently packs uint16 values into shared uint256 storage slots,
 * storing up to 16 uint16 values per slot. This significantly reduces gas costs compared
 * to OpenZeppelin's EnumerableSet.UintSet which stores each value in its own slot.
 *
 * The library maintains:
 * - A packed array where each uint256 slot contains up to 16 uint16 values (stored as value+1)
 * - An index mapping for O(1) lookups (maps value -> packed position)
 *
 * Values are stored as (value + 1) to distinguish empty slots (0) from actual values.
 * This means the maximum storable value is 65534 (not 65535).
 *
 * Count is derived on-demand by examining the last slot to find the highest populated position.
 * This eliminates an SSTORE operation on every add/remove, significantly reducing gas costs.
 *
 * Interface is compatible with OpenZeppelin's EnumerableSet.UintSet, but specifically
 * for uint16 values.
 */
library EnumerableSetUint16 {
    /**
     * @dev Structure to hold the set data.
     *
     * Storage layout:
     * - _values: Array of uint256 where each element packs 16 uint16 values (stored as value+1)
     * - _indexesPacked: Packed mapping where each uint256 contains 16 positions (16 bits each)
     *
     * Position encoding: 16 bits per position = (slotIndex << 4) | offsetInSlot + 1
     * - Bits 0-11: slotIndex (supports up to 4096 slots = 65,536 values)
     * - Bits 12-15: offsetInSlot (0-15)
     * - +1 makes it 1-indexed so 0 means "not present"
     *
     * Packing in _indexesPacked:
     * - Key: value >> 4 (bucket index - groups of 16 values)
     * - Value: uint256 containing 16 packed 16-bit positions
     * - Position in bucket: value & 0xF (determines which 16-bit segment)
     */
    struct Uint16Set {
        // Array of packed uint256 slots, each containing up to 16 uint16 values (as value+1)
        uint256[] _values;
        // Packed mapping: each uint256 holds 16 positions (16 bits each) for 16 consecutive values
        // Bucket (value>>4) maps to uint256 with 16 positions at (value&0xF)*16 bits
        mapping(uint16 => uint256) _indexesPacked;
    }

    /**
     * @dev Add a value to a set. O(1).
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     * @param value The uint16 value to add. Must be < 65535 (max uint16 - 1).
     */
    function add(Uint16Set storage set, uint16 value) internal returns (bool) {
        require(
            value < type(uint16).max,
            "EnumerableSetUint16: value too large"
        );

        if (contains(set, value)) {
            return false;
        }

        uint256 count = length(set);

        // Calculate which slot and offset to use
        uint256 slotIndex = count >> 4; // count / 16
        uint256 offsetInSlot = count & 0xF; // count % 16

        // Ensure the slot exists
        if (slotIndex >= set._values.length) {
            set._values.push(0);
        }

        // Pack the value+1 into the slot at the correct offset
        // We store value+1 so that 0 represents an empty slot
        // Each uint16 occupies 16 bits, so shift by offsetInSlot * 16
        uint256 slot = set._values[slotIndex];
        uint256 mask = uint256(0xFFFF) << (offsetInSlot * 16);
        slot = (slot & ~mask) | (uint256(value + 1) << (offsetInSlot * 16));
        set._values[slotIndex] = slot;

        // Store the position (1-indexed) in packed format
        // Position encodes: ((slotIndex << 4) | offsetInSlot) + 1
        uint256 position = ((slotIndex << 4) | offsetInSlot) + 1;
        _setPackedIndex(set._indexesPacked, value, position);

        return true;
    }

    /**
     * @dev Removes a value from a set. O(1).
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(
        Uint16Set storage set,
        uint16 value
    ) internal returns (bool) {
        uint256 valueIndex = _getPackedIndex(set._indexesPacked, value);

        if (valueIndex == 0) {
            return false; // Value not in set
        }

        uint256 lastIndex = length(set) - 1;

        // Decode the position of the value to remove
        // Position is 1-indexed, so subtract 1 to get 0-indexed position
        uint256 valuePosition = valueIndex - 1;

        if (lastIndex != valuePosition) {
            // We need to move the last element to the position of the removed element
            uint256 lastSlotIndex = lastIndex >> 4;
            uint256 lastOffsetInSlot = lastIndex & 0xF;

            // Extract the last value (stored as value+1, so subtract 1)
            uint256 lastSlot = set._values[lastSlotIndex];
            uint16 lastValuePlusOne = uint16(
                (lastSlot >> (lastOffsetInSlot * 16)) & 0xFFFF
            );

            // Move last value to the removed value's position
            uint256 valueSlotIndex = valuePosition >> 4;
            uint256 valueOffsetInSlot = valuePosition & 0xF;
            uint256 mask = uint256(0xFFFF) << (valueOffsetInSlot * 16);
            set._values[valueSlotIndex] =
                (set._values[valueSlotIndex] & ~mask) |
                (uint256(lastValuePlusOne) << (valueOffsetInSlot * 16));

            // Update the moved value's index in packed format
            _setPackedIndex(
                set._indexesPacked,
                lastValuePlusOne - 1,
                valueIndex
            );
        }

        // Clear the last position
        {
            uint256 lastSlotIndex = lastIndex >> 4;
            uint256 lastOffsetInSlot = lastIndex & 0xF;
            uint256 mask = uint256(0xFFFF) << (lastOffsetInSlot * 16);
            set._values[lastSlotIndex] = set._values[lastSlotIndex] & ~mask;

            // If the last slot is now empty, pop it from the array
            if (set._values[lastSlotIndex] == 0) {
                set._values.pop();
            }
        }

        // Delete the removed value's packed index
        _setPackedIndex(set._indexesPacked, value, 0);

        return true;
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(
        Uint16Set storage set,
        uint16 value
    ) internal view returns (bool) {
        return _getPackedIndex(set._indexesPacked, value) != 0;
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     * Derives count by examining the last slot to find the highest populated position.
     */
    function length(Uint16Set storage set) internal view returns (uint256) {
        uint256 valuesLength = set._values.length;

        if (valuesLength == 0) {
            return 0;
        }

        // Get the last slot
        uint256 lastSlot = set._values[valuesLength - 1];

        // Find the highest non-zero 16-bit segment (right-most populated position)
        uint256 highestOffset = 0;
        for (uint256 i = 0; i < 16; i++) {
            uint256 segment = (lastSlot >> (i * 16)) & 0xFFFF;
            if (segment != 0) {
                highestOffset = i;
            }
        }

        // Calculate total length
        return ((valuesLength - 1) << 4) + highestOffset + 1;
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     * - `index` must be strictly less than {length}.
     */
    function at(
        Uint16Set storage set,
        uint256 index
    ) internal view returns (uint16) {
        require(
            index < length(set),
            "EnumerableSetUint16: index out of bounds"
        );

        uint256 slotIndex = index >> 4; // index / 16
        uint256 offsetInSlot = index & 0xF; // index % 16

        uint256 slot = set._values[slotIndex];
        uint256 valuePlusOne = (slot >> (offsetInSlot * 16)) & 0xFFFF;

        // Values are stored as value+1, so subtract 1 to get the actual value
        return uint16(valuePlusOne - 1);
    }

    /**
     * @dev Returns an array containing all values in the set. O(N).
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive.
     * This is designed to mostly be used by view accessors that are queried without any gas fees.
     * Developers should keep in mind that this function has an unbounded cost, and using it as part
     * of a state-changing function may render the function uncallable if the set grows to a point
     * where copying to memory consumes too much gas to fit in a block.
     */
    function values(
        Uint16Set storage set
    ) internal view returns (uint256[] memory) {
        uint256 count = length(set);
        uint256[] memory result = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            result[i] = at(set, i);
        }

        return result;
    }

    /**
     * @dev Internal helper to get a packed index for a value.
     * @param packed The packed index mapping.
     * @param value The uint16 value to look up.
     * @return The position (1-indexed, 0 means not present).
     */
    function _getPackedIndex(
        mapping(uint16 => uint256) storage packed,
        uint16 value
    ) private view returns (uint256) {
        uint16 bucketIndex = value >> 4; // value / 16
        uint256 posInBucket = value & 0xF; // value % 16

        uint256 bucket = packed[bucketIndex];
        return (bucket >> (posInBucket * 16)) & 0xFFFF;
    }

    /**
     * @dev Internal helper to set a packed index for a value.
     * @param packed The packed index mapping.
     * @param value The uint16 value to set.
     * @param position The position to store (1-indexed, 0 means remove).
     */
    function _setPackedIndex(
        mapping(uint16 => uint256) storage packed,
        uint16 value,
        uint256 position
    ) private {
        uint16 bucketIndex = value >> 4; // value / 16
        uint256 posInBucket = value & 0xF; // value % 16

        uint256 bucket = packed[bucketIndex];
        uint256 mask = uint256(0xFFFF) << (posInBucket * 16);
        bucket = (bucket & ~mask) | (position << (posInBucket * 16));
        packed[bucketIndex] = bucket;
    }
}
