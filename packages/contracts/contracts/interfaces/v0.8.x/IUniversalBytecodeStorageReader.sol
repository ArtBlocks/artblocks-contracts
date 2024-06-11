// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IBytecodeStorageReader_Base} from "./IBytecodeStorageReader_Base.sol";

/**
 * @title This interface extends the IBytecodeStorageReader_Base interface with relevant events and functions used on the
 * universal bytecode storage reader contract.
 * @author Art Blocks Inc.
 */
interface IUniversalBytecodeStorageReader is IBytecodeStorageReader_Base {
    /**
     * @notice The active bytecode storage reader contract being used by this universal reader was updated.
     * @param activeReader The address of the new active bytecode storage reader contract.
     */
    event ReaderUpdated(address indexed activeReader);

    /**
     * @notice Update the active bytecode storage reader contract being used by this universal reader.
     * @dev emits a ReaderUpdated event when successful.
     * @param newBytecodeStorageReader The address of the new active bytecode storage reader contract.
     */
    function updateBytecodeStorageReader(
        address newBytecodeStorageReader
    ) external;
}
