// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Merkle Library
 * @notice This library is designed to manage and verify merkle based gating for Art Blocks projects.
 * It provides functionalities such as updating the merkle root of project, verifying an address against a proof,
 * and setting the maximum number of invocations per address for a project.
 * @author Art Blocks Inc.
 */

library MerkleLib {
    using MerkleProof for bytes32[];

    /// @notice Default maximum invocations per address
    uint256 internal constant DEFAULT_MAX_INVOCATIONS_PER_ADDRESS = 1;
    bytes32 internal constant CONFIG_MERKLE_ROOT = "merkleRoot";
    bytes32 internal constant CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE =
        "useMaxMintsPerAddrOverride"; // shortened to fit in 32 bytes
    bytes32 internal constant CONFIG_MAX_INVOCATIONS_OVERRIDE =
        "maxMintsPerAddrOverride"; // shortened to match format of previous key

    struct MerkleProjectConfig {
        // If true, the maxInvocationsPerAddressOverride will be used.
        // If false, the default max invocations per address will be used.
        bool useMaxInvocationsPerAddressOverride;
        // Maximum invocations allowed per address.
        // This will be used if useMaxInvocationsPerAddressOverride is true.
        // A value of 0 means no limit.
        uint24 maxInvocationsPerAddressOverride;
        // The root of the Merkle tree for this project.
        bytes32 merkleRoot;
    }

    /**
     * @notice Updates the Merkle root of a project.
     * @param projectConfigMapping The mapping of core contracts to project configs.
     * @param _projectId The ID of the project to update.
     * @param _coreContract The address of the core contract.
     * @param _root The new Merkle root.
     */
    function updateMerkleRoot(
        mapping(address => mapping(uint256 => MerkleProjectConfig))
            storage projectConfigMapping,
        uint256 _projectId,
        address _coreContract,
        bytes32 _root
    ) internal {
        require(_root != bytes32(0), "Root must be provided");
        MerkleProjectConfig storage _projectConfig = projectConfigMapping[
            _coreContract
        ][_projectId];
        _projectConfig.merkleRoot = _root;
    }

    /**
     * @notice Hashes an address.
     * @param _address The address to hash.
     * @return The hash of the address.
     */
    function hashAddress(address _address) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    /**
     * @notice Processes a proof for an address.
     * @param _proof The proof to process.
     * @param _address The address to process the proof for.
     * @return The resulting hash from processing the proof.
     */
    function processProofForAddress(
        bytes32[] calldata _proof,
        address _address
    ) internal pure returns (bytes32) {
        return _proof.processProofCalldata(hashAddress(_address));
    }

    /**
     * @notice Verifies an address against a proof.
     * @param _proofRoot The root of the proof to verify against.
     * @param _proof The proof to verify.
     * @param _address The address to verify.
     * @return True if the address is verified, false otherwise.
     */
    function verifyAddress(
        bytes32 _proofRoot,
        bytes32[] calldata _proof,
        address _address
    ) internal pure returns (bool) {
        return _proof.verifyCalldata(_proofRoot, hashAddress(_address));
    }

    /**
     * @notice Returns the maximum number of invocations per address for a project.
     * @param projectConfigMapping The project config to check.
     * @return The maximum number of invocations per address.
     */
    function projectMaxInvocationsPerAddress(
        MerkleProjectConfig storage projectConfigMapping
    ) internal view returns (uint256) {
        if (projectConfigMapping.useMaxInvocationsPerAddressOverride) {
            return
                uint256(projectConfigMapping.maxInvocationsPerAddressOverride);
        } else {
            return DEFAULT_MAX_INVOCATIONS_PER_ADDRESS;
        }
    }

    /**
     * @notice Sets the maximum number of invocations per address for a project.
     * @param _projectId The ID of the project to set.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocationsPerAddress The maximum number of invocations per address.
     * @param projectConfigMapping The mapping of core contracts to project configs.
     */
    function setProjectInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocationsPerAddress,
        mapping(address => mapping(uint256 => MerkleProjectConfig))
            storage projectConfigMapping
    ) internal {
        MerkleProjectConfig storage _projectConfig = projectConfigMapping[
            _coreContract
        ][_projectId];
        _projectConfig.useMaxInvocationsPerAddressOverride = true;
        _projectConfig
            .maxInvocationsPerAddressOverride = _maxInvocationsPerAddress;
    }
}
