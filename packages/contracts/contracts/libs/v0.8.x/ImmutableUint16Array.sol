// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {SSTORE2} from "./SSTORE2.sol"; // Import SSTORE2 library

/**
 * @title ImmutableUint16Array
 * @author Art Blocks Inc.
 * @notice This library is optimized to store immutable arrays of uint16 values much more efficiently than using native Solidity storage arrays.
 * It uses a single SSTORE2 contract to store the length + packed uint16 values
 * Allows overwriting the pointer to point to a new immutable array.
 */
library ImmutableUint16Array {
    /**
     * @notice Struct to store the SSTORE2 pointer to the packed uint16 array.
     * @dev dataPointer is the SSTORE2 pointer to the packed uint16 array. Assigned to address(0) if the array is empty.
     */
    struct Uint16Array {
        address dataPointer; // SSTORE2 pointer storing length + packed uint16 values
    }

    /**
     * @notice Stores a packed immutable uint16 array using a single SSTORE2 contract.
     * Allows overwriting the pointer to point to a new immutable array.
     * @dev Optimized for the case where the array is empty by assigning the dataPointer to address(0).
     * @param storageArray The storage reference to store the packed array.
     * @param values The array of strings to pack.
     */
    function store(
        Uint16Array storage storageArray,
        uint16[] memory values
    ) internal {
        uint256 arrayLength = values.length;
        // edge case - empty array
        if (arrayLength == 0) {
            storageArray.dataPointer = address(0);
            return;
        }
        // realistically will not overflow uint16, but check for security guarantees
        // @dev no coverage on else (difficulty of triggering)
        require(
            arrayLength <= type(uint16).max,
            "Total bytes length exceeds uint16 limit"
        );

        // compute total bytes length
        // @dev this is deterministic and can be pre-computed since it is a fixed size array
        uint256 totalBytesLength = arrayLength * 2; // 2 bytes per uint16

        // prepare the combined storage structure (length + packed uint16 values)
        // @dev 8 bytes for length, totalBytesLength bytes for uint16 values
        // over-allocate 32 bytes for memory safety
        // note: shorten length by 32 bytes at end of function before returning
        uint256 packedDataLength = 8 + totalBytesLength;
        bytes memory packedData = new bytes(packedDataLength + 0x20);
        uint256 ptr;

        // store the length of the values array in the first 8 bytes of the packedData
        assembly ("memory-safe") {
            ptr := add(packedData, 0x20) // pointer to first byte of packedData
            mstore(ptr, shl(192, arrayLength)) // left-align only 8 bytes in the 32-byte slot
            ptr := add(ptr, 8) // move pointer forward by 8 bytes
        }

        // pack the values efficiently, using assembly to compile 32 bytes at a time
        for (uint i = 0; i < arrayLength; i += 16) {
            // 16 indices per loop, 2 bytes per index, 32 bytes per loop
            // build the 32 bytes of the current value, 16 uint16 values per loop, left to right
            // handle end of array case
            uint256 maxIndex = i + 16 < arrayLength ? i + 16 : arrayLength;
            bytes32 chunk;
            for (uint j = 0; j < maxIndex; j++) {
                chunk |= bytes32(uint256(values[i + j])) << (240 - (j * 16));
            }
            // store the 32 bytes into the result
            assembly ("memory-safe") {
                // safe to write past end of final array - 32 bytes of buffer at end of array
                mstore(ptr, chunk) // store the 32 bytes into the result
                ptr := add(ptr, 0x20) // move the result pointer forward by 32 bytes
            }
        }

        // remove the buffer from the packedData bytes array length
        assembly ("memory-safe") {
            ptr := packedData
            mstore(ptr, packedDataLength)
        }

        // store the packed data in the SSTORE2 contract
        storageArray.dataPointer = SSTORE2.write(packedData);
    }

    /**
     * @notice Clears the storage array by setting the dataPointer to address(0).
     * @param storageArray The storage reference to clear.
     */
    function clear(Uint16Array storage storageArray) internal {
        storageArray.dataPointer = address(0);
    }

    function isEmpty(
        Uint16Array storage storageArray
    ) internal view returns (bool) {
        return storageArray.dataPointer == address(0);
    }

    /**
     * @notice Retrieves the total number of stored uint16 values from SSTORE2.
     * @param storageArray The storage reference containing packed values.
     * @return count The count of stored values.
     */
    function length(
        Uint16Array storage storageArray
    ) internal view returns (uint256 count) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            return 0;
        }

        // load the packed data from the SSTORE2 contract
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);
        // load the total length of the values array from the first 8 bytes of the SSTORE2 contract
        assembly ("memory-safe") {
            count := shr(192, mload(add(allData, 32))) // skip first 8 bytes (length of the actual bytes array we stored)
        }
    }

    /**
     * @notice Retrieves a single uint16 value from storage by index.
     * @param storageArray The storage reference containing packed values.
     * @param index The index of the value to retrieve.
     * @return result The retrieved value.
     */
    function get(
        Uint16Array storage storageArray,
        uint256 index
    ) internal view returns (uint16 result) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            revert("Index out of bounds");
        }
        // load the packed data from the SSTORE2 contract
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);
        // load the total length of the values array from the first 8 bytes of the SSTORE2 contract
        uint256 arrayLength;
        assembly ("memory-safe") {
            arrayLength := shr(192, mload(add(allData, 32))) // skip first 8 bytes (length of the actual bytes array we stored)
        }
        require(index < arrayLength, "Index out of bounds");

        // the location is deterministic and can be pre-computed since it is a fixed size array
        uint256 location = 32 + 8 + (index * 2); // 32 bytes for bytes array length, 8 bytes for overall array length, 2 bytes per index
        // load the value from the packed data
        assembly ("memory-safe") {
            result := shr(240, mload(add(allData, location))) // load the 2 bytes of the value from the packed data
        }
    }

    /**
     * @notice Retrieves all stored uint16 values in a single batch call.
     * @param storageArray The storage reference containing packed values.
     * @return results An array of all stored values.
     */
    function getAll(
        Uint16Array storage storageArray
    ) internal view returns (uint16[] memory results) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            return new uint16[](0);
        }
        // load the packed data from the SSTORE2 contract
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);
        // load the total length of the values array from the first 8 bytes of the SSTORE2 contract
        uint256 arrayLength;
        assembly ("memory-safe") {
            arrayLength := shr(192, mload(add(allData, 32))) // skip first 8 bytes (length of the actual bytes array we stored)
        }

        // for each value in the array, populate results
        results = new uint16[](arrayLength);

        // loop in assembly to access the packed data directly
        assembly ("memory-safe") {
            let ptr := add(allData, 40) // skip first 8 bytes + 32 bytes for bytes array length (length of the actual bytes array we stored)
            for {
                let i := 0
            } lt(i, arrayLength) {
                i := add(i, 1)
            } {
                // @dev in memory, uint16 values are not packed, but are abi-encoded, so we add mul i * 0x20 to get the offset of the value in the results array
                mstore(
                    add(results, add(mul(i, 0x20), 0x20)),
                    shr(240, mload(ptr))
                ) // store the 2 bytes of the value from the packed data into the results array
                ptr := add(ptr, 2) // move the pointer forward by 2 bytes for next iteration
            }
        }
    }
}
