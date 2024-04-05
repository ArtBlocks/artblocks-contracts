// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";

/**
 * @title This interface is intended to house interface items that are common
 * across all GenArt721CoreContractV3 flagship and derivative implementations
 * that support Royalty Splitters.
 * @author Art Blocks Inc.
 */
interface IGenArt721CoreContractV3_RoyaltySplitters {
    /**
     * @notice Project's royalty splitter was updated to `_splitter`.
     * @param projectId The project ID.
     * @param royaltySplitter The new splitter address to receive royalties.
     */
    event ProjectRoyaltySplitterUpdated(
        uint256 indexed projectId,
        address indexed royaltySplitter
    );
}
