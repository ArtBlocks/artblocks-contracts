// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Dutch Auction (exponential price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an exponential Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DALib {
    /**
     * @notice Auction details cleared for project `projectId` on core contract
     * `coreContract`.
     * @param projectId Project Id for which auction details were cleared
     * @param coreContract Core contract address for which auction details were
     * cleared
     */
    event ResetAuctionDetails(
        uint256 indexed projectId,
        address indexed coreContract
    );
}
