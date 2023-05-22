// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Script Storage Library (Reader)
 * @notice This interface defines the expected read functions for the Art Blocks Script Storage Library (Reader).
 */
interface IBytecodeStorageReader {
    /**
     * @notice Read a string from contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return data string read from contract bytecode
     * @dev This function performs input validation that the contract to read is in an expected format
     */
    function readFromBytecode(
        address _address
    ) external view returns (string memory data);

    /**
     * @notice Read the bytes from contract bytecode that was written to the EVM using SSTORE2
     * @param _address address of deployed contract with bytecode stored in the SSTORE2 format
     * @return data bytes read from contract bytecode
     * @dev This function performs no input validation on the provided contract,
     *      other than that there is content to read (but not that its a "storage contract")
     */
    function readBytesFromSSTORE2Bytecode(
        address _address
    ) external view returns (bytes memory data);

    /**
     * @notice Read the bytes from contract bytecode, with an explicitly provided starting offset
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @param _offset offset to read from in contract bytecode, explicitly provided (not calculated)
     * @return data bytes read from contract bytecode
     * @dev This function performs no input validation on the provided contract,
     *      other than that there is content to read (but not that its a "storage contract")
     */
    function readBytesFromBytecode(
        address _address,
        uint256 _offset
    ) external view returns (bytes memory data);

    /**
     * @notice Get address for deployer for given contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return writerAddress address read from contract bytecode
     */
    function getWriterAddressForBytecode(
        address _address
    ) external view returns (address);

    /**
     * @notice Get version for given contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return version version read from contract bytecode
     */
    function getLibraryVersionForBytecode(
        address _address
    ) external view returns (bytes32);
}
