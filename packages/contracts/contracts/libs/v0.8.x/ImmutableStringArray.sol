// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {SSTORE2} from "./SSTORE2.sol"; // Import SSTORE2 library

/**
 * @title ImmutableStringArray
 * @author Art Blocks Inc.
 * @notice This library is optimized to store immutable arrays of strings much more efficiently than using native Solidity storage arrays.
 * It uses a single SSTORE2 contract to store the length + packed offsets + packed string data.
 * Allows overwriting the pointer to point to a new immutable array.
 */
library ImmutableStringArray {
    /**
     * @notice Struct to store the SSTORE2 pointer to the packed string array.
     * @dev dataPointer is the SSTORE2 pointer to the packed string array. Assigned to address(0) if the array is empty.
     */
    struct StringArray {
        address dataPointer; // SSTORE2 pointer storing length + packed offsets + packed string data
    }

    /**
     * @notice Stores a packed immutable string array using a single SSTORE2 contract.
     * Allows overwriting the pointer to point to a new immutable array.
     * @dev Optimized for the case where the array is empty by assigning the dataPointer to address(0).
     * @param storageArray The storage reference to store the packed array.
     * @param strings The array of strings to pack.
     */
    function store(
        StringArray storage storageArray,
        string[] memory strings
    ) internal {
        uint256 arrayLength = strings.length;
        // edge case - empty array
        if (arrayLength == 0) {
            storageArray.dataPointer = address(0);
            return;
        }

        uint64[] memory offsets = new uint64[](arrayLength);

        // compute total bytes length and offsets (ensuring no overflow)
        uint256 totalStringBytesLength;
        for (uint256 i = 0; i < arrayLength; i++) {
            offsets[i] = uint64(totalStringBytesLength);
            totalStringBytesLength += bytes(strings[i]).length;
        }
        // realistically will not overflow uint64, but check for security guarantees
        // @dev no coverage on else (difficulty of triggering)
        require(
            totalStringBytesLength <= type(uint64).max,
            "Offset exceeds uint64 limit"
        );

        // prepare the combined storage structure (length + packed offsets + packed strings)
        // @dev 8 bytes for length, 8 bytes per offset, totalStringBytesLength bytes for strings
        // over-allocate 32 bytes for memory safety
        // note: shorten length by 32 bytes at end of function before returning
        uint256 packedDataLength = 8 +
            (arrayLength * 8) +
            totalStringBytesLength;
        bytes memory packedData = new bytes(packedDataLength + 0x20);
        uint256 ptr;

        // store the length of the strings array in the first 8 bytes of the packedData
        assembly ("memory-safe") {
            ptr := add(packedData, 0x20) // pointer to first byte of packedData
            mstore(ptr, shl(192, arrayLength)) // left-align only 8 bytes in the 32-byte slot
            ptr := add(ptr, 8) // move pointer forward by 8 bytes
        }

        // store offsets in packed `uint64` format
        for (uint256 i = 0; i < arrayLength; i++) {
            uint256 offset = offsets[i];
            assembly ("memory-safe") {
                mstore(ptr, shl(192, offset))
                // move pointer ahead 8 bytes for uint64
                ptr := add(ptr, 8)
            }
        }

        // pack the strings efficiently, using assembly to copy 32 bytes at a time
        for (uint i = 0; i < arrayLength; i++) {
            bytes memory currentString = bytes(strings[i]);
            uint currentLength = currentString.length;
            uint currentPtr;

            assembly ("memory-safe") {
                currentPtr := add(currentString, 0x20) // start of current string's data
            }

            // copy the full 32-byte chunks
            uint chunks = currentLength / 32;
            uint remainder = currentLength % 32;
            // store the full 32 byte chunks
            for (uint j = 0; j < chunks; j++) {
                assembly ("memory-safe") {
                    let chunk := mload(currentPtr) // load 32 bytes of the current string
                    mstore(ptr, chunk) // store the 32 bytes into the result
                    ptr := add(ptr, 0x20) // move the result pointer forward by 32 bytes
                    currentPtr := add(currentPtr, 0x20) // move the current string pointer forward by 32 bytes
                }
            }
            // store any partial chunks
            if (remainder > 0) {
                bytes32 chunk;
                assembly ("memory-safe") {
                    chunk := mload(currentPtr) // load full 32-byte word
                    // safe to write past end of final array - 32 bytes of buffer at end of array
                    mstore(ptr, chunk) // store the final chunk's remaining bytes
                    ptr := add(ptr, remainder) // move the result pointer forward by the remainder length for next iteration
                }
            }
        }

        // remove the buffer from the packedData bytes array length
        assembly ("memory-safe") {
            ptr := packedData
            mstore(ptr, packedDataLength)
        }

        // Store all packed data in a SSTORE2 contract, store result in storage
        storageArray.dataPointer = SSTORE2.write(packedData);
    }

    /**
     * @notice Retrieves the total number of stored strings from SSTORE2.
     * @param storageArray The storage reference containing packed strings.
     * @return count The count of stored strings.
     */
    function length(
        StringArray storage storageArray
    ) internal view returns (uint256 count) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            return 0;
        }

        // @dev this could be more efficient by only reading the first 8 bytes of the SSTORE2 contract
        // but prefer to keep simple
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);

        assembly ("memory-safe") {
            count := shr(192, mload(add(allData, 32)))
        }
    }

    /**
     * @notice Retrieves a single string from storage by index.
     * @param storageArray The storage reference containing packed strings.
     * @param index The index of the string to retrieve.
     * @return result The retrieved string.
     */
    function get(
        StringArray storage storageArray,
        uint256 index
    ) internal view returns (string memory result) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            revert("Index out of bounds");
        }
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);
        uint256 offsetsStart;
        uint64 start;
        uint64 end;
        // load the total length of the strings array from the first 8 bytes of the SSTORE2 contract
        uint256 arrayLength;
        assembly ("memory-safe") {
            arrayLength := shr(192, mload(add(allData, 32)))
        }

        require(index < arrayLength, "Index out of bounds");
        if (index + 1 == arrayLength) {
            uint256 allDataLength = allData.length;
            assembly ("memory-safe") {
                offsetsStart := add(allData, 40) // skipping first 8 bytes (length)
                start := shr(192, mload(add(offsetsStart, mul(index, 8)))) // load offsets[index] as uint64
                end := sub(
                    allDataLength,
                    add(8, mul(arrayLength, 8)) // subtract 8 bytes for overall array length, and 8*length for the offsets section
                )
            }
        } else {
            assembly ("memory-safe") {
                offsetsStart := add(allData, 40) // skipping first 8 bytes (length)
                start := shr(192, mload(add(offsetsStart, mul(index, 8)))) // load offsets[index] as uint64
                end := shr(192, mload(add(offsetsStart, mul(add(index, 1), 8)))) // load offsets[index + 1]
            }
        }

        uint256 strLength = end - start;
        // over-allocate 32 bytes for memory safety
        bytes memory strBytes = new bytes(strLength + 32);
        uint256 ptr;
        assembly ("memory-safe") {
            ptr := add(strBytes, 0x20) // pointer to first byte of strBytes
        }

        // efficiently copy 32 bytes at a time from allData to strBytes
        for (uint256 i = 0; i < strLength; i += 32) {
            // offset = 32 bytes for length + 8 bytes for overall array length + 8 bytes per offset * length of array + start of string + i
            uint256 offset = 32 + 8 + (arrayLength * 8) + start + i;
            assembly ("memory-safe") {
                let chunk := mload(add(allData, offset)) // load 32 bytes of the current string
                mstore(ptr, chunk) // store the 32 bytes into the result (buffer keeps this memory safe)
                ptr := add(ptr, 0x20) // move the result pointer forward by 32 bytes
            }
        }

        // remove the buffer length from the strBytes bytes array length
        assembly ("memory-safe") {
            ptr := strBytes
            mstore(ptr, strLength)
        }
        result = string(strBytes);
    }

    /**
     * @notice Retrieves all stored strings in a single batch call.
     * @param storageArray The storage reference containing packed strings.
     * @return results An array of all stored strings.
     */
    function getAll(
        StringArray storage storageArray
    ) internal view returns (string[] memory results) {
        // edge case - unassigned dataPointer or empty array
        if (storageArray.dataPointer == address(0)) {
            return new string[](0);
        }
        // load the packed data from the SSTORE2 contract
        bytes memory allData = SSTORE2.read(storageArray.dataPointer);
        // load the total length of the strings array from the first 8 bytes of the SSTORE2 contract
        uint256 arrayLength;
        assembly ("memory-safe") {
            arrayLength := shr(192, mload(add(allData, 32)))
        }

        // for each string in the array, populate results
        results = new string[](arrayLength);

        for (uint256 index = 0; index < arrayLength; index++) {
            // @dev start and end are calculated for each index for code simplicity/code re-use from get() function
            uint256 offsetsStart;
            uint64 start;
            uint64 end;

            if (index + 1 == arrayLength) {
                uint256 allDataLength = allData.length;
                assembly ("memory-safe") {
                    offsetsStart := add(allData, 40) // Skipping first 8 bytes (length)
                    start := shr(192, mload(add(offsetsStart, mul(index, 8)))) // Load offsets[index] as uint64
                    end := sub(
                        allDataLength,
                        add(8, mul(arrayLength, 8)) // subtract 8 bytes for overall array length, and 8*length for the offsets section
                    )
                }
            } else {
                assembly ("memory-safe") {
                    offsetsStart := add(allData, 40) // Skipping first 8 bytes (length)
                    start := shr(192, mload(add(offsetsStart, mul(index, 8)))) // Load offsets[index] as uint64
                    end := shr(
                        192,
                        mload(add(offsetsStart, mul(add(index, 1), 8)))
                    ) // Load offsets[index + 1]
                }
            }

            uint256 strLength = end - start;
            // over-allocate 32 bytes for memory safety
            bytes memory strBytes = new bytes(strLength + 32);
            uint256 ptr;
            assembly ("memory-safe") {
                ptr := add(strBytes, 0x20) // pointer to first byte of strBytes
            }

            // efficiently copy 32 bytes at a time from allData to strBytes
            for (uint256 i = 0; i < strLength; i += 32) {
                // offset = 32 bytes for length + 8 bytes for overall array length + 8 bytes per offset * length of array + start of string + i
                uint256 offset = 32 + 8 + (arrayLength * 8) + start + i;
                assembly ("memory-safe") {
                    let chunk := mload(add(allData, offset)) // Load 32 bytes of the current string
                    mstore(ptr, chunk) // Store the 32 bytes into the result (buffer keeps this memory safe)
                    ptr := add(ptr, 0x20) // Move the result pointer forward by 32 bytes
                }
            }

            // remove the buffer length from the strBytes bytes array length
            assembly ("memory-safe") {
                ptr := strBytes
                mstore(ptr, strLength)
            }

            // store the string in the results array
            results[index] = string(strBytes);
        }

        // results is returned by reference, so no need for explicit return
    }
}
