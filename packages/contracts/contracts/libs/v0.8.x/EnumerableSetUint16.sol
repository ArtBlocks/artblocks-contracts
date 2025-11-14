// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title EnumerableSetUint16
 * @author Art Blocks Inc.
 * @notice Gas-optimized enumerable set library for uint16 values with assembly optimizations.
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
 * Assembly is used extensively for:
 * - Efficient bit manipulation operations
 * - Optimized storage access patterns
 * - Reduced memory operations
 * - Binary search for finding highest offset
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
        uint256 slotIndex;
        uint256 offsetInSlot;

        assembly {
            // slotIndex = count >> 4 (count / 16)
            slotIndex := shr(4, count)
            // offsetInSlot = count & 0xF (count % 16)
            offsetInSlot := and(count, 0xF)
        }

        // Ensure the slot exists
        if (slotIndex >= set._values.length) {
            set._values.push(0);
        }

        // Pack the value+1 into the slot using assembly
        assembly {
            // Calculate storage slot for _values[slotIndex]
            mstore(0x00, set.slot)
            let valuesSlot := keccak256(0x00, 0x20)
            let targetSlot := add(valuesSlot, slotIndex)

            // Load current slot value
            let slot := sload(targetSlot)

            // Calculate shift amount: offsetInSlot * 16
            let shiftAmount := shl(4, offsetInSlot)

            // Create mask: 0xFFFF << shiftAmount
            let mask := shl(shiftAmount, 0xFFFF)

            // Clear the target position and insert value+1
            // slot = (slot & ~mask) | ((value + 1) << shiftAmount)
            slot := or(and(slot, not(mask)), shl(shiftAmount, add(value, 1)))

            // Store back
            sstore(targetSlot, slot)
        }

        // Store the position (1-indexed) in packed format
        // Position encodes: ((slotIndex << 4) | offsetInSlot) + 1
        uint256 position;
        assembly {
            position := add(or(shl(4, slotIndex), offsetInSlot), 1)
        }
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
        uint256 valuePosition = valueIndex - 1;

        // Calculate last slot position (used in both branches)
        uint256 lastSlotIndex;
        uint256 lastOffsetInSlot;
        assembly {
            lastSlotIndex := shr(4, lastIndex)
            lastOffsetInSlot := and(lastIndex, 0xF)
        }

        if (lastIndex != valuePosition) {
            uint256 lastValuePlusOne;

            assembly {
                // Load last value
                mstore(0x00, set.slot)
                let valuesSlot := keccak256(0x00, 0x20)
                let lastSlot := sload(add(valuesSlot, lastSlotIndex))

                // Extract last value: (lastSlot >> (lastOffsetInSlot * 16)) & 0xFFFF
                lastValuePlusOne := and(
                    shr(shl(4, lastOffsetInSlot), lastSlot),
                    0xFFFF
                )
            }

            // Move last value to the removed value's position
            uint256 valueSlotIndex;
            uint256 valueOffsetInSlot;

            assembly {
                valueSlotIndex := shr(4, valuePosition)
                valueOffsetInSlot := and(valuePosition, 0xF)

                // Calculate storage slot
                mstore(0x00, set.slot)
                let valuesSlot := keccak256(0x00, 0x20)
                let targetSlot := add(valuesSlot, valueSlotIndex)

                // Load current slot
                let slot := sload(targetSlot)

                // Calculate shift and mask
                let shiftAmount := shl(4, valueOffsetInSlot)
                let mask := shl(shiftAmount, 0xFFFF)

                // Update slot: (slot & ~mask) | (lastValuePlusOne << shiftAmount)
                slot := or(
                    and(slot, not(mask)),
                    shl(shiftAmount, lastValuePlusOne)
                )

                // Store back
                sstore(targetSlot, slot)
            }

            // Update the moved value's index
            _setPackedIndex(
                set._indexesPacked,
                uint16(lastValuePlusOne - 1),
                valueIndex
            );
        }

        // Clear the last position
        bool shouldPop;

        assembly {
            // Calculate storage slot
            mstore(0x00, set.slot)
            let valuesSlot := keccak256(0x00, 0x20)
            let targetSlot := add(valuesSlot, lastSlotIndex)

            // Load current slot
            let slot := sload(targetSlot)

            // Clear the position: slot & ~(0xFFFF << (lastOffsetInSlot * 16))
            let shiftAmount := shl(4, lastOffsetInSlot)
            let mask := shl(shiftAmount, 0xFFFF)
            slot := and(slot, not(mask))

            // Store back
            sstore(targetSlot, slot)

            // Check if we should pop: slot is zero
            shouldPop := iszero(slot)
        }

        // Pop the array if the last slot is now empty
        if (shouldPop && lastSlotIndex == set._values.length - 1) {
            set._values.pop();
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
     * @dev Returns the number of values in the set. O(1) amortized.
     * Uses binary search to find the highest populated position in the last slot.
     */
    function length(
        Uint16Set storage set
    ) internal view returns (uint256 result) {
        uint256 valuesLength = set._values.length;

        if (valuesLength == 0) {
            return 0;
        }

        uint256 lastSlot = set._values[valuesLength - 1];

        // Use binary search to find highest non-zero 16-bit segment
        uint256 highestOffset;
        assembly {
            let slot := lastSlot
            highestOffset := 0

            // Binary search for highest non-zero segment
            // Check upper half (bits 128-255)
            let upper := shr(128, slot)
            if gt(upper, 0) {
                highestOffset := 8
                slot := upper
            }

            // Check upper 4 positions of current 8-position range
            upper := shr(64, slot)
            if gt(upper, 0) {
                highestOffset := add(highestOffset, 4)
                slot := upper
            }

            // Check upper 2 positions of current 4-position range
            upper := shr(32, slot)
            if gt(upper, 0) {
                highestOffset := add(highestOffset, 2)
                slot := upper
            }

            // Check upper 1 position of current 2-position range
            upper := shr(16, slot)
            if gt(upper, 0) {
                highestOffset := add(highestOffset, 1)
            }
        }

        // Calculate total length: ((valuesLength - 1) * 16) + highestOffset + 1
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

        uint256 result;
        assembly {
            // slotIndex = index >> 4
            let slotIndex := shr(4, index)
            // offsetInSlot = index & 0xF
            let offsetInSlot := and(index, 0xF)

            // Load slot value
            mstore(0x00, set.slot)
            let valuesSlot := keccak256(0x00, 0x20)
            let slot := sload(add(valuesSlot, slotIndex))

            // Extract value: (slot >> (offsetInSlot * 16)) & 0xFFFF - 1
            result := sub(and(shr(shl(4, offsetInSlot), slot), 0xFFFF), 1)
        }

        return uint16(result);
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
     * @return position The position (1-indexed, 0 means not present).
     */
    function _getPackedIndex(
        mapping(uint16 => uint256) storage packed,
        uint16 value
    ) private view returns (uint256 position) {
        assembly {
            // bucketIndex = value >> 4
            let bucketIndex := shr(4, value)
            // posInBucket = value & 0xF
            let posInBucket := and(value, 0xF)

            // Calculate storage slot for packed[bucketIndex]
            mstore(0x00, bucketIndex)
            mstore(0x20, packed.slot)
            let bucketSlot := keccak256(0x00, 0x40)

            // Load bucket
            let bucket := sload(bucketSlot)

            // Extract position: (bucket >> (posInBucket * 16)) & 0xFFFF
            position := and(shr(shl(4, posInBucket), bucket), 0xFFFF)
        }
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
        assembly {
            // bucketIndex = value >> 4
            let bucketIndex := shr(4, value)
            // posInBucket = value & 0xF
            let posInBucket := and(value, 0xF)

            // Calculate storage slot for packed[bucketIndex]
            mstore(0x00, bucketIndex)
            mstore(0x20, packed.slot)
            let bucketSlot := keccak256(0x00, 0x40)

            // Load current bucket
            let bucket := sload(bucketSlot)

            // Calculate shift and mask
            let shiftAmount := shl(4, posInBucket)
            let mask := shl(shiftAmount, 0xFFFF)

            // Update bucket: (bucket & ~mask) | (position << shiftAmount)
            bucket := or(and(bucket, not(mask)), shl(shiftAmount, position))

            // Store back
            sstore(bucketSlot, bucket)
        }
    }
}
