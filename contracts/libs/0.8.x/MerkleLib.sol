// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Minter Base Class
 * @notice A base class for Art Blocks minter contracts that provides common
 * functionality used across minter contracts.
 * This contract is not intended to be deployed directly, but rather to be
 * inherited by other minter contracts.
 * From a design perspective, this contract is intended to remain simple and
 * easy to understand. It is not intended to cause a complex inheritance tree,
 * and instead should keep minter contracts as readable as possible for
 * collectors and developers.
 * @dev Semantic versioning is used in the solidity file name, and is therefore
 * controlled by contracts importing the appropriate filename version.
 * @author Art Blocks Inc.
 */
// abstract contract MinterBase is IMinterBaseV0, MinterBase_v0_1_1 {

//     /// Token holder allowlisting

//     /// Set of core contracts allowed to be queried for token holders
//     EnumerableSet.AddressSet private _registeredNFTAddresses;

//     /**
//      * contractProjectId => ownedNFTAddress => ownedNFTProjectIds => bool
//      * projects whose holders are allowed to purchase a token on `projectId`
//      */
//     mapping(uint256 => mapping(address => mapping(uint256 => bool)))
//         public allowedProjectHolders;

//     /**
//      * @notice Returns if token is an allowlisted NFT for project `_contractProjectId`.
//      * @param _contractProjectId Project ID to be checked.
//      * @param _ownedNFTAddress ERC-721 NFT token address to be checked.
//      * @param _ownedNFTTokenId ERC-721 NFT token ID to be checked.
//      * @return bool Token is allowlisted
//      * @dev does not check if token has been used to purchase
//      * @dev assumes project ID can be derived from tokenId / 1_000_000
//      */
//     function isAllowlistedNFT(
//         uint256 _contractProjectId,
//         address _ownedNFTAddress,
//         uint256 _ownedNFTTokenId
//     ) public view returns (bool) {
//         uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
//         return
//             allowedProjectHolders[_contractProjectId][_ownedNFTAddress][
//                 ownedNFTProjectId
//             ];
//     }
// }

library MerkleLib {
    using MerkleProof for bytes32[];

    function updateMerkleRoot(
        mapping(uint256 => bytes32) storage projectMerkleRoot,
        uint256 _contractProjectId,
        bytes32 _root
    ) internal {
        require(_root != bytes32(0), "Root must be provided");
        projectMerkleRoot[_contractProjectId] = _root;
    }

    function hashAddress(address _address) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    function processProofForAddress(
        bytes32[] calldata _proof,
        address _address
    ) external pure returns (bytes32) {
        return _proof.processProofCalldata(hashAddress(_address));
    }

    function verifyAddress(
        bytes32 _proofRoot,
        bytes32[] calldata _proof,
        address _address
    ) public pure returns (bool) {
        return _proof.verifyCalldata(_proofRoot, hashAddress(_address));
    }
}
