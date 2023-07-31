// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDALinV0 {
    event SetAuctionDetailsLin(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint64 _auctionTimestampStart,
        uint64 _auctionTimestampEnd,
        uint128 _startPrice,
        uint128 _basePrice
    );

    /// Minimum allowed auction length updated
    event AuctionMinimumLengthSecondsUpdated(
        uint256 _minimumAuctionLengthSeconds
    );

    function minimumAuctionLengthSeconds() external view returns (uint256);

    function setMinimumAuctionLengthSeconds(
        uint256 _minimumAuctionLengthSeconds
    ) external;
}
