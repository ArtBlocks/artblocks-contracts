// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title IClaimMinter
 * @author Art Blocks Inc.
 * @notice Interface for the ClaimMinter contract that enables admin to pre-mint tokens
 * for a project and allows collectors to claim tokens in an arbitrary order with
 * configurable pricing.
 */
interface IClaimMinter {
    // Events
    event PriceConfigured(uint256 basePriceInWei, uint256 priceIncrementInWei);
    event TimestampStartConfigured(uint256 timestampStart);
    event TokensPreMinted(uint256 amount);
    event TokenClaimed(
        uint256 indexed tokenId,
        address indexed claimant,
        uint256 price
    );
    event TokenWithdrawnAfterAuction(
        uint256 indexed tokenNumber,
        address indexed toAddress
    );

    /**
     * @notice Returns all claimed bitmaps
     * @return An array of all claimed bitmaps
     */
    function getAllClaimedBitmaps() external view returns (string memory);

    /**
     * @notice Sets the base price in wei for token 0 and the price increment in wei.
     * Only callable by the core contract's Admin ACL.
     * @param basePriceInWei_ Base price in wei for token 0.
     * @param priceIncrementInWei_ Price increment in wei.
     */
    function configurePricePerTokenInWei(
        uint256 basePriceInWei_,
        uint256 priceIncrementInWei_
    ) external;

    /**
     * @notice Sets the timestamp when claiming can begin.
     * Only callable by the core contract's Admin ACL.
     * @param timestampStart_ Unix timestamp when claiming can begin.
     */
    function configureTimestampStart(uint256 timestampStart_) external;

    /**
     * @notice Pre-mints `amount` tokens to this contract.
     * @param amount Number of tokens to pre-mint.
     */
    function preMint(uint256 amount) external;

    /**
     * @notice Claims token `tokenId` by paying the required price.
     * @param tokenNumber Token invocation number to claim.
     */
    function claimToken(uint256 tokenNumber) external payable;

    /**
     * @notice Checks if a token is claimed using bitmap storage
     * @param tokenNumber The token invocation number
     * @return True if the token is claimed
     */
    function isTokenClaimed(uint256 tokenNumber) external view returns (bool);
}
