// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for ranked auction minting.
 * @author Art Blocks Inc.
 */
interface ISharedMinterRAMV0 {
    function createBid(
        uint256 projectId,
        address coreContract,
        uint16 slotIndex
    ) external payable;

    function topUpBid(
        uint256 projectId,
        address coreContract,
        uint32 bidId,
        uint16 newSlotIndex
    ) external payable;
}
