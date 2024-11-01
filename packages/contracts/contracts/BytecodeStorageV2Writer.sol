// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.
import "./libs/v0.8.x/BytecodeStorageV2.sol";

/**
 * @title Art Blocks Storage Writer
 * @author Art Blocks Inc.
 * @notice A simple contract that with a single function that uses
 * the BytecodeStorageV1 library to write a string to bytecode storage.
 */
contract BytecodeStorageV2Writer {
    using BytecodeStorageWriter for bytes;
    using BytecodeStorageReader for string;

    event StorageContractCreated(address indexed storageContract);

    function _onlyNonEmptyString(string memory _string) internal pure {
        if (bytes(_string).length == 0) {
            revert("String must be non-empty");
        }
    }

    /**
     * @notice Write a string to bytecode storage.
     * @param _string The string to write to bytecode storage.
     * @dev This function emits an event with the address of the newly created
     * storage contract.
     */
    function writeStringToBytecodeStorage(string memory _string) public {
        address storageContract = BytecodeStorageWriter.writeToBytecode(
            _string
        );
        emit StorageContractCreated(storageContract);
    }

    /**
     * @notice Write a pre-compressed string to bytecode storage. The string
     * should be compressed using `getCompressed`. This function stores the string
     * in a compressed format on-chain. For reads, the compressed string is
     * decompressed on-chain, ensuring the original text is reconstructed without
     * external dependencies.
     * @param _compressedString Pre-compressed string to be stored.
     * Required to be non-empty, but no further validation is performed.
     * @dev This function emits an event with the address of the newly created
     * storage contract.
     */
    function writeCompressedStringToBytecodeStorage(
        bytes memory _compressedString
    ) public {
        address storageContract = BytecodeStorageWriter
            .writeToBytecodeCompressed(_compressedString);
        emit StorageContractCreated(storageContract);
    }

    /**
     * @notice Returns the compressed form of a string in bytes using solady LibZip's flz compress algorithm.
     * The bytes output from this function are intended to be used as input to `writeCompressedStringToBytecodeStorage`.
     * @param _string String to be compressed. Required to be a non-empty string, but no further validaton is performed.
     * @return bytes compressed bytes
     */
    function getCompressed(
        string memory _string
    ) external pure returns (bytes memory) {
        _onlyNonEmptyString(_string);
        return BytecodeStorageReader.getCompressed(_string);
    }
}
