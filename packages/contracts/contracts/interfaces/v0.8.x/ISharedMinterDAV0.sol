// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDAV0 {
    event SetAuctionDetails(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _startPrice,
        uint256 _basePrice
    );

    /// Auction details cleared for project `projectId`.
    event ResetAuctionDetails(
        uint256 indexed _projectId,
        address indexed _coreContract
    );
}
