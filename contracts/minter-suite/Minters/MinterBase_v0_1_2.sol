// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IMinterBaseV0.sol";
import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Engine.sol";
import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

import "./MinterBase_v0_1_1.sol" as MinterBase_v0_1_1;

import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

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
abstract contract MinterBase is IMinterBaseV0, MinterBase_v0_1_1 {
    // add Enumerable Set methods
    using EnumerableSet for EnumerableSet.AddressSet;
    // add Merkle proof methods
    using MerkleProof for bytes32[];

    /// Merkle allowlisting

    // contractId+projectId => merkle root
    mapping(uint256 => bytes32) public projectMerkleRoot;

    /**
     * @notice Update the Merkle root for   project `_contractProjectId`.
     * @param _contractProjectId Project ID to be updated.
     * @param _root root of Merkle tree defining addresses allowed to mint
     * on project `_projectId`.
     */
    function _updateMerkleRoot(
        uint256 _contractProjectId,
        bytes32 _root
    ) internal {
        // assumes calling function validates artistOnly
        require(_root != bytes32(0), "Root must be provided");
        projectMerkleRoot[_contractProjectId] = _root;
        // assuming calling function emits event
    }

    /**
     * @notice Returns hashed address (to be used as merkle tree leaf).
     * Included as a public function to enable users to calculate their hashed
     * address in Solidity when generating proofs off-chain.
     * @param _address address to be hashed
     * @return bytes32 hashed address, via keccak256 (using encodePacked)
     */
    function hashAddress(address _address) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    /**
     * @notice Process proof for an address. Returns Merkle root. Included to
     * enable users to easily verify a proof's validity.
     * @param _proof Merkle proof for address.
     * @param _address Address to process.
     * @return merkleRoot Merkle root for `_address` and `_proof`
     */
    function processProofForAddress(
        bytes32[] calldata _proof,
        address _address
    ) external pure returns (bytes32) {
        return _proof.processProofCalldata(hashAddress(_address));
    }

    /**
     * @notice Verify if address is allowed to mint on project `_projectId`.
     * @param _contractProjectId Contract + project ID to be checked.
     * @param _proof Merkle proof for address.
     * @param _address Address to check.
     * @return inAllowlist true only if address is allowed to mint and valid
     * Merkle proof was provided
     */
    function verifyAddress(
        uint256 _contractProjectId,
        bytes32[] calldata _proof,
        address _address
    ) public view returns (bool) {
        return
            _proof.verifyCalldata(
                projectMerkleRoot[_contractProjectId],
                hashAddress(_address)
            );
    }

    /// Token holder allowlisting

    /// Set of core contracts allowed to be queried for token holders
    EnumerableSet.AddressSet private _registeredNFTAddresses;

    /**
     * contractProjectId => ownedNFTAddress => ownedNFTProjectIds => bool
     * projects whose holders are allowed to purchase a token on `projectId`
     */
    mapping(uint256 => mapping(address => mapping(uint256 => bool)))
        public allowedProjectHolders;

    /**
     * @notice Returns if token is an allowlisted NFT for project `_contractProjectId`.
     * @param _contractProjectId Project ID to be checked.
     * @param _ownedNFTAddress ERC-721 NFT token address to be checked.
     * @param _ownedNFTTokenId ERC-721 NFT token ID to be checked.
     * @return bool Token is allowlisted
     * @dev does not check if token has been used to purchase
     * @dev assumes project ID can be derived from tokenId / 1_000_000
     */
    function isAllowlistedNFT(
        uint256 _contractProjectId,
        address _ownedNFTAddress,
        uint256 _ownedNFTTokenId
    ) public view returns (bool) {
        uint256 ownedNFTProjectId = _ownedNFTTokenId / ONE_MILLION;
        return
            allowedProjectHolders[_contractProjectId][_ownedNFTAddress][
                ownedNFTProjectId
            ];
    }
}
