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
    /**
     * @notice Returns all claimed bitmaps
     * @return An array of all claimed bitmaps
     */
    function getAllClaimedBitmaps() external view returns (uint256[] memory);

    /**
     * @notice Returns all pre-minted bitmaps
     * @return An array of all pre-minted bitmaps
     */
    function getAllPreMintedBitmaps() external view returns (uint256[] memory);

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
     * @param tokenId Token ID to claim.
     */
    function claimToken(uint256 tokenId) external payable;

    /**
     * @notice Syncs project's max invocations to core contract value.
     */
    function syncProjectMaxInvocationsToCore() external;

    /**
     * @notice Checks if a token is claimed using bitmap storage
     * @param tokenId The token ID
     * @return True if the token is claimed
     */
    function isTokenClaimed(uint256 tokenId) external view returns (bool);
}
