// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

/**
 * @title Art Blocks On-Chain Allowlist Library
 * @notice This library is designed to manage on-chain address allowlists for
 * Art Blocks projects. It provides functionalities such as adding and removing
 * addresses from a project's allowlist, and verifying if an address is on the
 * allowlist.
 * @author Art Blocks Inc.
 */

library OnChainAllowlistLib {
    // position of On-Chain Allowlist Lib storage, using a diamond storage
    // pattern for this library
    bytes32 constant ON_CHAIN_ALLOWLIST_LIB_STORAGE_POSITION =
        keccak256("onchainallowlistlib.storage");

    bytes32 internal constant CONFIG_ALLOWLIST = "allowlist";

    struct OnChainAllowlistProjectConfig {
        mapping(address wallet => bool isAllowlisted) allowlist;
    }

    // Diamond storage pattern is used in this library
    struct OnChainAllowlistLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => OnChainAllowlistProjectConfig)) onChainAllowlistProjectConfigs;
    }

    /**
     * @notice Adds addresses to the allowlist for a project.
     * @param projectId Project ID to add addresses to the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param addresses Array of addresses to add to the allowlist.
     */
    function addAddressesToAllowlist(
        uint256 projectId,
        address coreContract,
        address[] calldata addresses
    ) internal {
        OnChainAllowlistProjectConfig
            storage config = getOnChainAllowlistProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 length = addresses.length;
        for (uint256 i; i < length; ) {
            config.allowlist[addresses[i]] = true;
            emit GenericMinterEventsLib.ConfigValueAddedToSet({
                projectId: projectId,
                coreContract: coreContract,
                key: CONFIG_ALLOWLIST,
                value: addresses[i]
            });
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Removes addresses from the allowlist for a project.
     * @param projectId Project ID to remove addresses from the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param addresses Array of addresses to remove from the allowlist.
     */
    function removeAddressesFromAllowlist(
        uint256 projectId,
        address coreContract,
        address[] calldata addresses
    ) internal {
        OnChainAllowlistProjectConfig
            storage config = getOnChainAllowlistProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 length = addresses.length;
        for (uint256 i; i < length; ) {
            config.allowlist[addresses[i]] = false;
            emit GenericMinterEventsLib.ConfigValueRemovedFromSet({
                projectId: projectId,
                coreContract: coreContract,
                key: CONFIG_ALLOWLIST,
                value: addresses[i]
            });
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Checks that a given address is on the allowlist for a project.
     * @dev Reverts if the address is not on the allowlist.
     * @param projectId Project ID to check the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param sender Address to check against the allowlist.
     */
    function preMintChecks(
        uint256 projectId,
        address coreContract,
        address sender
    ) internal view {
        require(
            isAllowlisted({
                projectId: projectId,
                coreContract: coreContract,
                wallet: sender
            }),
            "Only allowlisted addresses"
        );
    }

    /**
     * @notice Returns whether an address is on the allowlist for a project.
     * @param projectId Project ID to check the allowlist for.
     * @param coreContract Core contract address for the given project.
     * @param wallet Address to check.
     * @return bool True if the address is on the allowlist, false otherwise.
     */
    function isAllowlisted(
        uint256 projectId,
        address coreContract,
        address wallet
    ) internal view returns (bool) {
        return
            getOnChainAllowlistProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            }).allowlist[wallet];
    }

    /**
     * Loads the OnChainAllowlistProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getOnChainAllowlistProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (OnChainAllowlistProjectConfig storage) {
        return s().onChainAllowlistProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The OnChainAllowlistLibStorage struct.
     */
    function s()
        internal
        pure
        returns (OnChainAllowlistLibStorage storage storageStruct)
    {
        bytes32 position = ON_CHAIN_ALLOWLIST_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
