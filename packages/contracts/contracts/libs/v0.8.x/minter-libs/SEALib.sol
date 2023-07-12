// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks SEA Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * Structs and functions that help with serial English auction minters.
 * @author Art Blocks Inc.
 */

library SEALib {
    // project-specific parameters
    struct SEAProjectConfig {
        uint64 timestampStart;
        // duration of each new auction, before any extensions due to late bids
        // @dev for configured auctions, this will be gt 0, so it may be used
        // to determine if an auction is configured
        uint32 auctionDurationSeconds;
        // minimum bid increment percentage. each subsequent bid must be at
        // least this percentage greater than the previous bid. the value is
        // expressed as a whole percentage, e.g. 5% is 5, 10% is 10, etc.
        // @dev this is a project-level constraint, defined by the artist.
        // recommended values are between 5 and 10 percent.
        // max uint8 = 255, so max value is 255% (which is more than expected
        // to be used)
        uint8 minBidIncrementPercentage;
        // next token number to be auctioned, owned by minter
        // @dev store token number to enable storage packing, as token ID can
        // be derived from this value in combination with project ID
        // max uint24 ~= 1.6e7, > max possible project invocations of 1e6
        uint24 nextTokenNumber;
        // bool to indicate if next token number has been populated, or is
        // still default value of 0
        // @dev required to handle edge case where next token number is 0
        bool nextTokenNumberIsPopulated;
        // reserve price, i.e. minimum starting bid price, in wei
        uint256 basePrice;
        // active auction for project
        Auction activeAuction;
    }

    /// Struct that defines a single token English auction
    struct Auction {
        // token number of NFT being auctioned
        uint256 tokenId;
        // The current highest bid amount (in wei)
        uint256 currentBid;
        // The address of the current highest bidder
        // @dev if this is not the zero address, then the auction is
        // considered initialized
        address payable currentBidder;
        // The time that the auction is scheduled to end
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 endTime;
        // Whether or not the auction has been settled
        bool settled;
    }

    /**
     * @notice Determines if a project is configured or not on this minter.
     * Uses project config's `auctionDurationSeconds` to determine if project
     * is configured, because `auctionDurationSeconds` is required to be
     * non-zero when configured.
     * @param _SEAProjectConfig The project config to check.
     */
    function _projectIsConfigured(
        SEAProjectConfig storage _SEAProjectConfig
    ) internal view returns (bool) {
        return _SEAProjectConfig.auctionDurationSeconds != 0;
    }

    /**
     * @notice Determines if an auction is initialized.
     * Uses auction's `currentBidder` address to determine if auction is
     * initialized, because `currentBidder` is always non-zero after an auction
     * has been initialized.
     * @param _auction The auction to check.
     */
    function _auctionIsInitialized(
        Auction storage _auction
    ) internal view returns (bool isInitialized) {
        // auction is initialized if currentBidder is non-zero
        return _auction.currentBidder != address(0);
    }
}
