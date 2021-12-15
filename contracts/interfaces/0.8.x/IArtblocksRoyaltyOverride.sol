// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../../libs/0.8.x/IERC165.sol";

pragma solidity ^0.8.0;

/**
 *  Interface for Art Blocks Royalty override
 *  Supported by the Royalty Registry v1 Engine
 *  ref: https://royaltyregistry.xyz
 *       v1 deployed at: engine-v1.royaltyregistry.eth
 */
interface IArtblocksRoyaltyOverride is IERC165 {
    /**
     * @dev Get royalites of a token at a given tokenAddress.
     *      Returns array of receivers and basisPoints.
     *
     *  bytes4(keccak256('getRoyalties(address,uint256)')) == 0x9ca7dc7a
     *
     *  => 0x9ca7dc7a = 0x9ca7dc7a
     */
    function getRoyalties(address tokenAddress, uint256 tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps);
}
