// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for polyptych mints when purchasing.
 * @author Art Blocks Inc.
 */
interface ISharedMinterPolyptychV0 {
    // Emitted when the polyptych panel ID of a project is updated.
    event UpdatedPolyptychProjectPanelId(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 polyptychPanelId
    );
}
