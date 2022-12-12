// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/* Provides an interface definition for compatibility with the Minting API.
 *
 * In order for a core contract to be compatible with the REST API provided
 * at https://minting-api.artblocks.io/ it must implement the interface defined
 * below.
 */
interface IMintingAPICoreV0 {
    /**
     * @notice Token ID `_tokenId` minted on project ID `_projectId` to `_to`.
     */
    event Mint(
        address indexed _to,
        uint256 indexed _tokenId,
        uint256 indexed _projectId
    );

    // getter function of public variable
    function nextProjectId() external view returns (uint256);

    function projectDetails(uint256 _projectId)
        public
        view
        returns (
            string memory projectName,
            string memory artist,
            string memory description,
            string memory website,
            string memory license
        );

    function projectIdToPricePerTokenInWei(uint256 _projectId)
        external
        view
        returns (uint256);

    function projectTokenInfo(uint256 _projectId)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            uint256,
            bool,
            address,
            uint256,
            string memory,
            address
        );

    function tokensOfOwner(address owner)
        external
        view
        returns (uint256[] memory);
}
