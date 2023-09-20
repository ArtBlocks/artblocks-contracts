// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDAV0 {
    /// Auction details cleared for project `projectId`.
    event ResetAuctionDetails(
        uint256 indexed _projectId,
        address indexed _coreContract
    );

    // @dev return variables left unnamed because specific minter
    // implementations may return different values for the same slots
    function projectAuctionParameters(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint40, uint40, uint256, uint256);
}
