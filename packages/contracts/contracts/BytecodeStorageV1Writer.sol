// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.19;

// Created By: Art Blocks Inc.
import "./libs/v0.8.x/BytecodeStorageV1.sol";

/**
 * @title Art Blocks Storage Writer
 * @author Art Blocks Inc.
 * @notice A simple contract that with a single function that uses
 * the BytecodeStorageV1 library to write a string to bytecode storage.
 */
contract BytecodeStorageV1Writer {
    using BytecodeStorageWriter for string;

    event StorageContractCreated(address indexed storageContract);

    /**
     * @notice Write a string to bytecode storage.
     * @param _string The string to write to bytecode storage.
     * @dev This function emits an event with the address of the newly created
     * storage contract.
     */
    function writeStringToBytecodeStorage(string memory _string) public {
        address storageContract = _string.writeToBytecode();

        emit StorageContractCreated(storageContract);
    }
}
