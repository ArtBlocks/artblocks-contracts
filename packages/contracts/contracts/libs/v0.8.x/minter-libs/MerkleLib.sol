// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {GenericMinterEventsLib} from "./GenericMinterEventsLib.sol";

import {MerkleProof} from "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title Art Blocks Merkle Library
 * @notice This library is designed to manage and verify merkle based gating for Art Blocks projects.
 * It provides functionalities such as updating the merkle root of project, verifying an address against a proof,
 * and setting the maximum number of invocations per address for a project.
 * @author Art Blocks Inc.
 */

library MerkleLib {
    using MerkleProof for bytes32[];

    /// Events specific to this library ///
    /**
     * @notice Notifies of the contract's default maximum mints allowed per
     * user for a given project, on this minter. This value can be overridden
     * by the artist of any project at any time.
     */
    event DefaultMaxInvocationsPerAddress(
        uint256 defaultMaxInvocationsPerAddress
    );
    event DelegationRegistryUpdated(address delegationRegistry);

    // position of Merkle Lib storage, using a diamond storage pattern for this
    // library
    bytes32 constant MERKLE_LIB_STORAGE_POSITION =
        keccak256("merklelib.storage");

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
        // @dev Safe to use uint24 because maxInvocationsPerAddressOverride <= 1_000_000
        // and 1_000_000 << max uint24
        uint24 maxInvocationsPerAddressOverride;
        // The root of the Merkle tree for this project.
        bytes32 merkleRoot;
        // The number of current invocations for this project from a given user address.
        mapping(address user => uint256 mintInvocations) userMintInvocations;
    }

    // Diamond storage pattern is used in this library
    struct MerkleLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => MerkleProjectConfig)) merkleProjectConfigs;
    }

    /**
     * @notice Sets the maximum number of invocations per address for a project.
     * @param projectId The ID of the project to set the maximum invocations for.
     * @param coreContract The address of the core contract.
     * @param maxInvocationsPerAddress The maximum number of invocations per address.
     */
    function setProjectInvocationsPerAddress(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocationsPerAddress
    ) internal {
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        merkleProjectConfig.useMaxInvocationsPerAddressOverride = true;
        merkleProjectConfig
            .maxInvocationsPerAddressOverride = maxInvocationsPerAddress;
        emit GenericMinterEventsLib.ConfigValueSet({
            projectId: projectId,
            coreContract: coreContract,
            key: MerkleLib.CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            value: true
        });
        emit GenericMinterEventsLib.ConfigValueSet({
            projectId: projectId,
            coreContract: coreContract,
            key: MerkleLib.CONFIG_MAX_INVOCATIONS_OVERRIDE,
            value: uint256(maxInvocationsPerAddress)
        });
    }

    /**
     * @notice Updates the Merkle root of a project.
     * @param projectId The ID of the project to update.
     * @param coreContract The address of the core contract.
     * @param root The new Merkle root.
     */
    function updateMerkleRoot(
        uint256 projectId,
        address coreContract,
        bytes32 root
    ) internal {
        require(root != bytes32(0), "Root must be provided");
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        merkleProjectConfig.merkleRoot = root;
        emit GenericMinterEventsLib.ConfigValueSet({
            projectId: projectId,
            coreContract: coreContract,
            key: MerkleLib.CONFIG_MERKLE_ROOT,
            value: root
        });
    }

    function preMintChecks(
        uint256 projectId,
        address coreContract,
        bytes32[] calldata proof,
        address vault
    ) internal view {
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // require valid Merkle proof
        require(
            verifyAddress({
                proofRoot: merkleProjectConfig.merkleRoot,
                proof: proof,
                address_: vault
            }),
            "Invalid Merkle proof"
        );

        // limit mints per address by project
        uint256 maxProjectInvocationsPerAddress = projectMaxInvocationsPerAddress(
                merkleProjectConfig
            );

        // note that mint limits index off of the `vault` (when applicable)
        require(
            merkleProjectConfig.userMintInvocations[vault] <
                maxProjectInvocationsPerAddress ||
                maxProjectInvocationsPerAddress == 0,
            "Max invocations reached"
        );
    }

    function mintEffects(
        uint256 projectId,
        address coreContract,
        address vault
    ) internal {
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // increment mint invocations for vault address
        unchecked {
            // this will never overflow since user's invocations on a project
            // are limited by the project's max invocations
            merkleProjectConfig.userMintInvocations[vault]++;
        }
    }

    /**
     * @notice Hashes an address.
     * @param address_ The address to hash.
     * @return The hash of the address.
     */
    function hashAddress(address address_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(address_));
    }

    /**
     * @notice Processes a proof for an address.
     * @param proof The proof to process.
     * @param address_ The address to process the proof for.
     * @return The resulting hash from processing the proof.
     */
    function processProofForAddress(
        bytes32[] calldata proof,
        address address_
    ) internal pure returns (bytes32) {
        return proof.processProofCalldata(hashAddress(address_));
    }

    /**
     * @notice Verifies an address against a proof.
     * @param proofRoot The root of the proof to verify agaisnst.
     * @param proof The proof to verify.
     * @param address_ The address to verify.
     * @return True if the address is verified, false otherwise.
     */
    function verifyAddress(
        bytes32 proofRoot,
        bytes32[] calldata proof,
        address address_
    ) internal pure returns (bool) {
        return proof.verifyCalldata(proofRoot, hashAddress(address_));
    }

    /**
     * @notice Returns the maximum number of invocations per address for a project.
     * @param projectConfig The merkle project config to check.
     * @return The maximum number of invocations per address.
     */
    function projectMaxInvocationsPerAddress(
        MerkleProjectConfig storage projectConfig
    ) internal view returns (uint256) {
        if (projectConfig.useMaxInvocationsPerAddressOverride) {
            return uint256(projectConfig.maxInvocationsPerAddressOverride);
        } else {
            return DEFAULT_MAX_INVOCATIONS_PER_ADDRESS;
        }
    }

    /**
     * @notice Returns the maximum number of invocations per address for a project.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     * @return The maximum number of invocations per address.
     */
    function projectMaxInvocationsPerAddress(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        MerkleProjectConfig storage projectConfig = getMerkleProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        return projectMaxInvocationsPerAddress(projectConfig);
    }

    function projectUserMintInvocations(
        uint256 projectId,
        address coreContract,
        address purchaser
    ) internal view returns (uint256) {
        MerkleProjectConfig storage projectConfig = getMerkleProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        return projectConfig.userMintInvocations[purchaser];
    }

    /**
     * @notice Returns remaining invocations for a given address.
     * If `projectLimitsMintInvocationsPerAddress` is false, individual
     * addresses are only limited by the project's maximum invocations, and a
     * dummy value of zero is returned for `mintInvocationsRemaining`.
     * If `projectLimitsMintInvocationsPerAddress` is true, the quantity of
     * remaining mint invocations for address `address` is returned as
     * `mintInvocationsRemaining`.
     * Note that mint invocations per address can be changed at any time by the
     * artist of a project.
     * Also note that all mint invocations are limited by a project's maximum
     * invocations as defined on the core contract. This function may return
     * a value greater than the project's remaining invocations.
     * @param projectId Project Id to get remaining invocations on
     * @param coreContract Core contract address of project
     * @param address_ Address to get remaining invocations for
     */
    function projectRemainingInvocationsForAddress(
        uint256 projectId,
        address coreContract,
        address address_
    )
        internal
        view
        returns (
            bool projectLimitsMintInvocationsPerAddress,
            uint256 mintInvocationsRemaining
        )
    {
        MerkleProjectConfig storage projectConfig = getMerkleProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        uint256 maxInvocationsPerAddress = projectMaxInvocationsPerAddress(
            projectConfig
        );
        if (maxInvocationsPerAddress == 0) {
            // project does not limit mint invocations per address, so leave
            // `projectLimitsMintInvocationsPerAddress` at solidity initial
            // value of false. Also leave `mintInvocationsRemaining` at
            // solidity initial value of zero, as indicated in this function's
            // documentation.
        } else {
            projectLimitsMintInvocationsPerAddress = true;
            uint256 userMintInvocations = projectConfig.userMintInvocations[
                address_
            ];
            // if user has not reached max invocations per address, return
            // remaining invocations
            if (maxInvocationsPerAddress > userMintInvocations) {
                unchecked {
                    // will never underflow due to the check above
                    mintInvocationsRemaining =
                        maxInvocationsPerAddress -
                        userMintInvocations;
                }
            }
            // else user has reached their maximum invocations, so leave
            // `mintInvocationsRemaining` at solidity initial value of zero
        }
    }

    /**
     * Loads the MerkleProjectConfig for a given project and core contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getMerkleProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (MerkleProjectConfig storage) {
        return s().merkleProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The MerkleLibStorage struct.
     */
    function s()
        internal
        pure
        returns (MerkleLibStorage storage storageStruct)
    {
        bytes32 position = MERKLE_LIB_STORAGE_POSITION;
        assembly {
            storageStruct.slot := position
        }
    }
}
