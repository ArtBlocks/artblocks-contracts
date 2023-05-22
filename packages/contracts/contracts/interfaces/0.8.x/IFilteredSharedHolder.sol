// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for including token holder gating when purchasing.
 * @author Art Blocks Inc.
 */
interface IFilteredSharedHolder {
    event DelegationRegistryUpdated(address delegationRegistry);
    /**
     * @notice Registered holders of NFTs at address `_NFTAddress` to be
     * considered for minting.
     */
    event RegisteredNFTAddress(address indexed _NFTAddress);
    /**
     * @notice Unregistered holders of NFTs at address `_NFTAddress` to be
     * considered for minting.
     */
    event UnregisteredNFTAddress(address indexed _NFTAddress);
    /**
     * @notice Allow holders of NFTs at addresses `_ownedNFTAddresses`, project
     * IDs `_ownedNFTProjectIds` to mint on project `_projectId`.
     * `_ownedNFTAddresses` assumed to be aligned with `_ownedNFTProjectIds`.
     * e.g. Allows holders of project `_ownedNFTProjectIds[0]` on token
     * contract `_ownedNFTAddresses[0]` to mint.
     */
    event AllowedHoldersOfProjects(
        uint256 indexed _projectId,
        address[] _ownedNFTAddresses,
        uint256[] _ownedNFTProjectIds
    );
    /**
     * @notice Remove holders of NFTs at addresses `_ownedNFTAddresses`,
     * project IDs `_ownedNFTProjectIds` to mint on project `_projectId`.
     * `_ownedNFTAddresses` assumed to be aligned with `_ownedNFTProjectIds`.
     * e.g. Removes holders of project `_ownedNFTProjectIds[0]` on token
     * contract `_ownedNFTAddresses[0]` from mint allowlist.
     */
    event RemovedHoldersOfProjects(
        uint256 indexed _projectId,
        address[] _ownedNFTAddresses,
        uint256[] _ownedNFTProjectIds
    );

    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address, using owned ERC-721 NFT to claim right to purchase.
    function purchase(
        uint256 _projectId,
        address _coreContract,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) external payable returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address, using owned ERC-721 NFT to claim right to purchase.
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) external payable returns (uint256 tokenId);
}
