// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IBytecodeStorageReader.sol";

/**
 * @title Art Blocks IBytecodeStorageReader-conforming mock.
 * @author Art Blocks Inc.
 * @notice This contract serves as a mock client of the BytecodeStorageV1 library
 *         to allow for testing of making direct calls (rather than delegate calls)
 *         to a deployed copy of the library. This is for testing purposes as this
 *         is the expected integration flow for direct usage of the BytecodeStorageV1
 *         reader library in a post-EOF world where new EOF-contracts cannot DELEGATECALL
 *         into legacy contracts, in which we plan to have a BytecodeStorageV2 variant
 *         of the library that makes use of CALL rather than DELEGATECALL for the
 *         purposes of backwards-compatible reads.
 */
contract BytecodeV1LibCallsMock {
    // Address of the deployed BytecodeStorageReader contract library under mock harness.
    address public bytecodeStorageReaderDeploymentAddress;
    // Deployed instance of the BytecodeStorageReader contract library under mock harness.
    IBytecodeStorageReader private bytecodeStorageReaderDeployment;

    /**
     * @notice Initializes contract.
     */
    constructor(address _bytecodeStorageReaderDeploymentAddress) {
        bytecodeStorageReaderDeploymentAddress = _bytecodeStorageReaderDeploymentAddress;
        bytecodeStorageReaderDeployment = IBytecodeStorageReader(
            _bytecodeStorageReaderDeploymentAddress
        );
    }

    /*//////////////////////////////////////////////////////////////
                Proxy Read Operations of V1 Library
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Read a string from contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return data string read from contract bytecode
     * @dev This function performs input validation that the contract to read is in an expected format
     */
    function readFromBytecode(
        address _address
    ) public view returns (string memory data) {
        return bytecodeStorageReaderDeployment.readFromBytecode(_address);
    }

    /**
     * @notice Read the bytes from contract bytecode that was written to the EVM using SSTORE2
     * @param _address address of deployed contract with bytecode stored in the SSTORE2 format
     * @return data bytes read from contract bytecode
     * @dev This function performs no input validation on the provided contract,
     *      other than that there is content to read (but not that its a "storage contract")
     */
    function readBytesFromSSTORE2Bytecode(
        address _address
    ) public view returns (bytes memory data) {
        return
            bytecodeStorageReaderDeployment.readBytesFromSSTORE2Bytecode(
                _address
            );
    }

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
    ) public view returns (bytes memory data) {
        return
            bytecodeStorageReaderDeployment.readBytesFromBytecode(
                _address,
                _offset
            );
    }

    /**
     * @notice Get address for deployer for given contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return writerAddress address read from contract bytecode
     */
    function getWriterAddressForBytecode(
        address _address
    ) public view returns (address) {
        return
            bytecodeStorageReaderDeployment.getWriterAddressForBytecode(
                _address
            );
    }

    /**
     * @notice Get version for given contract bytecode
     * @param _address address of deployed contract with bytecode stored in the V0 or V1 format
     * @return version version read from contract bytecode
     */
    function getLibraryVersionForBytecode(
        address _address
    ) public view returns (bytes32) {
        return
            bytecodeStorageReaderDeployment.getLibraryVersionForBytecode(
                _address
            );
    }
}
