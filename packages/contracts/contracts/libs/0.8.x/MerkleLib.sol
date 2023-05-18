// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Merkle Library
 * @notice [TO FILL OUT]
 * @author Art Blocks Inc.
 */

library MerkleLib {
    using MerkleProof for bytes32[];
    uint256 internal constant DEFAULT_MAX_INVOCATIONS_PER_ADDRESS = 1;
    bytes32 internal constant CONFIG_MERKLE_ROOT = "merkleRoot";
    bytes32 internal constant CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE =
        "useMaxMintsPerAddrOverride"; // shortened to fit in 32 bytes
    bytes32 internal constant CONFIG_MAX_INVOCATIONS_OVERRIDE =
        "maxMintsPerAddrOverride"; // shortened to match format of previous key

    struct MerkleProjectConfig {
        // initial value is false, so by default, projects limit allowlisted
        // addresses to a mint qty of `DEFAULT_MAX_INVOCATIONS_PER_ADDRESS`
        bool useMaxInvocationsPerAddressOverride;
        // a value of 0 means no limit
        // (only used if `useMaxInvocationsPerAddressOverride` is true)
        uint24 maxInvocationsPerAddressOverride;
        bytes32 merkleRoot;
    }

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

    function hashAddress(address _address) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    function processProofForAddress(
        bytes32[] calldata _proof,
        address _address
    ) internal pure returns (bytes32) {
        return _proof.processProofCalldata(hashAddress(_address));
    }

    function verifyAddress(
        bytes32 _proofRoot,
        bytes32[] calldata _proof,
        address _address
    ) internal pure returns (bool) {
        return _proof.verifyCalldata(_proofRoot, hashAddress(_address));
    }

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
        // use override value instead of the contract's default
        // @dev this never changes from true to false; default value is only
        // used if artist has never configured project invocations per address
        _projectConfig.useMaxInvocationsPerAddressOverride = true;
        // update the override value

        _projectConfig
            .maxInvocationsPerAddressOverride = _maxInvocationsPerAddress;
    }
}
