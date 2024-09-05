// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for minimum price minting.
 * @author Art Blocks Inc.
 */
interface ISharedMinterMinPriceV0 {
    /**
     * @notice Update the default minimum mint fee for the minter.
     * @param newDefaultMinMintFee New default minimum mint fee, in wei
     */
    function updateDefaultMinMintFee(uint256 newDefaultMinMintFee) external;

    /**
     * @notice Get the default mint fee for the minter.
     * @return defaultMinMintFee Default minimum mint fee, in wei
     */
    function defaultMinMintFee() external view returns (uint256);
}
