// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IGenArt721CoreV2_PBAB.sol";

pragma solidity ^0.8.0;

interface IGenArt721CoreV2WithEvents is IGenArt721CoreV2_PBAB {
    /**
     * @notice Project ID `_projectId` updated on field `_update`.
     */
    event ProjectUpdated(uint256 indexed _projectId, bytes32 indexed _update);

    /**
     * @notice Platform updated on field `_field`.
     */
    event PlatformUpdated(bytes32 indexed _field);

    /**
     * @notice Allowlist updated with bool `_isApproved` on address `_address`.
     */
    event AllowlistUpdated(address indexed _address, bool _isApproved);

    /**
     * @notice Mint aAllowlist updated with bool `_isApproved` on address `_address`.
     */
    event MintAllowlistUpdated(address indexed _address, bool _isApproved);
}
