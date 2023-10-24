// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for including token holder gating when purchasing with ERC20 tokens.
 * @author Art Blocks Inc.
 */
interface ISharedMinterHolderERC20V0 {
    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address, using owned ERC-721 NFT to claim right to purchase.
    function purchase(
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) external returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address, using owned ERC-721 NFT to claim right to purchase.
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId
    ) external returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, on behalf of
    // the provided vault, to the specified receiving address, using owned
    // ERC-721 NFT to claim right to purchase.
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        uint256 maxPricePerToken,
        address currencyAddress,
        address ownedNFTAddress,
        uint256 ownedNFTTokenId,
        address vault
    ) external returns (uint256 tokenId);
}
