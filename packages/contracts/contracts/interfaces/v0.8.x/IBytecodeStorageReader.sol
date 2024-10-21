// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IBytecodeStorageReader_Base} from "./IBytecodeStorageReader_Base.sol";

/**
 * @title Art Blocks Script Storage Library - Reader Contract
 * @notice This interface defines the expected read functions for the Art Blocks Script Storage Library's Reader
 * Contracts. It is extended from the base interface to add additional read functions for further introspection of
 * stored data.
 */
interface IBytecodeStorageReader is IBytecodeStorageReader_Base {
    /**
     * @notice Read a bytes array from the SSTORE2-formatted bytecode of a contract.
     * Note that this function is only compatible with contracts that have been deployed using the popular SSTORE2
     * library.
     * @dev see versioned BytecodeStorageReader implementation details to understand which data are being returned,
     * espcially in the context of EOF updates.
     * @param address_ address of contract with SSTORE2-formatted bytecode to be read
     * @return data The bytes data stored at the specific address.
     */
    function readBytesFromSSTORE2Bytecode(
        address address_
    ) external view returns (bytes memory data);

    /**
     * @notice Read a bytes array from the a contract deployed via BytecodeStorage.
     * @dev see versioned BytecodeStorageReader implementation details to understand which data are being returned, and
     * how offset is interpreted, especially in the context of EOF updates.
     * @param address_ address of contract with valid bytecode to be read
     * @param offset offset to read from in contract bytecode, explicitly provided (not calculated)
     * @return The bytes data stored at the specific address.
     */
    function readBytesFromBytecode(
        address address_,
        uint256 offset
    ) external view returns (bytes memory);

    //------ Metadata Functions ------//

    /**
     * @notice Get address of deployer for given contract deployed via BytecodeStorage.
     * @param address_ address of deployed contract
     * @return writerAddress address of deployer
     */
    function getWriterAddressForBytecode(
        address address_
    ) external view returns (address);

    /**
     * @notice Get version for given contract deployed via BytecodeStorage.
     * @param address_ address of deployed contract
     * @return version version of the contract
     */
    function getLibraryVersionForBytecode(
        address address_
    ) external view returns (bytes32);
}
