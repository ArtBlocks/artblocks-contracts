// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

/**
 * @title Art Blocks Authorization Minter Library
 * @notice This library contains helper functions that may be used by minters
 * to check authorization for performing operations.
 * @author Art Blocks Inc.
 */

library AuthLib {
    /**
     * function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of this minter's MinterFilter.
     * @param _minterFilterAddress address of the minter filter contract
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
            "Only Core AdminACL allowed"
        );
    }

    // function to restrict access to only the artist of a project
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
     * function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of a core contract at `_coreContract`.
     * @param _coreContract address of the minter filter contract
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
     * function to restrict access to only the artist of a project, or AdminACL
     * allowed calls, where AdminACL is the admin of a core contract at
     * `_coreContract`.
     * @param _projectId id of the project
     * @param _coreContract address of the minter filter contract
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
            "Only Artist or Admin ACL"
        );
    }

    // ------------------------------------------------------------------------
    // Private functions used internally by this library
    // ------------------------------------------------------------------------

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
}
