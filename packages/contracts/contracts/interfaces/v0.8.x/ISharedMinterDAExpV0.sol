// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDAExpV0 {
    event SetAuctionDetailsExp(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint40 _auctionTimestampStart,
        uint40 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    );
    /// Minimum allowed price decay half life seconds updated.
    event AuctionMinHalfLifeSecondsUpdated(
        uint256 _minimumPriceDecayHalfLifeSeconds
    );

    function minimumPriceDecayHalfLifeSeconds() external view returns (uint256);

    function setMinimumPriceDecayHalfLifeSeconds(
        uint256 _minimumPriceDecayHalfLifeSeconds
    ) external;
}
