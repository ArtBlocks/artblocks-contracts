// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {MerkleProof} from "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";
import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

/**
 * @title Art Blocks Generic Events Library
 * @notice This library is designed to define a set of generic events that all
 * shared minter libraries may utilize to populate indexed extra minter details
 * @author Art Blocks Inc.
 */
library GenericMinterEventsLib {
    // This section defines events for generic project minter configuration updates
    /**
     * @dev Strings not supported. Recommend conversion of (short) strings to
     * bytes32 to remain gas-efficient.
     */
    /**
     * @notice Generic project minter configuration event. Removes key `key`
     * for project `projectId`.
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
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed projectId,
        address indexed coreContract,
        bytes32 key,
        bytes32 value
    );
}
