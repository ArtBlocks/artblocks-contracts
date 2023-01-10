// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

interface IBasicPolyptychRandomizerV0 {
    function setPolyptychHashSeed(uint256 _tokenId, bytes12 _hashSeed) external;
}
