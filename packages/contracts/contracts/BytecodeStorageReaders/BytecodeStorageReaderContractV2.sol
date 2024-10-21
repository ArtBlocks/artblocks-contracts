// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import {IBytecodeStorageReaderV2} from "../interfaces/v0.8.x/IBytecodeStorageReaderV2.sol";

import {BytecodeStorageReader} from "../libs/v0.8.x/BytecodeStorageV2.sol";

/**
 * @title Art Blocks Bytecode Storage Reader Contract V2
 * @author Art Blocks Inc.
 * @notice This contract is used to read the bytecode of a contract deployed by Art Blocks' BytecodeStorage library,
 * for versions 0, 1, and 2 of the Art Blocks BytecodeStorage library.
 * It is permissionless and can be used by anyone to read the bytecode of any contract deployed by Art Blocks.
 * Future versions of BytecodeStorage will not be compatible with this reader.
 * For a single location to read current and future versions of the Art Blocks BytecodeStorage library, see
 * the UniversalBytecodeStorageReader contract, maintained by the Art Blocks team.
 * Additional functionality is provided to read bytes data stored using the SSTORE2 library.
 * This contract also provides an interface to read additional metadata stored by the Art Blocks BytecodeStorage
 * library, such as the contract's version, deployer, and other metadata.
 * @dev For simplicity and reduce code changes, this contract uses the BytecodeStorageReader external library to
 * perform many operations. Future reader contract versions may choose to make the library internal to this contract to
 * improve read operation performance.
 */
contract BytecodeStorageReaderContractV2 is IBytecodeStorageReaderV2 {
    using BytecodeStorageReader for address;

    string public constant VERSION = "BytecodeStorageReaderContractV2";

    /**
     * @notice Read a string from a data contract deployed via BytecodeStorage V2 or earlier.
     * @param address_ address of contract deployed via BytecodeStorage to be read
     * @return The string data stored at the specific address.
     */
    function readFromBytecode(
        address address_
    ) external view returns (string memory) {
        return address_.readFromBytecode();
    }

    /**
     * @notice Read a bytes array from the SSTORE2-formatted bytecode of a contract.
     * Note that this function is only compatible with contracts that have been deployed using the popular SSTORE2
     * library.
     * @param address_ address of contract with SSTORE2-formatted bytecode to be read
     * @return data The bytes data stored at the specific address.
     */
    function readBytesFromSSTORE2Bytecode(
        address address_
    ) external view returns (bytes memory) {
        return address_.readBytesFromSSTORE2Bytecode();
    }

    /**
     * @notice Read a bytes array from the a contract deployed via BytecodeStorage V2 or earlier.
     * @param address_ address of contract with valid bytecode to be read
     * @param offset offset to read from in contract bytecode, explicitly provided (not calculated)
     * @return The bytes data stored at the specific address.
     */
    function readBytesFromBytecode(
        address address_,
        uint256 offset
    ) external view returns (bytes memory) {
        return address_.readBytesFromBytecode(offset);
    }

    //------ Metadata Functions ------//

    /**
     * @notice Get address of deployer for given contract deployed via BytecodeStorage V2 or earlier.
     * @param address_ address of deployed contract
     * @return writerAddress address of deployer
     */
    function getWriterAddressForBytecode(
        address address_
    ) external view returns (address) {
        return address_.getWriterAddressForBytecode();
    }

    /**
     * @notice Get version for given contract deployed via BytecodeStorage V2 or earlier.
     * @param address_ address of deployed contract
     * @return version version of the contract
     */
    function getLibraryVersionForBytecode(
        address address_
    ) external view returns (bytes32) {
        return address_.getLibraryVersionForBytecode();
    }

    /**
     * @notice Get if data are stored in compressed format for given contract deployed via BytecodeStorage V2 or
     * earlier.
     * @param _address address of deployed contract
     * @return isCompressed boolean indicating if the stored data are compressed
     */
    function getIsCompressedForBytecode(
        address _address
    ) external view returns (bool) {
        return _address.getIsCompressedForBytecode();
    }
}
