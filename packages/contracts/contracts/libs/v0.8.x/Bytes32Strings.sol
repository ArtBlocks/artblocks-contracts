// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
// Inspired by: https://ethereum.stackexchange.com/a/123950/103422

pragma solidity ^0.8.0;

/**
 * @dev Operations on bytes32 data type, dealing with conversion to string.
 */
library Bytes32Strings {
    /**
     * @notice Intended to convert a `bytes32`-encoded string literal to `string`.
     * Trims zero padding to arrive at original string literal.
     */
    function toString(
        bytes32 source
    ) internal pure returns (string memory result) {
        uint8 length;
        while (source[length] != 0 && length < 32) {
            length++;
        }
        assembly {
            // free memory pointer
            result := mload(0x40)
            // update free memory pointer to new "memory end"
            // (offset is 64-bytes: 32 for length, 32 for data)
            mstore(0x40, add(result, 0x40))
            // store length in first 32-byte memory slot
            mstore(result, length)
            // write actual data in second 32-byte memory slot
            mstore(add(result, 0x20), source)
        }
    }

    /**
     * @notice Intended to check if a `bytes32`-encoded string contains a given
     * character with UTF-8 character code `utf8CharCode exactly `targetQty`
     * times. Does not support searching for multi-byte characters, only
     * characters with UTF-8 character codes < 0x80.
     */
    function containsExactCharacterQty(
        bytes32 source,
        uint8 utf8CharCode,
        uint8 targetQty
    ) internal pure returns (bool) {
        uint8 _occurrences;
        uint8 i;
        for (i; i < 32; ) {
            uint8 _charCode = uint8(source[i]);
            // if not a null byte, or a multi-byte UTF-8 character, check match
            if (_charCode != 0 && _charCode < 0x80) {
                if (_charCode == utf8CharCode) {
                    unchecked {
                        // no risk of overflow since max 32 iterations < max uin8=255
                        ++_occurrences;
                    }
                }
            }
            unchecked {
                // no risk of overflow since max 32 iterations < max uin8=255
                ++i;
            }
        }
        return _occurrences == targetQty;
    }

    /**
     * @notice Converts string to bytes32.
     * https://ethereum.stackexchange.com/a/9152
     * @param source string to be converted.
     * @return result bytes32 representation of string.
     * @dev If string is longer than 32 bytes, it truncates to the right.
     */
    function stringToBytes32(
        string memory source
    ) internal pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly ("memory-safe") {
            result := mload(add(source, 32))
        }
    }
}
