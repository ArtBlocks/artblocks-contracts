// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.20;

abstract contract RandomizerBase {
    // base class that returns
    function _getPseudorandom(
        uint256 _tokenId
    ) internal virtual returns (bytes32) {
        uint256 time = block.timestamp;
        return
            keccak256(
                abi.encodePacked(
                    _tokenId,
                    block.number,
                    blockhash(block.number - 1),
                    time,
                    (time % 200) + 1
                )
            );
    }
}
