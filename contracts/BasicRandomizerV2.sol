// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.9;

import "./interfaces/0.8.x/IRandomizerV2.sol";
import "./interfaces/0.8.x/IGenArt721CoreContractV3.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";

contract BasicRandomizerV2 is IRandomizerV2, Ownable {
    // The core contract that may interact with this randomizer contract.
    IGenArt721CoreContractV3 public genArt721Core;

    function assignCoreAndRenounce(address _genArt721Core) external onlyOwner {
        renounceOwnership();
        genArt721Core = IGenArt721CoreContractV3(_genArt721Core);
    }

    // When `genArt721Core` calls this, it can be assured that the randomizer
    // will set a bytes32 hash for tokenId `_tokenId` on the core contract.
    function assignTokenHash(uint256 _tokenId) external {
        uint256 time = block.timestamp;
        bytes32 hash = keccak256(
            abi.encodePacked(
                _tokenId,
                block.number,
                blockhash(block.number - 1),
                time,
                (time % 200) + 1
            )
        );
        genArt721Core.setTokenHash_8PT(_tokenId, hash);
    }
}
