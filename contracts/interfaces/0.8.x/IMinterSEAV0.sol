// SPDX-License-Identifier: GPL-3.0
// Created By: Art Blocks Inc.

import "./IFilteredMinterV2.sol";

pragma solidity ^0.8.0;

/**
 * @title Interface for MinterSEA, inspired by nouns.wtf.
 * This interface combines the set of interfaces that add support for
 * a Serial English Auction Minter.
 * @author Art Blocks Inc.
 */
interface IMinterSEAV0 is IFilteredMinterV2 {
    /// Struct that defines a single token English auction
    struct Auction {
        // token number of NFT being auctioned
        uint256 tokenId;
        // The current highest bid amount (in wei)
        uint256 currentBid;
        // The time that the auction is scheduled to end
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 endTime;
        // The address of the current highest bid
        address payable bidder;
        // Whether or not the auction has been settled
        bool settled;
        // Whether or not the auction has been initialized (used to confirm
        // that auction is not a default struct)
        bool initialized;
    }

    /// Admin-controlled range of allowed auction durations updated
    event AuctionDurationSecondsRangeUpdated(
        uint256 minAuctionDurationSeconds,
        uint256 maxAuctionDurationSeconds
    );

    /// Admin-controlled minimum bid increment percentage updated
    event MinterMinBidIncrementPercentageUpdated(
        uint8 minBidIncrementPercentage
    );

    /// Admin-controlled time buffer updated
    event MinterTimeBufferUpdated(uint32 timeBuffer);

    /// Artist configured future auction details
    event ConfiguredFutureAuctions(
        uint256 _projectId,
        uint64 _timestampStart,
        uint32 _auctionDurationSeconds,
        uint256 _basePrice
    );

    /// Future auction details for project `_projectId` reset
    event ResetAuctionDetails(uint256 _projectId);

    /// New token auction created, token created and sent to minter
    event AuctionInitialized(
        uint256 indexed tokenId,
        address bidder,
        uint256 bidAmount,
        uint64 endTime
    );

    /// Successful bid placed on token auction
    event AuctionBid(
        uint256 indexed tokenId,
        address bidder,
        uint256 bidAmount
    );

    /// Token auction was settled (token distributed to winner)
    event AuctionSettled(
        uint256 indexed tokenId,
        address winner,
        uint256 price
    );

    function configureFutureAuctions(
        uint256 _projectId,
        uint256 _timestampStart,
        uint256 _auctionDurationSeconds,
        uint256 _basePrice
    ) external;

    function resetAuctionDetails(uint256 _projectId) external;

    function settleAndInitializeAuction(
        uint256 _settleTokenId,
        uint256 _initializeTokenId
    ) external;

    function settleAuction(uint256 _tokenId) external;

    function initializeAuction(uint256 _targetTokenId) external;

    function createBid(uint256 _tokenId) external payable;

    function createBid_4cM(uint256 _tokenId) external payable;

    function minterConfigurationDetails()
        external
        view
        returns (
            uint32 minAuctionDurationSeconds_,
            uint32 maxAuctionDurationSeconds_,
            uint8 minterMinBidIncrementPercentage_,
            uint32 minterTimeBufferSeconds_
        );

    function projectConfigurationDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            uint24 maxInvocations,
            uint64 timestampStart,
            uint32 auctionDurationSeconds,
            uint256 basePrice,
            Auction memory auction
        );

    function projectActiveAuctionDetails(
        uint256 _projectId
    ) external view returns (Auction memory);
}
