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
 * TODO - derive from IFilteredMinterV0 if generic events are not needed
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
    event ResetAuctionDetails(uint256 indexed projectId, uint256 priceAtReset);

    /// Maximum and minimum allowed price decay half lifes updated.
    event AuctionHalfLifeRangeSecondsUpdated(
        uint256 _minimumPriceDecayHalfLifeSeconds,
        uint256 _maximumPriceDecayHalfLifeSeconds
    );

    /// sellout price updated for project `projectId`.
    event SelloutPriceUpdated(
        uint256 indexed _projectId,
        uint256 _selloutPrice
    );

    /// admin validated a sellout price > base price for project `projectId`.
    event SelloutPriceValidated(
        uint256 indexed _projectId,
        uint256 _selloutPrice
    );

    /// artist and admin have withdrawn revenues from refundable purchases for
    /// project `projectId`.
    event ArtistAndAdminRevenuesWithdrawn(uint256 indexed _projectId);

    /// receipt has an updated state
    event ReceiptUpdated(
        address indexed _purchaser,
        uint256 indexed _projectId,
        uint256 _netPaid,
        uint256 _numPurchased
    );
}
