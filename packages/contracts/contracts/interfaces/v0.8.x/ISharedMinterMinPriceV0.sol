// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for minimum price minting.
 * @author Art Blocks Inc.
 */
interface ISharedMinterMinPriceV0 {
    /**
     * @notice Update the default mint fee for the minter.
     * @param newDefaultMintFee New default mint fee, in wei
     */
    function updateDefaultMintFee(uint256 newDefaultMintFee) external;

    /**
     * @notice Get the default mint fee for the minter.
     * @return defaultMintFee Default mint fee, in wei
     */
    function defaultMintFee() external view returns (uint256);
}
