// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.9;

import "../BasicRandomizerV2.sol";

/// @title RandomizerV2_NoAssignMock
/// @notice WARNING - This is a mock contract. Do not use it in production.
/// @dev This is a mock of the RandomizerV2 contract that does not assign the
/// token hash on the core contract at the time of mint.
/// Instead, anyone may set an existing token's hash via the
/// `actuallyAssignTokenHash` function.
contract RandomizerV2_NoAssignMock is BasicRandomizerV2 {
    // When `genArt721Core` calls this, the call is ignored and nothing is set
    // on the core contract. Used for test purposes only.
    function assignTokenHash(
        uint256 /*_tokenId*/
    ) external pure override {}

    // When ANYONE calls this, token `_tokenId`'s hash is set
    // on the core contract. Used for test purposes only.
    // @dev WARNING - THIS IS NOT SECURE AND SHOULD NOT BE USED IN PRODUCTION.
    function actuallyAssignTokenHash(uint256 _tokenId) external {
        uint256 time = block.timestamp;
        bytes16 hash = bytes16(
            keccak256(
                abi.encodePacked(
                    _tokenId,
                    block.number,
                    blockhash(block.number - 1),
                    time,
                    (time % 200) + 1
                )
            )
        );
        genArt721Core.setTokenHash_8PT(_tokenId, hash);
    }
}
