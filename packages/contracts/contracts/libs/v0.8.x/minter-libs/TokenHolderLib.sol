// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin-4.7/contracts/token/ERC721/IERC721.sol";

import {ABHelpers} from "../ABHelpers.sol";

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
    /**
     * @notice Notifies of the contracts' current delegation registry address.
     * @param delegationRegistry The address of the delegation registry
     */
    event DelegationRegistryUpdated(address delegationRegistry);
    /**
     * @notice Allow holders of NFTs at addresses `ownedNFTAddresses`, project
     * IDs `ownedNFTProjectIds` to mint on project `projectId`.
     * `ownedNFTAddresses` assumed to be aligned with `ownedNFTProjectIds`.
     * e.g. Allows holders of project `ownedNFTProjectIds[0]` on token
     * contract `ownedNFTAddresses[0]` to mint.
     * @param projectId Project ID to allowlist holders for.
     * @param coreContract Core contract address to allowlist holders for.
     * @param ownedNFTAddresses NFT core addresses of projects to be
     * allowlisted. Indexes align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders shall be allowlisted to mint project `projectId`. Indexes
     * align with `ownedNFTAddresses`.
     */
    event AllowedHoldersOfProjects(
        uint256 indexed projectId,
        address indexed coreContract,
        address[] ownedNFTAddresses,
        uint256[] ownedNFTProjectIds
    );
    /**
     * @notice Remove holders of NFTs at addresses `ownedNFTAddresses`,
     * project IDs `ownedNFTProjectIds` to mint on project `projectId`.
     * `ownedNFTAddresses` assumed to be aligned with `ownedNFTProjectIds`.
     * e.g. Removes holders of project `ownedNFTProjectIds[0]` on token
     * contract `ownedNFTAddresses[0]` from mint allowlist.
     * @param projectId Project ID to remove holders for.
     * @param coreContract Core contract address to remove holders for.
     * @param ownedNFTAddresses NFT core addresses of projects to be removed
     * from allowlist. Indexes align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders will be removed from allowlist to mint project `projectId`.
     * Indexes align with `ownedNFTAddresses`.
     */
    event RemovedHoldersOfProjects(
        uint256 indexed projectId,
        address indexed coreContract,
        address[] ownedNFTAddresses,
        uint256[] ownedNFTProjectIds
    );

    // position of Token Holder Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant TOKEN_HOLDER_LIB_STORAGE_POSITION =
        keccak256("tokenholderlib.storage");

    struct HolderProjectConfig {
        // projects whose holders are allowed to purchase a token on `projectId`
        mapping(address ownedNFTAddress => mapping(uint256 ownedNFTProjectId => bool allowed)) allowedProjectHolders;
    }

    // Diamond storage pattern is used in this library
    struct TokenHolderLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => HolderProjectConfig)) holderProjectConfigs;
    }

    /**
     * @notice Allows holders of specific project tokens.
     * @param projectId Project ID to allowlist holders for.
     * @param coreContract Core contract address to allowlist holders for.
     * @param ownedNFTAddresses NFT core addresses of projects to be
     * allowlisted. Indexes must align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders shall be allowlisted to mint project `projectId`. Indexes must
     * align with `ownedNFTAddresses`.
     */
    function allowHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] calldata ownedNFTAddresses,
        uint256[] calldata ownedNFTProjectIds
    ) internal {
        require(
            ownedNFTAddresses.length == ownedNFTProjectIds.length,
            "TokenHolderLib: arrays neq length"
        );
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 ownedNFTLoopLength = ownedNFTAddresses.length;
        for (uint256 i; i < ownedNFTLoopLength; ) {
            holderProjectConfig.allowedProjectHolders[ownedNFTAddresses[i]][
                    ownedNFTProjectIds[i]
                ] = true;
            // gas-efficient loop increment
            unchecked {
                ++i;
            }
        }
        // emit approve event
        emit AllowedHoldersOfProjects({
            projectId: projectId,
            coreContract: coreContract,
            ownedNFTAddresses: ownedNFTAddresses,
            ownedNFTProjectIds: ownedNFTProjectIds
        });
    }

    /**
     * @notice Removes holders of specific project tokens.
     * @param projectId Project ID to remove holders for.
     * @param coreContract Core contract address to remove holders for.
     * @param ownedNFTAddresses NFT core addresses of projects to be removed
     * from allowlist. Indexes must align with `ownedNFTProjectIds`.
     * @param ownedNFTProjectIds Project IDs on `ownedNFTAddresses` whose
     * holders will be removed from allowlist to mint project `projectId`.
     * Indexes must align with `ownedNFTAddresses`.
     */
    function removeHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] calldata ownedNFTAddresses,
        uint256[] calldata ownedNFTProjectIds
    ) internal {
        require(
            ownedNFTAddresses.length == ownedNFTProjectIds.length,
            "TokenHolderLib: arrays neq length"
        );
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 ownedNFTLoopLength = ownedNFTAddresses.length;
        for (uint256 i; i < ownedNFTLoopLength; ) {
            holderProjectConfig.allowedProjectHolders[ownedNFTAddresses[i]][
                    ownedNFTProjectIds[i]
                ] = false;
            // gas-efficient loop increment
            unchecked {
                ++i;
            }
        }
        // emit removed event
        emit RemovedHoldersOfProjects({
            projectId: projectId,
            coreContract: coreContract,
            ownedNFTAddresses: ownedNFTAddresses,
            ownedNFTProjectIds: ownedNFTProjectIds
        });
    }

    /**
     * @notice Allows and removes holders of specific project tokens in one
     * operation.
     * @param projectId Project ID to modify holders for.
     * @param coreContract Core contract address to modify holders for.
     * @param ownedNFTAddressesAdd NFT core addresses of projects to be
     * allowlisted. Indexes must align with `ownedNFTProjectIdsAdd`.
     * @param ownedNFTProjectIdsAdd Project IDs on `ownedNFTAddressesAdd`
     * whose holders shall be allowlisted to mint project `projectId`. Indexes
     * must align with `ownedNFTAddressesAdd`.
     * @param ownedNFTAddressesRemove NFT core addresses of projects to be
     * removed from allowlist. Indexes must align with
     * `ownedNFTProjectIdsRemove`.
     * @param ownedNFTProjectIdsRemove Project IDs on
     * `ownedNFTAddressesRemove` whose holders will be removed from allowlist
     * to mint project `projectId`. Indexes must align with
     * `ownedNFTAddressesRemove`.
     */
    function allowAndRemoveHoldersOfProjects(
        uint256 projectId,
        address coreContract,
        address[] calldata ownedNFTAddressesAdd,
        uint256[] calldata ownedNFTProjectIdsAdd,
        address[] calldata ownedNFTAddressesRemove,
        uint256[] calldata ownedNFTProjectIdsRemove
    ) internal {
        allowHoldersOfProjects({
            projectId: projectId,
            coreContract: coreContract,
            ownedNFTAddresses: ownedNFTAddressesAdd,
            ownedNFTProjectIds: ownedNFTProjectIdsAdd
        });
        removeHoldersOfProjects({
            projectId: projectId,
            coreContract: coreContract,
            ownedNFTAddresses: ownedNFTAddressesRemove,
            ownedNFTProjectIds: ownedNFTProjectIdsRemove
        });
    }

    /**
     * @notice Verify that an NFT is owned by the target owner.
     * Reverts if target owner is not the owner of the NFT.
     * @dev Considered an interaction because calling ownerOf on an NFT
     * contract. Plan is to only integrate with AB/PBAB NFTs on the minter, but
     * in case other NFTs are registered, better to check here. Also,
     * function is non-reentrant, so this is extra cautious.
     * @param ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @param targetOwner Target owner address to check.
     */
    function validateNFTOwnership(
        address ownedNFTAddress,
        uint256 ownedNFTTokenId,
        address targetOwner
    ) internal view {
        address actualNFTOwner = IERC721(ownedNFTAddress).ownerOf(
            ownedNFTTokenId
        );
        require(actualNFTOwner == targetOwner, "Only owner of NFT");
    }

    /**
     * @notice Checks if a specific NFT is allowlisted.
     * @param projectId Project ID to be checked.
     * @param coreContract Core contract address to be checked.
     * @param ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @return bool true if the NFT is allowlisted; false otherwise.
     */
    function isAllowlistedNFT(
        uint256 projectId,
        address coreContract,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) internal view returns (bool) {
        HolderProjectConfig
            storage holderProjectConfig = getHolderProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 ownedNFTProjectId = ABHelpers.tokenIdToProjectId(
            ownedNFTTokenId
        );
        return
            holderProjectConfig.allowedProjectHolders[ownedNFTAddress][
                ownedNFTProjectId
            ];
    }

    /**
     * @notice Loads the HolderProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getHolderProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (HolderProjectConfig storage) {
        return s().holderProjectConfigs[coreContract][projectId];
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
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
