// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin-4.7/contracts/token/ERC721/IERC721.sol";

import {EnumerableSet} from "@openzeppelin-4.5/contracts/utils/structs/EnumerableSet.sol";

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
    event DelegationRegistryUpdated(address delegationRegistry);
    /**
     * @notice Allow holders of NFTs at addresses `_ownedNFTAddresses`, project
     * IDs `_ownedNFTProjectIds` to mint on project `_projectId`.
     * `_ownedNFTAddresses` assumed to be aligned with `_ownedNFTProjectIds`.
     * e.g. Allows holders of project `_ownedNFTProjectIds[0]` on token
     * contract `_ownedNFTAddresses[0]` to mint.
     */
    event AllowedHoldersOfProjects(
        uint256 indexed _projectId,
        address indexed _coreContract,
        address[] _ownedNFTAddresses,
        uint256[] _ownedNFTProjectIds
    );
    /**
     * @notice Remove holders of NFTs at addresses `_ownedNFTAddresses`,
     * project IDs `_ownedNFTProjectIds` to mint on project `_projectId`.
     * `_ownedNFTAddresses` assumed to be aligned with `_ownedNFTProjectIds`.
     * e.g. Removes holders of project `_ownedNFTProjectIds[0]` on token
     * contract `_ownedNFTAddresses[0]` from mint allowlist.
     */
    event RemovedHoldersOfProjects(
        uint256 indexed _projectId,
        address indexed _coreContract,
        address[] _ownedNFTAddresses,
        uint256[] _ownedNFTProjectIds
    );

    // position of Token Holder Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant TOKEN_HOLDER_LIB_STORAGE_POSITION =
        keccak256("tokenholderlib.storage");

    // Define one million to represent the base token ID for each project.
    uint256 constant ONE_MILLION = 1_000_000;

    struct HolderProjectConfig {
        // projects whose holders are allowed to purchase a token on `projectId`
        // ownedNFTAddress => ownedNFTProjectIds => bool
        mapping(address => mapping(uint256 => bool)) allowedProjectHolders;
    }

    // Diamond storage pattern is used in this library
    struct TokenHolderLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => HolderProjectConfig)) holderProjectConfigs;
    }

    /**
     * @dev Allows holders of specific project tokens.
     * @param _projectId Project ID to allowlist holders for.
     * @param _coreContract Core contract address to allowlist holders for.
     * @param _ownedNFTAddresses NFT core addresses of projects to be
     * allowlisted. Indexes must align with `_ownedNFTProjectIds`.
     * @param _ownedNFTProjectIds Project IDs on `_ownedNFTAddresses` whose
     * holders shall be allowlisted to mint project `_projectId`. Indexes must
     * align with `_ownedNFTAddresses`.
     */
    function allowHoldersOfProjects(
        uint256 _projectId,
        address _coreContract,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays neq length"
        );
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig(
                _projectId,
                _coreContract
            );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            holderProjectConfig.allowedProjectHolders[_ownedNFTAddresses[i]][
                _ownedNFTProjectIds[i]
            ] = true;
        }
        // emit approve event
        emit AllowedHoldersOfProjects(
            _projectId,
            _coreContract,
            _ownedNFTAddresses,
            _ownedNFTProjectIds
        );
    }

    /**
     * @dev Removes holders of specific project tokens.
     * @param _projectId Project ID to remove holders for.
     * @param _coreContract Core contract address to remove holders for.
     * @param _ownedNFTAddresses NFT core addresses of projects to be removed
     * from allowlist. Indexes must align with `_ownedNFTProjectIds`.
     * @param _ownedNFTProjectIds Project IDs on `_ownedNFTAddresses` whose
     * holders will be removed from allowlist to mint project `_projectId`.
     * Indexes must align with `_ownedNFTAddresses`.
     */
    function removeHoldersOfProjects(
        uint256 _projectId,
        address _coreContract,
        address[] memory _ownedNFTAddresses,
        uint256[] memory _ownedNFTProjectIds
    ) internal {
        require(
            _ownedNFTAddresses.length == _ownedNFTProjectIds.length,
            "TokenHolderLib: arrays neq length"
        );
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig(
                _projectId,
                _coreContract
            );
        for (uint256 i = 0; i < _ownedNFTAddresses.length; i++) {
            holderProjectConfig.allowedProjectHolders[_ownedNFTAddresses[i]][
                _ownedNFTProjectIds[i]
            ] = false;
        }
        // emit removed event
        emit RemovedHoldersOfProjects(
            _projectId,
            _coreContract,
            _ownedNFTAddresses,
            _ownedNFTProjectIds
        );
    }

    /**
     * @dev Allows and removes holders of specific project tokens in one operation.
     * @param _projectId Project ID to modify holders for.
     * @param _coreContract Core contract address to modify holders for.
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
    function allowAndRemoveHoldersOfProjects(
        uint256 _projectId,
        address _coreContract,
        address[] memory _ownedNFTAddressesAdd,
        uint256[] memory _ownedNFTProjectIdsAdd,
        address[] memory _ownedNFTAddressesRemove,
        uint256[] memory _ownedNFTProjectIdsRemove
    ) internal {
        allowHoldersOfProjects(
            _projectId,
            _coreContract,
            _ownedNFTAddressesAdd,
            _ownedNFTProjectIdsAdd
        );
        removeHoldersOfProjects(
            _projectId,
            _coreContract,
            _ownedNFTAddressesRemove,
            _ownedNFTProjectIdsRemove
        );
    }

    /**
     * @notice Verify that an NFT is owned by the target owner.
     * Reverts if target owner is not the owner of the NFT.
     * @dev Considered an interaction because calling ownerOf on an NFT
     * contract. Plan is to only integrate with AB/PBAB NFTs on the minter, but
     * in case other NFTs are registered, better to check here. Also,
     * function is non-reentrant, so this is extra cautious.
     */
    function validateNFTOwnership(
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId,
        address _targetOwner
    ) internal view {
        address actualNFTOwner = IERC721(_ownedNFTAddress).ownerOf(
            _ownedNFTTokenId
        );
        require(actualNFTOwner == _targetOwner, "Only owner of NFT");
    }

    /**
     * @dev Checks if a specific NFT is allowlisted.
     * @param _projectId Project ID to be checked.
     * @param _coreContract Core contract address to be checked.
     * @param _ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param _ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @return bool true if the NFT is allowlisted; false otherwise.
     */
    function isAllowlistedNFT(
        uint256 _projectId,
        address _coreContract,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) internal view returns (bool) {
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig(
                _projectId,
                _coreContract
            );
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            holderProjectConfig.allowedProjectHolders[_ownedNFTAddress][
                ownedNFTProjectId
            ];
    }

    /**
     * Loads the HolderProjectConfig for a given project and core contract.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getHolderProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (HolderProjectConfig storage) {
        return s().holderProjectConfigs[_coreContract][_projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SetPriceLibStorage struct.
     */
    function s()
        internal
        pure
        returns (TokenHolderLibStorage storage storageStruct)
    {
        bytes32 position = TOKEN_HOLDER_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
