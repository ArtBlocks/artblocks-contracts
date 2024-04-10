// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.19;

// Created By: Art Blocks Inc.

import {BytecodeStorageWriter, BytecodeStorageReader} from "../libs/v0.8.x/BytecodeStorageV2.sol";

/**
 * @title Art Blocks BytecodeTextCR_DMock.
 * @author Art Blocks Inc.
 * @notice This contract serves as a mock client of the BytecodeStorageV2 library
 *         to allow for more granular testing of this library than is supported
 *         by the usage of the library directly by specific current Art Blocks
 *         client smart contracts, such as the `GenArt721CoreV3` contract. This
 *         mock exposes the CR_D (create, read, _not updates_, delete)
 *         operations that the underlying BytecodeStorageV2 library allows clients
 *         to support.
 *         Note that because updates can only functionally be performed by
 *         combining a "delete" and "create" operation, given that deployed
 *         contracts cannot be _updated_ directly in chain-state, this mock does
 *         not expose updates (the usual "U" in "CRUD") as they are not
 *         supported by the underlying library.
 */
contract BytecodeV2TextCR_DMock {
    using BytecodeStorageWriter for string;
    using BytecodeStorageReader for string;
    using BytecodeStorageWriter for bytes;

    // monotonically increasing slot counter and associated slot-storage mapping
    uint256 public nextTextSlotId = 0;
    mapping(uint256 => address) public storedTextBytecodeAddresses;

    // save deployer address to support basic ACL checks for non-read operations
    address public deployerAddress;

    // dummy counter to implement non-view read function for gas measurements of large reads (RPC compatibility)
    uint256 private _dummyCounter;

    modifier onlyDeployer() {
        require(msg.sender == deployerAddress, "Only deployer");
        _;
    }

    /**
     * @notice Initializes contract.
     */
    constructor() {
        deployerAddress = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                     Create Read _ Delete
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice "Create": Adds a chunk of text to be stored to chain-state.
     * @param _text Text to be created in chain-state.
     * @return uint256 Slot that the written bytecode contract address was
     *         stored in.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function createText(
        string memory _text
    ) external onlyDeployer returns (uint256) {
        // store text in contract bytecode
        storedTextBytecodeAddresses[nextTextSlotId] = _text.writeToBytecode();
        // record written slot before incrementing
        uint256 textSlotId = nextTextSlotId;
        nextTextSlotId++;
        return textSlotId;
    }

    /**
     * @notice "Create": Adds a chunk of text to be stored to chain-state.
     * @param _textCompressed Compressed bytes representing text to be created in chain-state.
     * @return uint256 Slot that the written bytecode contract address was
     *         stored in.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function createTextCompressed(
        bytes memory _textCompressed
    ) external onlyDeployer returns (uint256) {
        // store compressed text in contract bytecode
        storedTextBytecodeAddresses[nextTextSlotId] = _textCompressed
            .writeToBytecodeCompressed();
        // record written slot before incrementing
        uint256 textSlotId = nextTextSlotId;
        nextTextSlotId++;
        return textSlotId;
    }

    /**
     * @notice "Read": Reads chunk of text currently in the provided slot, from
     *                 chain-state.
     * @param _textSlotId Slot (associated with this contract) for which to
     *                   read text content.
     * @return string Content read from contract bytecode in the given slot.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readText(uint256 _textSlotId) public view returns (string memory) {
        return
            BytecodeStorageReader.readFromBytecode(
                storedTextBytecodeAddresses[_textSlotId]
            );
    }

    /**
     * @notice "Delete": Deletes chunk of text currently in the provided slot,
     *                   from chain-state.
     * @param _textSlotId Slot (associated with this contract) for which to
     *                    delete text content.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function deleteText(uint256 _textSlotId) external onlyDeployer {
        // delete reference to old storage contract address
        delete storedTextBytecodeAddresses[_textSlotId];
    }

    /**
     * @notice function to assist in getting compressed text in a non-view function.
     * Useful for measuring gas costs of large reads in RPC environments.
     * @param _text Text to be compressed.
     */
    function getCompressedNonView(
        string memory _text
    ) external returns (bytes memory) {
        // non-view dummy portion of the function
        _dummyCounter++;
        // read compressed text from chain-state
        return _text.getCompressed();
    }

    /**
     * @notice Allows additional read introspection, to read a chunk of text,
     *         from chain-state that lives at a given deployed address.
     *         Non-view variant to easily measure gas costs of large reads.
     * @param _textSlotId Slot (associated with this contract) for which to
     *                   read text content.
     * @return string Content read from contract bytecode in the given slot.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readTextNonView(
        uint256 _textSlotId
    ) external returns (string memory) {
        // non-view dummy portion of the function
        _dummyCounter++;
        // read text from chain-state
        return
            BytecodeStorageReader.readFromBytecode(
                storedTextBytecodeAddresses[_textSlotId]
            );
    }

    /*//////////////////////////////////////////////////////////////
                       Additional Introspection
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows additional read introspection, to read a chunk of text,
     *         from chain-state that lives at a given deployed address.
     * @param _bytecodeAddress address from which to read text content.
     * @return string Content read from contract bytecode at the given address.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readTextAtAddress(
        address _bytecodeAddress
    ) public view returns (string memory) {
        return BytecodeStorageReader.readFromBytecode(_bytecodeAddress);
    }

    /**
     * @notice Allows additional read introspection, to read a chunk of text,
     *         from chain-state that lives at a given deployed address with an
     *         explicitly provided `_offset`.
     * @param _bytecodeAddress address from which to read text content.
     * @param _offset Offset to read from in contract bytecode,
     *                explicitly provided (not calculated)
     * @return string Content read from contract bytecode at the given address.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function forceReadTextAtAddress(
        address _bytecodeAddress,
        uint256 _offset
    ) public view returns (string memory) {
        return
            string(
                BytecodeStorageReader.readBytesFromBytecode(
                    _bytecodeAddress,
                    _offset
                )
            );
    }

    /**
     * @notice Allows additional read introspection, to read a chunk of text,
     *         from chain-state that lives at a given deployed address that
     *         was written with SSTORE2.
     * @param _bytecodeAddress address from which to read text content.
     * @return string Content read from contract bytecode at the given address.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readSSTORE2TextAtAddress(
        address _bytecodeAddress
    ) public view returns (string memory) {
        return
            string(
                BytecodeStorageReader.readBytesFromSSTORE2Bytecode(
                    _bytecodeAddress
                )
            );
    }

    /**
     * @notice Allows introspection of who deployed a given contracts-as-storage
     *         contract, based on a provided `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to read the author address.
     * @return address of the author who wrote the data contained in the
     *                 given `_bytecodeAddress` contract.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readAuthorForTextAtAddress(
        address _bytecodeAddress
    ) public view returns (address) {
        return
            BytecodeStorageReader.getWriterAddressForBytecode(_bytecodeAddress);
    }

    /**
     * @notice Allows introspection of the version of a given contracts-as-storage
     *         contract, based on a provided `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to read the version.
     * @return bytes32 version of the version string contained in the given `_bytecodeAddress`
     *                 contract.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readLibraryVersionForTextAtAddress(
        address _bytecodeAddress
    ) public view returns (bytes32) {
        return
            BytecodeStorageReader.getLibraryVersionForBytecode(
                _bytecodeAddress
            );
    }

    /**
     * @notice Allows introspection of if stored data are in compressed format of a given
     *         contracts-as-storage contract, based on a provided `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to read the version.
     * @return bool indicating if data are stored in compressed format in the given
     *         `_bytecodeAddress` contract.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readIsCompressedForTextAtAddress(
        address _bytecodeAddress
    ) public view returns (bool) {
        return
            BytecodeStorageReader.getIsCompressedForBytecode(_bytecodeAddress);
    }

    function getCompressed(
        string memory _text
    ) public pure returns (bytes memory) {
        return _text.getCompressed();
    }

    /**
     * @notice Allows additional internal purge-logic introspection, by allowing
     *         for the sending of arbitrary data from this contract to the
     *         provided existing `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to send call data.
     * @param _data aribtrary data to send as call-data for raw `.call`.
     * @dev WARNING - THIS IS NOT SECURE AND SHOULD NOT BE USED IN PRODUCTION.
     */
    function callWithNonsenseData(
        address _bytecodeAddress,
        bytes memory _data
    ) external onlyDeployer {
        (bool success /* `data` not needed */, ) = _bytecodeAddress.call(_data);
        if (success) {
            // WARNING - This implementation does not make use of the low-level
            //           call return result indicating success/failure. This is
            //           contrary to best practice but is OK in this instance as
            //           this method IS NOT SECURE AND SHOULD NOT BE USED IN
            //           PRODUCTION under any normal circumstances.
        }
    }

    /**
     * @notice Allows additional internal purge-logic introspection, by allowing
     *         for the sending of raw calls (with no data) from this contract to
     *         the provided existing `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to send call data.
     * @dev WARNING - THIS IS NOT SECURE AND SHOULD NOT BE USED IN PRODUCTION.
     */
    function callWithoutData(address _bytecodeAddress) external onlyDeployer {
        (bool success /* `data` not needed */, ) = _bytecodeAddress.call("");
        if (success) {
            // WARNING - This implementation does not make use of the low-level
            //           call return result indicating success/failure. This is
            //           contrary to best practice but is OK in this instance as
            //           this method IS NOT SECURE AND SHOULD NOT BE USED IN
            //           PRODUCTION under any normal circumstances.
        }
    }
}
