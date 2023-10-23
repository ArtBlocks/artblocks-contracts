// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

/**
 * @title Art Blocks Authorization Minter Library
 * @notice This library contains helper functions that may be used contracts to
 * check authorization for performing operations in the Art Blocks V3 core
 * contract ecosystem.
 * @author Art Blocks Inc.
 */

library AuthLib {
    /**
     * function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of an IMinterFilterV1.
     * Reverts if not allowed.
     * @param _minterFilterAddress address of the minter filter to be checked,
     * should implement IMinterFilterV1
     * @param _sender address of the caller
     * @param _contract address of the contract being called
     * @param _selector selector of the function being called
     */
    function onlyMinterFilterAdminACL(
        address _minterFilterAddress,
        address _sender,
        address _contract,
        bytes4 _selector
    ) internal {
        require(
            _minterFilterAdminACLAllowed({
                _minterFilterAddress: _minterFilterAddress,
                _sender: _sender,
                _contract: _contract,
                _selector: _selector
            }),
            "Only MinterFilter AdminACL"
        );
    }

    /**
     * Function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of a core contract at `_coreContract`.
     * Reverts if not allowed.
     * @param _coreContract address of the core contract to be checked
     * @param _sender address of the caller
     * @param _contract address of the contract being called
     * @param _selector selector of the function being called
     */
    function onlyCoreAdminACL(
        address _coreContract,
        address _sender,
        address _contract,
        bytes4 _selector
    ) internal {
        require(
            _coreAdminACLAllowed({
                _coreContract: _coreContract,
                _sender: _sender,
                _contract: _contract,
                _selector: _selector
            }),
            "Only Core AdminACL allowed"
        );
    }

    /**
     * @notice Throws if `_sender` is any account other than the artist of the
     * specified project `_projectId` on core contract `_coreContract`.
     * Requirements: `msg.sender` must be the artist associated with
     * `_projectId` on `_coreContract`.
     * @param _projectId The ID of the project being checked.
     * @param _coreContract The address of the GenArt721CoreContractV3_Base
     * contract.
     * @param _sender Wallet to check. Typically, the address of the caller.
     */
    function onlyArtist(
        uint256 _projectId,
        address _coreContract,
        address _sender
    ) internal view {
        require(
            _senderIsArtist({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _sender: _sender
            }),
            "Only Artist"
        );
    }

    /**
     * function to restrict access to only the artist of a project, or AdminACL
     * allowed calls, where AdminACL is the admin of a core contract at
     * `_coreContract`.
     * @param _projectId id of the project
     * @param _coreContract address of the core contract to be checked
     * @param _sender address of the caller
     * @param _contract address of the contract being called
     * @param _selector selector of the function being called
     */
    function onlyCoreAdminACLOrArtist(
        uint256 _projectId,
        address _coreContract,
        address _sender,
        address _contract,
        bytes4 _selector
    ) internal {
        require(
            _senderIsArtist({
                _projectId: _projectId,
                _coreContract: _coreContract,
                _sender: _sender
            }) ||
                _coreAdminACLAllowed({
                    _coreContract: _coreContract,
                    _sender: _sender,
                    _contract: _contract,
                    _selector: _selector
                }),
            "Only Artist or Core Admin ACL"
        );
    }

    // ------------------------------------------------------------------------
    // Private functions used internally by this library
    // ------------------------------------------------------------------------

    /**
     * Private function that returns if minter filter contract's AdminACL
     * allows `_sender` to call function with selector `_selector` on contract
     * `_contract`.
     * @param _minterFilterAddress address of the minter filter to be checked.
     * Should implement IMinterFilterV1.
     * @param _sender address of the caller
     * @param _contract address of the contract being called
     * @param _selector selector of the function being called
     */
    function _minterFilterAdminACLAllowed(
        address _minterFilterAddress,
        address _sender,
        address _contract,
        bytes4 _selector
    ) private returns (bool) {
        return
            IMinterFilterV1(_minterFilterAddress).adminACLAllowed({
                _sender: _sender,
                _contract: _contract,
                _selector: _selector
            });
    }

    /**
     * Private function that returns if core contract's AdminACL allows
     * `_sender` to call function with selector `_selector` on contract
     * `_contract`.
     * @param _coreContract address of the core contract to be checked
     * @param _sender address of the caller
     * @param _contract address of the contract being called
     * @param _selector selector of the function being called
     */
    function _coreAdminACLAllowed(
        address _coreContract,
        address _sender,
        address _contract,
        bytes4 _selector
    ) private returns (bool) {
        return
            IGenArt721CoreContractV3_Base(_coreContract).adminACLAllowed({
                _sender: _sender,
                _contract: _contract,
                _selector: _selector
            });
    }

    /**
     * Private function that returns if `_sender` is the artist of `_projectId`
     * on `_coreContract`.
     * @param _projectId project ID to check
     * @param _coreContract core contract to check
     * @param _sender wallet to check
     */
    function _senderIsArtist(
        uint256 _projectId,
        address _coreContract,
        address _sender
    ) private view returns (bool senderIsArtist) {
        return
            _sender ==
            IGenArt721CoreContractV3_Base(_coreContract)
                .projectIdToArtistAddress(_projectId);
    }
}
