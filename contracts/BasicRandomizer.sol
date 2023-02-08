// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "./interfaces/0.8.x/IRandomizer.sol";

pragma solidity 0.8.17;

contract BasicRandomizer is IRandomizer {
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
