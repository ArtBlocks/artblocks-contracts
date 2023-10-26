// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.19;

import "../../interfaces/v0.8.x/IPseudorandomAtomic.sol";

/**
 * @title PseudorandomAtomic
 * @author Art Blocks Inc.
 * @notice This contract atomically returns a pseudorandom value.
 */
contract PseudorandomAtomic is IPseudorandomAtomic {
    // base class that returns
    function getPseudorandomAtomic(
        bytes32 _entropy
    ) external view returns (bytes32) {
        uint256 time = block.timestamp;
        return
            keccak256(
                abi.encodePacked(
                    _entropy,
                    block.number,
                    blockhash(block.number - 1),
                    time,
                    (time % 200) + 1
                )
            );
    }
}
