// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

import "./IRandomizerV2.sol";

interface IBasicPolyptychRandomizerV0 is IRandomizerV2 {
    // The core contract that may interact with this randomizer contract.
    function genArt721Core()
        external
        view
        returns (IGenArt721CoreContractV3_Base);

    // When a core contract calls this, it can be assured that the randomizer
    // will set a bytes32 hash for tokenId `_tokenId` on the core contract.
    function assignTokenHash(uint256 _tokenId) external;

    /**
     * @notice Minter contract at `_contractAddress` allowed to assign token hash seeds.
     */
    event HashSeedSetterUpdated(address indexed _contractAddress);

    /**
     * @notice Project with ID `_projectId` is enabled/disabled for polyptych minting.
     */
    event ProjectIsPolyptychUpdated(uint256 _projectId, bool _isPolyptych);

    /**
     * @notice Store the token hash seed for an existing token to be re-used in a polyptych panel.
     */
    function setPolyptychHashSeed(uint256 _tokenId, bytes12 _hashSeed) external;
}
