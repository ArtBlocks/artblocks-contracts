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

    // position of Merkle Lib storage, using a diamond storage pattern for this
    // library
    bytes32 constant MERKLE_LIB_STORAGE_POSITION =
        keccak256("merklelib.storage");

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

    /// Generic Events from ISharedMinterV0 emitted by this library ///
    // @dev These are duplicates of and a subset of the generic events in
    // ISharedMinterV0. This allows downstream indexing services to watch for
    // all generic events in ISharedMinterV0 instead of handling each generic
    // event from each minter library separately.
    /// BOOL
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bool _value
    );
    /// UINT256
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        uint256 _value
    );
    /// BYTES32
    /**
     * @notice Generic project minter configuration event. Sets value of key
     * `_key` to `_value` for project `_projectId`.
     */
    event ConfigValueSet(
        uint256 indexed _projectId,
        address indexed _coreContract,
        bytes32 _key,
        bytes32 _value
    );

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
        mapping(address => uint256) userMintInvocations;
    }

    // Diamond storage pattern is used in this library
    struct MerkleLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => MerkleProjectConfig)) merkleProjectConfigs;
    }

    /**
     * @notice Sets the maximum number of invocations per address for a project.
     * @param _projectId The ID of the project to set the maximum invocations for.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocationsPerAddress The maximum number of invocations per address.
     */
    function setProjectInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocationsPerAddress
    ) internal {
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig(
                _projectId,
                _coreContract
            );
        merkleProjectConfig.useMaxInvocationsPerAddressOverride = true;
        merkleProjectConfig
            .maxInvocationsPerAddressOverride = _maxInvocationsPerAddress;
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            true
        );
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_MAX_INVOCATIONS_OVERRIDE,
            uint256(_maxInvocationsPerAddress)
        );
    }

    /**
     * @notice Updates the Merkle root of a project.
     * @param _projectId The ID of the project to update.
     * @param _coreContract The address of the core contract.
     * @param _root The new Merkle root.
     */
    function updateMerkleRoot(
        uint256 _projectId,
        address _coreContract,
        bytes32 _root
    ) internal {
        require(_root != bytes32(0), "Root must be provided");
        MerkleProjectConfig
            storage merkleProjectConfig = getMerkleProjectConfig(
                _projectId,
                _coreContract
            );
        merkleProjectConfig.merkleRoot = _root;
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_MERKLE_ROOT,
            _root
        );
    }

    function preMintChecks(
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof,
        address _vault
    ) internal view {
        MerkleProjectConfig
            storage _merkleProjectConfig = getMerkleProjectConfig(
                _projectId,
                _coreContract
            );
        // require valid Merkle proof
        require(
            verifyAddress(_merkleProjectConfig.merkleRoot, _proof, _vault),
            "Invalid Merkle proof"
        );

        // limit mints per address by project
        uint256 _maxProjectInvocationsPerAddress = projectMaxInvocationsPerAddress(
                _merkleProjectConfig
            );

        // note that mint limits index off of the `_vault` (when applicable)
        require(
            _merkleProjectConfig.userMintInvocations[_vault] <
                _maxProjectInvocationsPerAddress ||
                _maxProjectInvocationsPerAddress == 0,
            "Max invocations reached"
        );
    }

    function mintEffects(
        uint256 _projectId,
        address _coreContract,
        address _vault
    ) internal {
        MerkleProjectConfig
            storage _merkleProjectConfig = getMerkleProjectConfig(
                _projectId,
                _coreContract
            );
        // increment mint invocations for vault address
        unchecked {
            // this will never overflow since user's invocations on a project
            // are limited by the project's max invocations
            _merkleProjectConfig.userMintInvocations[_vault]++;
        }
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
     * @param _proofRoot The root of the proof to verify agaisnst.
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
     * @param _projectConfig The merkle project config to check.
     * @return The maximum number of invocations per address.
     */
    function projectMaxInvocationsPerAddress(
        MerkleProjectConfig storage _projectConfig
    ) internal view returns (uint256) {
        if (_projectConfig.useMaxInvocationsPerAddressOverride) {
            return uint256(_projectConfig.maxInvocationsPerAddressOverride);
        } else {
            return DEFAULT_MAX_INVOCATIONS_PER_ADDRESS;
        }
    }

    /**
     * @notice Returns the maximum number of invocations per address for a project.
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     * @return The maximum number of invocations per address.
     */
    function projectMaxInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (uint256) {
        MerkleProjectConfig storage _projectConfig = getMerkleProjectConfig(
            _projectId,
            _coreContract
        );
        return projectMaxInvocationsPerAddress(_projectConfig);
    }

    function projectUserMintInvocations(
        uint256 _projectId,
        address _coreContract,
        address _purchaser
    ) internal view returns (uint256) {
        MerkleProjectConfig storage _projectConfig = getMerkleProjectConfig(
            _projectId,
            _coreContract
        );
        return _projectConfig.userMintInvocations[_purchaser];
    }

    /**
     * @notice Returns remaining invocations for a given address.
     * If `projectLimitsMintInvocationsPerAddress` is false, individual
     * addresses are only limited by the project's maximum invocations, and a
     * dummy value of zero is returned for `mintInvocationsRemaining`.
     * If `projectLimitsMintInvocationsPerAddress` is true, the quantity of
     * remaining mint invocations for address `_address` is returned as
     * `mintInvocationsRemaining`.
     * Note that mint invocations per address can be changed at any time by the
     * artist of a project.
     * Also note that all mint invocations are limited by a project's maximum
     * invocations as defined on the core contract. This function may return
     * a value greater than the project's remaining invocations.
     */
    function projectRemainingInvocationsForAddress(
        uint256 _projectId,
        address _coreContract,
        address _address
    )
        internal
        view
        returns (
            bool projectLimitsMintInvocationsPerAddress,
            uint256 mintInvocationsRemaining
        )
    {
        MerkleProjectConfig storage _projectConfig = getMerkleProjectConfig(
            _projectId,
            _coreContract
        );
        uint256 maxInvocationsPerAddress = projectMaxInvocationsPerAddress(
            _projectConfig
        );
        if (maxInvocationsPerAddress == 0) {
            // project does not limit mint invocations per address, so leave
            // `projectLimitsMintInvocationsPerAddress` at solidity initial
            // value of false. Also leave `mintInvocationsRemaining` at
            // solidity initial value of zero, as indicated in this function's
            // documentation.
        } else {
            projectLimitsMintInvocationsPerAddress = true;
            uint256 userMintInvocations = _projectConfig.userMintInvocations[
                _address
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
     * @param _projectId Project Id to get config for
     * @param _coreContract Core contract address to get config for
     */
    function getMerkleProjectConfig(
        uint256 _projectId,
        address _coreContract
    ) internal view returns (MerkleProjectConfig storage) {
        return s().merkleProjectConfigs[_coreContract][_projectId];
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
