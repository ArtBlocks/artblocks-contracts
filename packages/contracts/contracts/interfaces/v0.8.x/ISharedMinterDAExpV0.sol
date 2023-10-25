// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface ISharedMinterDAExpV0 {
    function minimumPriceDecayHalfLifeSeconds() external view returns (uint256);

    function setMinimumPriceDecayHalfLifeSeconds(
        uint256 minimumPriceDecayHalfLifeSeconds
    ) external;
}
