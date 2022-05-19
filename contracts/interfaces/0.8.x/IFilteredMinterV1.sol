// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV0.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV0 interface in order to
 * add support for generic project minter configuration updates.
 * @dev key values represent strings of finite length encoded in 32 bytes to
 * minimize gas.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterV1 is IFilteredMinterV0 {
    /// BOOL
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigSetValue(uint256 indexed _projectId, bytes32 _key, bool _value);

    /**
     * @notice Generic project minter configuration event. Removes key `_key`
     * from project `_projectId`'s project minter configuration.
     */
    event ConfigRemoveValue(
        uint256 indexed _projectId,
        bytes32 _key,
        bool _value
    );

    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of values at key `_key` for project `_projectId`.
     */
    event ConfigAddValueToSet(
        uint256 indexed _projectId,
        bytes32 _key,
        bool _value
    );

    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` from the set of values at key `_key` for project `_projectId`.
     * Value may or may not already exist in the set.
     */
    event ConfigRemoveValueFromSet(
        uint256 indexed _projectId,
        bytes32 _key,
        bool _value
    );

    /// UINT256
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigSetValue(
        uint256 indexed _projectId,
        bytes32 _key,
        uint256 _value
    );

    /**
     * @notice Generic project minter configuration event. Removes key `_key`
     * from project `_projectId`'s project minter configuration.
     */
    event ConfigRemoveValue(
        uint256 indexed _projectId,
        bytes32 _key,
        uint256 _value
    );

    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of values at key `_key` for project `_projectId`.
     */
    event ConfigAddValueToSet(
        uint256 indexed _projectId,
        bytes32 _key,
        uint256 _value
    );

    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` from the set of values at key `_key` for project `_projectId`.
     * Value may or may not already exist in the set.
     */
    event ConfigRemoveValueFromSet(
        uint256 indexed _projectId,
        bytes32 _key,
        uint256 _value
    );

    /// ADDRESS
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigSetValue(
        uint256 indexed _projectId,
        bytes32 _key,
        address _value
    );

    /**
     * @notice Generic project minter configuration event. Removes key `_key`
     * from project `_projectId`'s project minter configuration.
     */
    event ConfigRemoveValue(
        uint256 indexed _projectId,
        bytes32 _key,
        address _value
    );

    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of values at key `_key` for project `_projectId`.
     */
    event ConfigAddValueToSet(
        uint256 indexed _projectId,
        bytes32 _key,
        address _value
    );

    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` from the set of values at key `_key` for project `_projectId`.
     * Value may or may not already exist in the set.
     */
    event ConfigRemoveValueFromSet(
        uint256 indexed _projectId,
        bytes32 _key,
        address _value
    );

    /// BYTES32
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigSetValue(
        uint256 indexed _projectId,
        bytes32 _key,
        bytes32 _value
    );

    /**
     * @notice Generic project minter configuration event. Removes key `_key`
     * from project `_projectId`'s project minter configuration.
     */
    event ConfigRemoveValue(
        uint256 indexed _projectId,
        bytes32 _key,
        bytes32 _value
    );

    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of values at key `_key` for project `_projectId`.
     */
    event ConfigAddValueToSet(
        uint256 indexed _projectId,
        bytes32 _key,
        bytes32 _value
    );

    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` from the set of values at key `_key` for project `_projectId`.
     * Value may or may not already exist in the set.
     */
    event ConfigRemoveValueFromSet(
        uint256 indexed _projectId,
        bytes32 _key,
        bytes32 _value
    );

    /// STRING
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigSetValue(
        uint256 indexed _projectId,
        bytes32 _key,
        string _value
    );

    /**
     * @notice Generic project minter configuration event. Removes key `_key`
     * from project `_projectId`'s project minter configuration.
     */
    event ConfigRemoveValue(
        uint256 indexed _projectId,
        bytes32 _key,
        string _value
    );

    /**
     * @notice Generic project minter configuration event. Adds value `_value`
     * to the set of values at key `_key` for project `_projectId`.
     */
    event ConfigAddValueToSet(
        uint256 indexed _projectId,
        bytes32 _key,
        string _value
    );

    /**
     * @notice Generic project minter configuration event. Removes value
     * `_value` from the set of values at key `_key` for project `_projectId`.
     * Value may or may not already exist in the set.
     */
    event ConfigRemoveValueFromSet(
        uint256 indexed _projectId,
        bytes32 _key,
        string _value
    );
}
