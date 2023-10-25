// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDALinV0 {
    function minimumAuctionLengthSeconds() external view returns (uint256);

    function setMinimumAuctionLengthSeconds(
        uint256 minimumAuctionLengthSeconds
    ) external;
}
