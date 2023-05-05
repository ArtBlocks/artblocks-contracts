// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

// Created By: Art Blocks Inc.

import "../libs/0.8.x/SSTORE2.sol";

/**
 * @title Art Blocks SSTORE2Mock.
 * @author Art Blocks Inc.
 * @notice This contract serves as a mock client of the SSTORE2 library
 *         to allow for more testing of this library in the context of
 *         backwards-compatible reads with the Art Blocks BytecodeStorage library
 * @dev For the purposes of our backwards-compatibility testing, the two different
 *      variations of the SSTORE2 library are functionally equivalent, so we just test
 *      against the one that is more widely tracked on Github for simplicity, but the
 *      same tests could be run against the other variation of the library as well
 *      and would be expected to "just work" given both use the same data offset of
 *      a single 0x00 "stop byte".
 */
contract SSTORE2Mock {
    using SSTORE2 for bytes;
    using SSTORE2 for address;

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
                     Create + Read
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
        storedTextBytecodeAddresses[nextTextSlotId] = bytes(_text).write();
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
        return string(storedTextBytecodeAddresses[_textSlotId].read());
    }

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
        return string(_bytecodeAddress.read());
    }
}
