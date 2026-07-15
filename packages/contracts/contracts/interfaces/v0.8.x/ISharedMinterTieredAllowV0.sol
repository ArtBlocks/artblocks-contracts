// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for tiered allowlist pricing.
 * @notice Intended for shared minters that expose both a public price and a
 * privileged allowlist price, and that can resolve the effective price for a
 * given wallet.
 * @author Art Blocks Inc.
 */
interface ISharedMinterTieredAllowV0 {
    /**
     * @notice Gets if price is configured, allowlist price of minting a token
     * on project `projectId`, and currency symbol and address to be used as
     * payment.
     * @param projectId Project ID to get allowlist price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if prices have been configured on this
     * minter
     * @return tokenPriceInWei current allowlist price of token on this minter
     * @return currencySymbol currency symbol for purchases of project on this
     * minter
     * @return currencyAddress currency address for purchases of project on
     * this minter
     */
    function getAllowlistPriceInfo(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        );

    /**
     * @notice Returns the effective price for a given wallet address on
     * project `projectId`. If the wallet is allowlisted, returns the
     * allowlist price; otherwise returns the public price.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @param wallet Address to check the effective price for
     * @return isConfigured true only if prices have been configured for the
     * project
     * @return tokenPriceInWei effective price per token for the given wallet
     * @return currencySymbol currency symbol for purchases of project on this
     * minter
     * @return currencyAddress currency address for purchases of project on
     * this minter
     */
    function getPriceInfoForAddress(
        uint256 projectId,
        address coreContract,
        address wallet
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
