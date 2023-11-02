// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Shared Minter Simple Purchase Interface
 * @notice This interface is designed to be used by minter contracts that
 * implement a simple purchase model, such that the only args required to
 * purchase a token are the project id and the core contract address, and an
 * optional recipient address.
 */
interface ISharedMinterSimplePurchaseV0 {
    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address.
    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address.
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId);
}
