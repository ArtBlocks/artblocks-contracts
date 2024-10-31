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
     * @notice Write a compressed version of the string to bytecode storage.
     * @param _string The string to write to bytecode storage.
     * @dev This function emits an event with the address of the newly created
     * storage contract.
     */
    function writeStringToBytecodeStorageCompressed(
        string memory _string
    ) public {
        bytes memory compressed = BytecodeStorageReader.getCompressed(_string);
        address storageContract = BytecodeStorageWriter
            .writeToBytecodeCompressed(compressed);
        emit StorageContractCreated(storageContract);
    }
}
