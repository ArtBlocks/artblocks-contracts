// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.16;

// Created By: Art Blocks Inc.

import "../libs/0.8.x/BytecodeStorage.sol";

/**
 * @title Art Blocks BytecodeTextCR_DMock.
 * @author Art Blocks Inc.
 * @notice This contract serves as a mock client of the BytecodeStorage library
 *         to allow for more granular testing of this library than is supported
 *         by the usage of the library directly by specific current Art Blocks
 *         client smart contracts, such as the `GenArt721CoreV3` contract. This
 *         mock exposes the CR_D (create, read, _not updates_, delete)
 *         operations that the underlying BytecodeStorage library allows clients
 *         to support.
 *         Note that because updates can only functionally be performed by
 *         combining a "delete" and "create" operation, given that deployed
 *         contracts cannot be _updated_ directly in chain-state, this mock does
 *         not expose updates (the usual "U" in "CRUD") as they are not
 *         supported by the underlying library.
 *         Also note that this mock implementation follows the return-value
 *         format standards that the underlying BytecodeStorage library uses,
 *         rather than those used more broadly in the Art Blocks contracts repo.
 */
contract BytecodeTextCR_DMock {
    using BytecodeStorage for string;
    using BytecodeStorage for address;

    // monotonically increasing slot counter and associated slot-storage mapping
    uint256 public nextTextSlotId = 0;
    mapping(uint256 => address) public storedTextBytecodeAddresses;

    // save deployer address to support basic ACL checks for non-read operations
    address public deployerAddress;

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
     * @return textSlotId slot that the written bytecode contract address was
     *         stored in.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function createText(string memory _text)
        external
        onlyDeployer
        returns (uint256 textSlotId)
    {
        // store text in contract bytecode
        storedTextBytecodeAddresses[nextTextSlotId] = _text.writeToBytecode();
        // record written slot before incrementing
        textSlotId = nextTextSlotId;
        nextTextSlotId++;
    }

    /**
     * @notice "Read": Reads chunk of text currently in the provided slot, from
     *                 chain-state.
     * @param _textSlotId Slot (associated with this contract) for which to
     *                   read text content.
     * @return text Content read from contract bytecode in the given slot.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readText(uint256 _textSlotId)
        public
        view
        returns (string memory text)
    {
        text = storedTextBytecodeAddresses[_textSlotId].readFromBytecode();
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
        // purge old contract bytecode contract from the blockchain state
        storedTextBytecodeAddresses[_textSlotId].purgeBytecode();
        // delete reference to contract address that no longer exists
        delete storedTextBytecodeAddresses[_textSlotId];
    }

    /*//////////////////////////////////////////////////////////////
                       Additional Introspection
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Allows additional read introspection, to read a chunk of text ,
     *                from chain-state that lives at a given deployed address.
     * @param _bytecodeAddress address from which to read text content.
     * @return text Content read from contract bytecode at the given address.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readTextAtAddress(address _bytecodeAddress)
        public
        view
        returns (string memory text)
    {
        text = _bytecodeAddress.readFromBytecode();
    }

    /**
     * @notice Allows introspection of who deployed a given contracts-as-storage
     *         contract, based on a provided `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to read the author address.
     * @return authorAddress of the author who wrote the data contained in the
     *         given `_bytecodeAddress` contract.
     * @dev Intentionally do not perform input validation, instead allowing
     *      the underlying BytecodeStorage lib to throw errors where applicable.
     */
    function readAuthorForTextAtAddress(address _bytecodeAddress)
        public
        view
        returns (address authorAddress)
    {
        authorAddress = _bytecodeAddress.getWriterAddressForBytecode();
    }

    /**
     * @notice Allows additional internal purge-logic introspection, by allowing
     *         for the sending of arbitrary data from this contract to the
     *         provided existing `_bytecodeAddress`.
     * @param _bytecodeAddress address for which to send call data.
     * @param _data aribtrary data to send as call-data for raw `.call`.
     * @dev WARNING - THIS IS NOT SECURE AND SHOULD NOT BE USED IN PRODUCTION.
     */
    function callWithNonsenseData(address _bytecodeAddress, bytes memory _data)
        external
        onlyDeployer
    {
        // WARNING - don't make any specific use of the low-level call return
        //           result, this will knowingly throw a compiler warning but that
        //           is OK/expected as this method IS NOT SECURE AND SHOULD NOT BE
        //           USED IN PRODUCTION under any normal circumstances.
        _bytecodeAddress.call(_data);
    }
}
