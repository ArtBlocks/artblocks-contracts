// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/* Provides an interface definition for compatibility with the Minting API.
 *
 * In order for a minter contract to be compatible with the REST API provided
 * at https://minting-api.artblocks.io/ it must implement the interface defined
 * below.
 */
interface IMintingAPIMinterV0 {
    function projectMaxHasBeenInvoked(uint256) external returns (bool);

    function purchaseTo(
        address _to,
        uint256 _projectId
    ) external returns (uint256 _tokenId);

    function getPriceInfo(
        uint256 _projectId
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        );
}
