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
    // Function returns the minter type, and is called by the MinterFilter for
    // metadata purposes.
    function minterType() external view returns (string memory);

    // Function returns the minter's associated shared minter filter address,
    // and is called by subgraph indexing service for entity relation purposes.
    function minterFilterAddress() external returns (address);
}
