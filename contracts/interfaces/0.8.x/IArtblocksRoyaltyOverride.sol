// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

pragma solidity ^0.8.0;

/**
 * @notice Interface for Art Blocks Royalty override.
 * Supported by the Royalty Registry v1 Engine.
 * @dev  ref: https://royaltyregistry.xyz / engine-v1.royaltyregistry.eth
 */
interface IArtblocksRoyaltyOverride is IERC165 {
    /**
     * @notice Gets royalites of token ID `_tokenId` on token contract
     * `_tokenAddress`.
     * @param tokenAddress Token contract to be queried.
     * @param tokenId Token ID to be queried.
     * @return recipients_ array of royalty recipients
     * @return bps array of basis points for each recipient, aligned by index
     * @dev Interface ID:
     *
     * bytes4(keccak256('getRoyalties(address,uint256)')) == 0x9ca7dc7a
     *
     * => 0x9ca7dc7a = 0x9ca7dc7a
     */
    function getRoyalties(address tokenAddress, uint256 tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps);
}
