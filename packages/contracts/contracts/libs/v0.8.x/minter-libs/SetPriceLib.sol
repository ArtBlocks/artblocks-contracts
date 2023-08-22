// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Set Price Minter Library
 * @notice This library is designed for the Art Blocks platform. It provides a
 * struct and functions that falicitate the configuring of projects that use a
 * fixed-price minting model.
 * @author Art Blocks Inc.
 */

library SetPriceLib {
    // project-level variables
    /**
     * Struct used to store a project's currently configured price in wei, and
     * whether or not the price has been configured.
     */
    struct SetPriceProjectConfig {
        uint248 pricePerTokenInWei; // 0 if not configured
        bool priceIsConfigured;
    }

    /**
     * @notice Updates the minter's price per token in wei to be
     * `_pricePerTokenInWei`, in Wei, for the referenced SetPriceProjectConfig
     * struct in storage.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param _pricePerTokenInWei price per token in wei.
     * @param _setPriceProjectConfig struct to update.
     */
    function updatePricePerTokenInWei(
        uint256 _pricePerTokenInWei,
        SetPriceProjectConfig storage _setPriceProjectConfig
    ) internal {
        // update storage with new values
        _setPriceProjectConfig.pricePerTokenInWei = uint248(
            _pricePerTokenInWei
        );
        _setPriceProjectConfig.priceIsConfigured = true;
    }
}
