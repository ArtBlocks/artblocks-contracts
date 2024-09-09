// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title ISharedMinterRequired
 * @notice This interface contains the minimum required interface for a shared
 * minter contract. All custom, one-off minter contracts should implement this
 * interface.
 */
interface ISharedMinterRequired {
    /**
     * @notice Returns the minter's type, used by the minter filter for metadata
     * purposes.
     * @return The minter type.
     */
    function minterType() external view returns (string memory);

    /**
     * @notice Returns the minter's associated shared minter filter address.
     * @dev used by subgraph indexing service for entity relation purposes.
     * @return The minter filter address.
     */
    function minterFilterAddress() external returns (address);
}
