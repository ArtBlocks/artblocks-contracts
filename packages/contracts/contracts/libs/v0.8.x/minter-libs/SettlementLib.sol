// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Settlement Library
 * @notice
 * @author Art Blocks Inc.
 */

library SettlementLib {
    struct SettlementAuctionProjectConfig {
        // set to true only after artist + admin revenues have been collected
        bool auctionRevenuesCollected;
        // number of tokens minted that have potential of future settlement.
        // max uint24 > 16.7 million tokens > 1 million tokens/project max
        uint24 numSettleableInvocations;
        // When non-zero, this value is used as a reference when an auction is
        // reset by admin, and then a new auction is configured by an artist.
        // In that case, the new auction will be required to have a starting
        // price less than or equal to this value, if one or more purchases
        // have been made on this minter.
        uint256 latestPurchasePrice;
    }

    struct Receipt {
        // max uint232 allows for > 1e51 ETH (much more than max supply)
        uint232 netPosted;
        // max uint24 still allows for > max project supply of 1 million tokens
        uint24 numPurchased;
    }

    function adminEmergencyReduceSelloutPrice(
        uint256 _projectId,
        uint256 _newSelloutPrice
    ) external;

    function withdrawArtistAndAdminRevenues(uint256 _projectId) external;

    function reclaimProjectExcessSettlementFunds(
        address payable _to,
        uint256 _projectId
    )
        external
        returns (uint256 excessSettlementFunds, uint256 requiredAmountPosted);
}
