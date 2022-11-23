// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV1.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV1 interface in order to
 * add support for generic project minter configuration updates.
 * @dev keys represent strings of finite length encoded in bytes32 to minimize
 * gas.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterDAExpRefundV0 is IFilteredMinterV1 {
    /// Auction details updated for project `projectId`.
    event SetAuctionDetails(
        uint256 indexed projectId,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    );

    /// Auction details cleared for project `projectId`.
    /// At time of reset, the project has had `numPurchases` purchases on this
    /// minter, with a most recent purchase price of `latestPurchasePrice`. If
    /// the number of purchases is 0, the latest purchase price will have a
    /// dummy value of 0.
    event ResetAuctionDetails(
        uint256 indexed projectId,
        uint256 numPurchases,
        uint256 latestPurchasePrice
    );

    /// Maximum and minimum allowed price decay half lifes updated.
    event AuctionHalfLifeRangeSecondsUpdated(
        uint256 _minimumPriceDecayHalfLifeSeconds,
        uint256 _maximumPriceDecayHalfLifeSeconds
    );

    /// sellout price updated for project `projectId`.
    /// @dev does not use generic event because likely will trigger additional
    /// actions in indexing layer
    event SelloutPriceUpdated(
        uint256 indexed _projectId,
        uint256 _selloutPrice
    );

    /// artist and admin have withdrawn revenues from refundable purchases for
    /// project `projectId`.
    /// @dev does not use generic event because likely will trigger additional
    /// actions in indexing layer
    event ArtistAndAdminRevenuesWithdrawn(uint256 indexed _projectId);

    /// receipt has an updated state
    event ReceiptUpdated(
        address indexed _purchaser,
        uint256 indexed _projectId,
        uint256 _netPaid,
        uint256 _numPurchased
    );

    /// returns latest purchase price for project `_projectId`, or 0 if no
    /// purchases have been made.
    function getProjectLatestPurchasePrice(uint256 _projectId)
        external
        view
        returns (uint256 latestPurchasePrice);

    /// returns the number of refundable invocations for project `_projectId`.
    function getNumRefundableInvocations(uint256 _projectId)
        external
        view
        returns (uint256 numRefundableInvocations);
}
