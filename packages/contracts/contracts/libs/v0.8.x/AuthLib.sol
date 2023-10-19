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
     * @notice Function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of an IMinterFilterV1.
     * Reverts if not allowed.
     * @param minterFilterAddress address of the minter filter to be checked,
     * should implement IMinterFilterV1
     * @param sender address of the caller
     * @param contract_ address of the contract being called
     * @param selector selector of the function being called
     */
    function onlyMinterFilterAdminACL(
        address minterFilterAddress,
        address sender,
        address contract_,
        bytes4 selector
    ) internal {
        require(
            _minterFilterAdminACLAllowed({
                minterFilterAddress: minterFilterAddress,
                sender: sender,
                contract_: contract_,
                selector: selector
            }),
            "Only MinterFilter AdminACL"
        );
    }

    /**
     * @notice Function to restrict access to only AdminACL allowed calls, where
     * AdminACL is the admin of a core contract at `coreContract`.
     * Reverts if not allowed.
     * @param coreContract address of the core contract to be checked
     * @param sender address of the caller
     * @param contract_ address of the contract being called
     * @param selector selector of the function being called
     */
    function onlyCoreAdminACL(
        address coreContract,
        address sender,
        address contract_,
        bytes4 selector
    ) internal {
        require(
            _coreAdminACLAllowed({
                coreContract: coreContract,
                sender: sender,
                contract_: contract_,
                selector: selector
            }),
            "Only Core AdminACL allowed"
        );
    }

    /**
     * @notice Throws if `sender` is any account other than the artist of the
     * specified project `projectId` on core contract `coreContract`.
     * @param projectId The ID of the project being checked.
     * @param coreContract The address of the GenArt721CoreContractV3_Base
     * contract.
     * @param sender Wallet to check. Typically, the address of the caller.
     * @dev `sender` must be the artist associated with `projectId` on `coreContract`.
     */
    function onlyArtist(
        uint256 projectId,
        address coreContract,
        address sender
    ) internal view {
        require(
            _senderIsArtist({
                projectId: projectId,
                coreContract: coreContract,
                sender: sender
            }),
            "Only Artist"
        );
    }

    /**
     * @notice Function to restrict access to only the artist of a project, or AdminACL
     * allowed calls, where AdminACL is the admin of a core contract at
     * `coreContract`.
     * @param projectId id of the project
     * @param coreContract address of the core contract to be checked
     * @param sender address of the caller
     * @param contract_ address of the contract being called
     * @param selector selector of the function being called
     */
    function onlyCoreAdminACLOrArtist(
        uint256 projectId,
        address coreContract,
        address sender,
        address contract_,
        bytes4 selector
    ) internal {
        require(
            _senderIsArtist({
                projectId: projectId,
                coreContract: coreContract,
                sender: sender
            }) ||
                _coreAdminACLAllowed({
                    coreContract: coreContract,
                    sender: sender,
                    contract_: contract_,
                    selector: selector
                }),
            "Only Artist or Core Admin ACL"
        );
    }

    // ------------------------------------------------------------------------
    // Private functions used internally by this library
    // ------------------------------------------------------------------------

    /**
     * @notice Private function that returns if minter filter contract's AdminACL
     * allows `sender` to call function with selector `selector` on contract
     * `contract`.
     * @param minterFilterAddress address of the minter filter to be checked.
     * Should implement IMinterFilterV1.
     * @param sender address of the caller
     * @param contract_ address of the contract being called
     * @param selector selector of the function being called
     */
    function _minterFilterAdminACLAllowed(
        address minterFilterAddress,
        address sender,
        address contract_,
        bytes4 selector
    ) private returns (bool) {
        return
            IMinterFilterV1(minterFilterAddress).adminACLAllowed({
                sender: sender,
                contract_: contract_,
                selector: selector
            });
    }

    /**
     * @notice Private function that returns if core contract's AdminACL allows
     * `sender` to call function with selector `selector` on contract
     * `contract`.
     * @param coreContract address of the core contract to be checked
     * @param sender address of the caller
     * @param contract_ address of the contract being called
     * @param selector selector of the function being called
     */
    function _coreAdminACLAllowed(
        address coreContract,
        address sender,
        address contract_,
        bytes4 selector
    ) private returns (bool) {
        return
            IGenArt721CoreContractV3_Base(coreContract).adminACLAllowed({
                _sender: sender,
                _contract: contract_,
                _selector: selector
            });
    }

    /**
     * @notice Private function that returns if `sender` is the artist of `projectId`
     * on `coreContract`.
     * @param projectId project ID to check
     * @param coreContract core contract to check
     * @param sender wallet to check
     */
    function _senderIsArtist(
        uint256 projectId,
        address coreContract,
        address sender
    ) private view returns (bool senderIsArtist) {
        return
            sender ==
            IGenArt721CoreContractV3_Base(coreContract)
                .projectIdToArtistAddress(projectId);
    }
}
