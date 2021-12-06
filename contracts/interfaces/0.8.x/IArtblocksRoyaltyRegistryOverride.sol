// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "./IMultiContractRoyaltyOverride.sol";

pragma solidity ^0.8.0;

interface IArtblocksRoyaltyRegistryOverride is IMultiContractRoyaltyOverride {
    function getArtblocksRoyaltyBps(address tokenAddress)
        external
        view
        returns (uint256);
}
