// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.5/contracts/utils/structs/EnumerableSet.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Token Holder Library
 * @notice This library provides a collection of functions for managing and
 * interacting with holders of specific NFTs, in the context of purchase gating for
 * Art Blocks projects. The primary features of this library include the ability
 * to register and unregister NFT addresses, the allowance and removal of holders
 * from specific project tokens, as well as the ability to check if a specific NFT is
 * allowlisted.
 * @author Art Blocks Inc.
 */

library TokenHolderLib {
    using EnumerableSet for EnumerableSet.AddressSet;
    // Define one million to represent the base token ID for each project.
    uint256 constant ONE_MILLION = 1_000_000;

    /**
     * @dev Registers an NFT address.
     * @param _registeredNFTAddresses The set of registered NFT addresses.
     * @param _NFTAddress The NFT address to register.
     */
    function registerNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) internal {
        _registeredNFTAddresses.add(_NFTAddress);
    }

    /**
     * @dev Unregisters an NFT address.
     * @param _registeredNFTAddresses The set of registered NFT addresses.
     * @param _NFTAddress The NFT address to unregister.
     */
    function unregisterNFTAddress(
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address _NFTAddress
    ) internal {
        _registeredNFTAddresses.remove(_NFTAddress);
    }

    /**
     * @dev Allows holders of specific project tokens.
     * @param allowedProjectHoldersMapping A mapping of the allowed holders for a specific project.
     * @param _projectId Project ID to enable minting on.
     * @param _coreContract The address of the core contract.
     * @param _registeredNFTAddresses The set of registered NFT addresses.
     * @param _ownedNFTAddresses NFT core addresses of projects to be
     * allowlisted. Indexes must align with `_ownedNFTProjectIds`.
     * @param _ownedNFTProjectIds Project IDs on `_ownedNFTAddresses` whose
     * holders shall be allowlisted to mint project `_projectId`. Indexes must
     * align with `_ownedNFTAddresses`.
     */
    function allowHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays must be same length"
        );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            require(
                _registeredNFTAddresses.contains(_ownedNFTAddresses[i]),
                "TokenHolderLib: address not registered"
            );
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddresses[i]
            ][_ownedNFTProjectIds[i]] = true;
        }
    }

    /**
     * @dev Removes holders of specific project tokens.
     * @param allowedProjectHoldersMapping A mapping of the allowed holders for a specific project.
     * @param _projectId Project ID to enable minting on.
     * @param _coreContract The address of the core contract.
     * @param _registeredNFTAddresses The set of registered NFT addresses.
     * @param _ownedNFTAddresses NFT core addresses of projects to be removed
     * from allowlist. Indexes must align with `_ownedNFTProjectIds`.
     * @param _ownedNFTProjectIds Project IDs on `_ownedNFTAddresses` whose
     * holders will be removed from allowlist to mint project `_projectId`.
     * Indexes must align with `_ownedNFTAddresses`.
     */
    function removeHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays must be same length"
        );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            require(
                _registeredNFTAddresses.contains(_ownedNFTAddresses[i]),
                "TokenHolderLib: address not registered"
            );
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddresses[i]
            ][_ownedNFTProjectIds[i]] = false;
        }
    }

    /**
     * @dev Allows and removes holders of specific project tokens in one operation.
     * @param allowedProjectHoldersMapping A mapping of the allowed holders for a specific project.
     * @param _projectId The ID of the project to which the holders belong or from which they will be removed.
     * @param _coreContract The address of the core contract.
     * @param _registeredNFTAddresses The set of registered NFT addresses.
     * @param _ownedNFTAddressesAdd NFT core addresses of projects to be
     * allowlisted. Indexes must align with `_ownedNFTProjectIdsAdd`.
     * @param _ownedNFTProjectIdsAdd Project IDs on `_ownedNFTAddressesAdd`
     * whose holders shall be allowlisted to mint project `_projectId`. Indexes
     * must align with `_ownedNFTAddressesAdd`.
     * @param _ownedNFTAddressesRemove NFT core addresses of projects to be
     * removed from allowlist. Indexes must align with
     * `_ownedNFTProjectIdsRemove`.
     * @param _ownedNFTProjectIdsRemove Project IDs on
     * `_ownedNFTAddressesRemove` whose holders will be removed from allowlist
     * to mint project `_projectId`. Indexes must align with
     * `_ownedNFTAddressesRemove`.
     */
    function allowRemoveHoldersOfProjects(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        EnumerableSet.AddressSet storage _registeredNFTAddresses,
        address[] memory _ownedNFTAddressesAdd,
        uint256[] memory _ownedNFTProjectIdsAdd,
        address[] memory _ownedNFTAddressesRemove,
        uint256[] memory _ownedNFTProjectIdsRemove
    ) internal {
        allowHoldersOfProjects(
            allowedProjectHoldersMapping,
            _projectId,
            _coreContract,
            _registeredNFTAddresses,
            _ownedNFTAddressesAdd,
            _ownedNFTProjectIdsAdd
        );
        removeHoldersOfProjects(
            allowedProjectHoldersMapping,
            _projectId,
            _coreContract,
            _registeredNFTAddresses,
            _ownedNFTAddressesRemove,
            _ownedNFTProjectIdsRemove
        );
    }

    /**
     * @dev Checks if a specific NFT is allowlisted.
     * @param allowedProjectHoldersMapping A mapping of the allowed holders for a specific project.
     * @param _projectId The ID of the project to check.
     * @param _coreContract The address of the core contract.
     * @param _ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param _ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @return bool true if the NFT is allowlisted; false otherwise.
     */
    function isAllowlistedNFT(
        mapping(address => mapping(uint256 => mapping(address => mapping(uint256 => bool))))
            storage allowedProjectHoldersMapping,
        uint256 _projectId,
        address _coreContract,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) internal view returns (bool) {
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            allowedProjectHoldersMapping[_coreContract][_projectId][
                _ownedNFTAddress
            ][ownedNFTProjectId];
    }
}
