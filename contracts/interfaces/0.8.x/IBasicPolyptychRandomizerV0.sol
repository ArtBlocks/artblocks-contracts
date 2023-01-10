// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

interface IBasicPolyptychRandomizerV0 is IRandomizerV2 {
    /**
     * @notice Minter contract at `_contractAddress` allowed to assign token hash seeds.
     */
    event HashSeedSetterUpdated(address indexed _contractAddress);

    /**
     * @notice Store the token hash seed for an existing token to be re-used in a polyptych panel.
     */
    function setPolyptychHashSeed(uint256 _tokenId, bytes12 _hashSeed) external;
}
