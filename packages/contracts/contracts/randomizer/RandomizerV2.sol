// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity 0.8.17;

import "../interfaces/0.8.x/IRandomizerV2.sol";
import "../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "./BasicRandomizerBase_v0_0_0.sol";

import "@openzeppelin-4.7/contracts/access/Ownable.sol";

contract BasicRandomizerV2 is IRandomizerV2, RandomizerBase, Ownable {
    // The core contract that may interact with this randomizer contract.
    IGenArt721CoreContractV3_Base public genArt721Core;

    function assignCoreAndRenounce(address _genArt721Core) external onlyOwner {
        renounceOwnership();
        genArt721Core = IGenArt721CoreContractV3_Base(_genArt721Core);
    }

    // When `genArt721Core` calls this, it can be assured that the randomizer
    // will set a bytes32 hash for tokenId `_tokenId` on the core contract.
    function assignTokenHash(uint256 _tokenId) external virtual {
        require(msg.sender == address(genArt721Core), "Only core may call");
        bytes32 hash = _getPseudorandom(_tokenId);
        genArt721Core.setTokenHash_8PT(_tokenId, hash);
    }
}
