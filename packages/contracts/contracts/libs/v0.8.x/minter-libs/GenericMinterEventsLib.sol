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
     * @notice Generic project minter configuration event. Removes key `_key`
     * for project `_projectId`.
     */
    event ConfigKeyRemoved(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key
    );
    /// BOOL
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bool _value
    );
    /// UINT256
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        uint256 _value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of uint256 at key `_key` for project `_projectId`.
     */
    event ConfigValueAddedToSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        uint256 _value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` to the set of uint256 at key `_key` for project `_projectId`.
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        uint256 _value
    );
    /// ADDRESS
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        address _value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of addresses at key `_key` for project `_projectId`.
     */
    event ConfigValueAddedToSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        address _value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` to the set of addresses at key `_key` for project `_projectId`.
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        address _value
    );
    /// BYTES32
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bytes32 _value
    );
    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of bytes32 at key `_key` for project `_projectId`.
     */
    event ConfigValueAddedToSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bytes32 _value
    );
    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` to the set of bytes32 at key `_key` for project `_projectId`.
     */
    event ConfigValueRemovedFromSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bytes32 _value
    );
}
