// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../../interfaces/0.5.x/IRandomizer.sol";

pragma solidity ^0.5.0;

contract Randomizer_ArtCode is IRandomizer {
    function returnValue() public view returns (bytes32) {
        uint256 time = block.timestamp;
        uint256 extra = (time % 200) + 1;

        return
            keccak256(
                abi.encodePacked(
                    block.number,
                    blockhash(block.number - 2),
                    time,
                    extra
                )
            );
    }
}
