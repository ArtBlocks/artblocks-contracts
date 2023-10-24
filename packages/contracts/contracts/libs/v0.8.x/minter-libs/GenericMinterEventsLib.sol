// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Generic Events Library
 * @notice This library is designed to define a set of generic events that all
 * shared minter libraries may utilize to populate indexed extra minter details
 * @dev Strings not supported. Recommend conversion of (short) strings to
 * bytes32 to remain gas-efficient.
 * @author Art Blocks Inc.
 */
library GenericMinterEventsLib {
    /**
     * @notice Generic project minter configuration event. Removes key `key`
     * for project `projectId`.
     * @param projectId Project ID to remove key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to remove
     */
    event ConfigKeyRemoved(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key
    );
    /// BOOL
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `key` to `value` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to set
     * @param value Value to set key to
     */
    event ConfigValueSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        bool value
    );
    /// UINT256
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `key` to `value` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to set
     * @param value Value to set key to
     */
    event ConfigValueSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        uint256 value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `value`
     * to the set of uint256 at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value to add to the key's set
     */
    event ConfigValueAddedToSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        uint256 value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `value` to the set of uint256 at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value removed from the key's set
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        uint256 value
    );
    /// ADDRESS
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `key` to `value` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to set
     * @param value Value to set key to
     */
    event ConfigValueSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        address value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `value`
     * to the set of addresses at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value to add to the key's set
     */
    event ConfigValueAddedToSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        address value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `value` to the set of addresses at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value removed from the key's set
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        address value
    );
    /// BYTES32
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `key` to `value` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to set
     * @param value Value to set key to
     */
    event ConfigValueSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        bytes32 value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `value`
     * to the set of bytes32 at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value to add to the key's set
     */
    event ConfigValueAddedToSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        bytes32 value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `value` to the set of bytes32 at key `key` for project `projectId`.
     * @param projectId Project ID to set key for
     * @param coreContract Core contract address that projectId is on
     * @param key Key to modify
     * @param value Value removed from the key's set
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        bytes32 value
    );
}
