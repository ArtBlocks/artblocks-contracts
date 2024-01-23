// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for serial English auction minting.
 * @author Art Blocks Inc.
 */
interface ISharedMinterRAMV0 {
    function createBid(
        uint256 projectId,
        address coreContract,
        uint8 slotIndex
    ) external payable;
}
