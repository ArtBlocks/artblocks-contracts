// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

/**
 * @title Art Blocks SEA Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * Structs and functions that help with serial English auction minters.
 * @author Art Blocks Inc.
 */

library SEALib {
    using SafeCast for uint256;

    uint256 constant ONE_MILLION = 1_000_000;

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
     * Overwrite the active auction for a project with a new auction.
     * @dev This function is used to initialize a new auction. Care must be
     * taken to ensure that the existing auction is fully complete and settled.
     * @param _SEAProjectConfig SEAProjectConfig to update
     * @param _targetTokenId token ID to create the auction for
     * @param _bidAmount initial bid amount
     * @param _bidder initial bidder's payable address
     * @return endTime end time of the newly created auction
     */
    function OverwriteProjectActiveAuction(
        SEAProjectConfig storage _SEAProjectConfig,
        uint256 _targetTokenId,
        uint256 _bidAmount,
        address payable _bidder
    ) internal returns (uint64 endTime) {
        // calculate auction end time
        endTime = (block.timestamp + _SEAProjectConfig.auctionDurationSeconds)
            .toUint64();
        // set active auction on SEAProjectConfig
        _SEAProjectConfig.activeAuction = Auction({
            tokenId: _targetTokenId,
            currentBid: _bidAmount,
            currentBidder: _bidder,
            endTime: endTime,
            settled: false
        });
        return endTime;
    }

    /**
     * @notice Determines if a project is configured or not on this minter.
     * Uses project config's `auctionDurationSeconds` to determine if project
     * is configured, because `auctionDurationSeconds` is required to be
     * non-zero when configured.
     * @param _SEAProjectConfig The project config to check.
     */
    function projectIsConfigured(
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
    function auctionIsInitialized(
        Auction storage _auction
    ) internal view returns (bool isInitialized) {
        // auction is initialized if currentBidder is non-zero
        return _auction.currentBidder != address(0);
    }

    /**
     * Returns bool representing if an auction is accepting bids above base
     * price. It is accepting bids if it is initialized and has not reached its
     * end time.
     * @param _auction The auction to check.
     */
    function auctionIsAcceptingIncreasingBids(
        Auction storage _auction
    ) internal view returns (bool isAcceptingBids) {
        // auction is accepting bids if it is initialized and has not reached
        // its end time
        isAcceptingBids = (auctionIsInitialized(_auction) &&
            block.timestamp < _auction.endTime);
        return isAcceptingBids;
    }

    /**
     * @notice SEAProjectConfig => active auction details.
     * @dev reverts if no auction exists for the project.
     * @param _SEAProjectConfig SEAProjectConfig to query
     */
    function projectActiveAuctionDetails(
        SEAProjectConfig storage _SEAProjectConfig
    ) internal view returns (Auction memory auction) {
        SEALib.Auction storage _auction = _SEAProjectConfig.activeAuction;
        // do not return uninitialized auctions (i.e. auctions that do not
        // exist, where currentBidder is still the default value)
        require(
            SEALib.auctionIsInitialized(_auction),
            "No auction exists on project"
        );
        // load entire auction into memory
        auction = _SEAProjectConfig.activeAuction;
        return auction;
    }

    /**
     * @notice Convenience function that returns either the current token ID
     * being auctioned, or the next expected token ID to be auction if no
     * auction is currently initialized or if the current auction has concluded
     * (block.timestamp > auction.endTime).
     * This is intended to be useful for frontends or scripts that intend to
     * call `createBid` or `settleAuctionAndCreateBid`, which requires a
     * target bid token ID to be passed in as an argument.
     * The function reverts if a project does not have an active auction and
     * the next expected token ID has not been populated.
     * @param _SEAProjectConfig SEAProjectConfig to query
     * @param _projectId The project ID being queried
     * @return The current token ID being auctioned, or the next token ID to be
     * auctioned if a new auction is ready to be created.
     */
    function getTokenToBid(
        SEAProjectConfig storage _SEAProjectConfig,
        uint256 _projectId
    ) internal view returns (uint256) {
        Auction storage _auction = _SEAProjectConfig.activeAuction;
        // if project has an active token auction that is not settled, return
        // that token ID
        if (
            auctionIsInitialized(_auction) &&
            (_auction.endTime > block.timestamp)
        ) {
            return _auction.tokenId;
        }
        // otherwise, return the next expected token ID to be auctioned.
        return getNextTokenId(_SEAProjectConfig, _projectId);
    }

    /**
     * @notice View function that returns the next token ID to be auctioned
     * by this minter for project `_projectId`.
     * Reverts if the next token ID has not been populated for the project.
     * @param _SEAProjectConfig SEAProjectConfig to query
     * @param _projectId The project ID being queried
     */
    function getNextTokenId(
        SEAProjectConfig storage _SEAProjectConfig,
        uint256 _projectId
    ) internal view returns (uint256 nextTokenId) {
        if (!_SEAProjectConfig.nextTokenNumberIsPopulated) {
            revert("Next token not populated");
        }
        // @dev overflow automatically checked in Solidity ^0.8.0
        nextTokenId =
            (_projectId * ONE_MILLION) +
            _SEAProjectConfig.nextTokenNumber;
        return nextTokenId;
    }

    /**
     * Returns the minimum next bid amount, given the previous bid amount and
     * the project's configured minimum bid increment percentage.
     * @param _SEAProjectConfig SEAProjectConfig to query
     * @param _previousBid The previous bid amount
     */
    function getMinimumNextBid(
        SEAProjectConfig storage _SEAProjectConfig,
        uint256 _previousBid
    ) internal view returns (uint256 minimumNextBid) {
        // @dev overflow automatically checked in Solidity ^0.8.0
        return
            (_previousBid *
                (100 + _SEAProjectConfig.minBidIncrementPercentage)) / 100;
    }
}