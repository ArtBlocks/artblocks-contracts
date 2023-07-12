// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for serial English auction minting.
 * @author Art Blocks Inc.
 */
interface ISharedMinterSEAV0 {
    /**
     * @notice Minimum auction length, in seconds, was updated to be the
     * provided value.
     */
    event MinAuctionDurationSecondsUpdated(uint256 minAuctionDurationSeconds);

    /// Admin-controlled time buffer updated
    event MinterTimeBufferUpdated(uint32 minterTimeBufferSeconds);

    // Admin-controlled refund gas limit updated
    event MinterRefundGasLimitUpdated(uint24 refundGasLimit);

    /// Artist configured future auction details
    event ConfiguredFutureAuctions(
        uint256 indexed projectId,
        address indexed coreContract,
        uint64 timestampStart,
        uint32 auctionDurationSeconds,
        uint256 basePrice,
        uint8 minBidIncrementPercentage
    );

    /// New token auction created, token created and sent to minter
    event AuctionInitialized(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed bidder,
        uint256 bidAmount,
        uint64 endTime
    );

    /// Successful bid placed on token auction
    event AuctionBid(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed bidder,
        uint256 bidAmount
    );

    /// Token auction was settled (token distributed to winner)
    event AuctionSettled(
        uint256 indexed tokenId,
        address indexed coreContract,
        address indexed winner,
        uint256 price
    );

    /// Future auction details for project `projectId` reset
    event ResetAuctionDetails(
        uint256 indexed projectId,
        address indexed coreContract
    );

    // Next token ID for project `projectId` updated
    event ProjectNextTokenUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 tokenId
    );

    // Next token ID for project `projectId` was ejected from the minter
    // and is no longer populated
    event ProjectNextTokenEjected(
        uint256 indexed projectId,
        address indexed coreContract
    );

    // // Triggers a purchase of a token from the desired project, to the
    // // TX-sending address, using owned ERC-721 NFT to claim right to purchase.
    // function purchase(
    //     uint256 _projectId,
    //     address _coreContract,
    //     address _ownedNFTAddress,
    //     uint256 _ownedNFTTokenId
    // ) external payable returns (uint256 tokenId);

    // // Triggers a purchase of a token from the desired project, to the specified
    // // receiving address, using owned ERC-721 NFT to claim right to purchase.
    // function purchaseTo(
    //     address _to,
    //     uint256 _projectId,
    //     address _coreContract,
    //     address _ownedNFTAddress,
    //     uint256 _ownedNFTTokenId
    // ) external payable returns (uint256 tokenId);

    // // Triggers a purchase of a token from the desired project, on behalf of
    // // the provided vault, to the specified receiving address, using owned
    // // ERC-721 NFT to claim right to purchase.
    // function purchaseTo(
    //     address _to,
    //     uint256 _projectId,
    //     address _coreContract,
    //     address _ownedNFTAddress,
    //     uint256 _ownedNFTTokenId,
    //     address _vault
    // ) external payable returns (uint256 tokenId);
}
