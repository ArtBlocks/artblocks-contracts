// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for polyptych mints when purchasing.
 * @author Art Blocks Inc.
 */
interface ISharedMinterPolyptychV0 {
    /**
     * @notice Allows the artist to increment the minter to the next polyptych panel
     * @param _projectId Project ID to increment to its next polyptych panel
     * @param _coreContract Core contract address for the given project.
     */
    function incrementPolyptychProjectPanelId(
        uint256 _projectId,
        address _coreContract
    ) external;
}
