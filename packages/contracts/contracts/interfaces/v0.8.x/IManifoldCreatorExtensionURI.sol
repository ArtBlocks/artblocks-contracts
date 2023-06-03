// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @author: manifold.xyz

/**
 * @dev Implement this if you want your extension to have overloadable URI's
 */
interface IManifoldCreatorExtensionURI {
    /**
     * Get the uri for a given creator/tokenId
     */
    function tokenURI(
        address creator,
        uint256 tokenId
    ) external view returns (string memory);
}
