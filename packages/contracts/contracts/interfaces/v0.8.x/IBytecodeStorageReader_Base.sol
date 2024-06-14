// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Script Storage Library - Minimal Interface for Reader Contracts
 * @notice This interface defines the minimal expected read function(s) for a Bytecode Storage Reader contract.
 */
interface IBytecodeStorageReader_Base {
    /**
     * @notice Read a string from a data contract deployed via BytecodeStorage.
     * @dev may also support reading additional stored data formats in the future.
     * @param address_ address of contract deployed via BytecodeStorage to be read
     * @return data The string data stored at the specific address.
     */
    function readFromBytecode(
        address address_
    ) external view returns (string memory data);
}
