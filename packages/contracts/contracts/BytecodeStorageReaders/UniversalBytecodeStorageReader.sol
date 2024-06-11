// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import {IUniversalBytecodeStorageReader} from "../interfaces/v0.8.x/IUniversalBytecodeStorageReader.sol";

import {IBytecodeStorageReaderV2} from "../interfaces/v0.8.x/IBytecodeStorageReaderV2.sol";

import "@openzeppelin-5.0/contracts/access/Ownable.sol";

/**
 * @title Art Blocks Universal Bytecode Storage Reader
 * @author Art Blocks Inc.
 * @notice This contract is used to read the bytecode of a contract deployed by Art Blocks' BytecodeStorage library.
 * It is designed to be owned and configurable by a Art Blocks secure multisig wallet, providing a single location
 * to read on-chain data stored by the Art Blocks BytecodeStorage libarary. This contract is intended to be updated
 * as new versions of the Art Blocks BytecodeStorage library are released, such that the Art Blocks community can
 * continue to read the bytecode of all existing and future Art Blocks contracts in a single location.
 * The exposed interface is simplified to only include the read string and read bytes functions, as well as support
 * for assets stored using SSTORE2 format.
 * Additional functionality, such as determining a contract's version, deployer, and other metadata, may be available
 * on the active BytecodeStorageReader contract.
 */
contract UniversalBytecodeStorageReader is
    Ownable,
    IUniversalBytecodeStorageReader
{
    /**
     * @notice The active bytecode storage reader contract being used by this universal reader.
     * Updateable by the owner of this contract.
     * This contract is intended to be updated as new versions of the Art Blocks BytecodeStorage library are released.
     * @dev To prevent a single point of failure, contracts may point directly to BytecodeStorageReader contracts
     * instead of this universal reader.
     */
    IBytecodeStorageReaderV2 public activeBytecodeStorageReader;

    /**
     * @notice Construct a new UniversalBytecodeStorageReader contract, owned by input owner address.
     * @param owner_ The address that will be set as the owner of this contract.
     */
    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Update the active bytecode storage reader contract being used by this universal reader.
     * @param newBytecodeStorageReader The address of the new active bytecode storage reader contract.
     */
    function updateBytecodeStorageReader(
        address newBytecodeStorageReader
    ) external onlyOwner {
        activeBytecodeStorageReader = IBytecodeStorageReaderV2(
            newBytecodeStorageReader
        );
        emit ReaderUpdated({activeReader: newBytecodeStorageReader});
    }

    /**
     * @notice Read a string from a data contract deployed via BytecodeStorage.
     * @dev may also support reading additional stored data formats in the future.
     * @param address_ address of contract deployed via BytecodeStorage to be read
     * @return The string data stored at the specific address.
     */
    function readFromBytecode(
        address address_
    ) external view returns (string memory) {
        return
            activeBytecodeStorageReader.readFromBytecode({address_: address_});
    }
}
