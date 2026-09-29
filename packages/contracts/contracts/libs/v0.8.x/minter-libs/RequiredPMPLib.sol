// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPV0} from "../../../interfaces/v0.8.x/IPMPV0.sol";
import {IPMPProjectViewsV0} from "../../../interfaces/v0.8.x/IPMPProjectViewsV0.sol";

import {ImmutableStringArray} from "../ImmutableStringArray.sol";

/**
 * @title Art Blocks Required PMP Library
 * @notice This library manages the set of post-mint param (PMP) keys that a
 * project requires to be configured during mint. It provides functionality to
 * set a project's required keys, validated against the project's PMP
 * configuration, and to enforce during mint that all required keys are being
 * configured.
 * @dev The validation performed when setting a project's required keys is a
 * setup-time guardrail, not a durable guarantee. A project's artist may
 * reconfigure the project on the PMP contract at any time afterwards, and this
 * library has no hook into that. The guarantee that a token cannot be minted
 * without its required params being set comes from combining the mint-time
 * presence check in this library with the PMP contract's own validation, which
 * reverts if a forwarded key is not part of the project's active config or does
 * not authenticate the caller.
 * @dev Consequently, an artist who invalidates a required key's PMP config
 * after the fact will halt all minting on the project until either the PMP
 * config or the project's required keys are corrected.
 * @author Art Blocks Inc.
 */
library RequiredPMPLib {
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    // position of Required PMP Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant REQUIRED_PMP_LIB_STORAGE_POSITION =
        keccak256("requiredpmplib.storage");

    // @dev matches the PMP contract's own per-project config cap. Required keys
    // must be a deduplicated subset of the project's configured keys, so in
    // practice the project's key count is the binding constraint.
    uint256 internal constant MAX_REQUIRED_PMP_KEYS = 256;

    /**
     * @notice The set of PMP keys required to be configured during mint for
     * project `projectId` was updated to `requiredPMPKeys`.
     * @dev A dedicated event is used rather than GenericMinterEventsLib, which
     * intentionally does not support string values.
     * @param projectId Project ID the required keys were set for
     * @param coreContract Core contract address that projectId is on
     * @param requiredPMPKeys The project's new set of required PMP keys. An
     * empty array indicates the project has no required keys.
     */
    event ProjectRequiredPMPKeysUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        string[] requiredPMPKeys
    );

    struct RequiredPMPProjectConfig {
        // required keys, stored efficiently for introspection
        ImmutableStringArray.StringArray requiredKeys; // slot 0: 32 bytes
        // keccak256(abi.encode(key)) of each required key, aligned by index
        // with requiredKeys. Stored so that the mint-time presence check does
        // not need to load and hash the packed strings.
        bytes32[] requiredKeyHashes; // slot 1: 32 bytes
    }

    // Diamond storage pattern is used in this library
    struct RequiredPMPLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => RequiredPMPProjectConfig)) requiredPMPProjectConfigs;
    }

    /**
     * @notice Sets the PMP keys that project `projectId` requires to be
     * configured during mint, replacing any previously set keys.
     * @dev Each key is validated against the project's configuration on
     * `pmpContract`: it must be part of the project's active config, must
     * authenticate `address(this)` as a configuring address, and must never
     * lock. Duplicate keys are rejected.
     * @dev An empty `requiredPMPKeys` array clears the project's required keys.
     * @param projectId Project ID to set the required PMP keys for.
     * @param coreContract Core contract address for the given project.
     * @param pmpContract PMP contract the project's params are configured on.
     * @param requiredPMPKeys PMP keys to require during mint.
     */
    function setRequiredPMPKeys(
        uint256 projectId,
        address coreContract,
        address pmpContract,
        string[] calldata requiredPMPKeys
    ) internal {
        uint256 numKeys = requiredPMPKeys.length;
        require(numKeys <= MAX_REQUIRED_PMP_KEYS, "Only <= 256 req PMP keys");

        // load the project's current PMP config nonce, used to verify that each
        // required key is part of the project's active PMP config
        // @dev loaded once here rather than per key
        (, uint8 projectConfigNonce, , ) = IPMPProjectViewsV0(pmpContract)
            .getProjectConfig({
                coreContract: coreContract,
                projectId: projectId
            });

        bytes32[] memory keyHashes = new bytes32[](numKeys);
        for (uint256 i = 0; i < numKeys; i++) {
            bytes32 keyHash = keccak256(abi.encode(requiredPMPKeys[i]));
            // reject duplicate keys
            for (uint256 j = 0; j < i; j++) {
                require(keyHashes[j] != keyHash, "Duplicate req PMP key");
            }
            keyHashes[i] = keyHash;
            _validateRequiredPMPKey({
                projectId: projectId,
                coreContract: coreContract,
                pmpContract: pmpContract,
                pmpKey: requiredPMPKeys[i],
                projectConfigNonce: projectConfigNonce
            });
        }

        RequiredPMPProjectConfig
            storage requiredPMPProjectConfig = getRequiredPMPProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        ImmutableStringArray.store(
            requiredPMPProjectConfig.requiredKeys,
            requiredPMPKeys
        );
        requiredPMPProjectConfig.requiredKeyHashes = keyHashes;

        emit ProjectRequiredPMPKeysUpdated({
            projectId: projectId,
            coreContract: coreContract,
            requiredPMPKeys: requiredPMPKeys
        });
    }

    /**
     * @notice Checks that every PMP key required by project `projectId` is
     * present in `pmpInputs`.
     * @dev Reverts if any required key is missing. Additional non-required keys
     * in `pmpInputs` are permitted.
     * @dev Only presence is checked here. The PMP contract validates that each
     * forwarded input is well-formed and authorized when it is configured.
     * @param projectId Project ID being minted on.
     * @param coreContract Core contract address for the given project.
     * @param pmpInputs PMP inputs submitted with the purchase.
     */
    function preMintChecks(
        uint256 projectId,
        address coreContract,
        IPMPV0.PMPInput[] calldata pmpInputs
    ) internal view {
        bytes32[] storage requiredKeyHashes = getRequiredPMPProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        }).requiredKeyHashes;
        uint256 numRequired = requiredKeyHashes.length;
        // no required keys - nothing to enforce
        if (numRequired == 0) {
            return;
        }

        // hash each input key once, for comparison against every required key
        uint256 numInputs = pmpInputs.length;
        bytes32[] memory inputKeyHashes = new bytes32[](numInputs);
        for (uint256 i = 0; i < numInputs; i++) {
            inputKeyHashes[i] = keccak256(abi.encode(pmpInputs[i].key));
        }

        for (uint256 i = 0; i < numRequired; i++) {
            bytes32 requiredKeyHash = requiredKeyHashes[i];
            bool isPresent = false;
            for (uint256 j = 0; j < numInputs; j++) {
                if (inputKeyHashes[j] == requiredKeyHash) {
                    isPresent = true;
                    break;
                }
            }
            require(isPresent, "Req PMP key not set");
        }
    }

    /**
     * @notice Checks that project `projectId` has no required PMP keys.
     * @dev Used to gate purchase functions that do not accept PMP inputs, which
     * would otherwise bypass a project's required keys entirely.
     * @param projectId Project ID being minted on.
     * @param coreContract Core contract address for the given project.
     */
    function requireNoRequiredPMPKeys(
        uint256 projectId,
        address coreContract
    ) internal view {
        require(
            getRequiredPMPProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            }).requiredKeyHashes.length == 0,
            "Project requires PMPs"
        );
    }

    /**
     * @notice Returns the PMP keys required to be configured during mint for
     * project `projectId`.
     * @param projectId Project ID to get the required PMP keys for.
     * @param coreContract Core contract address for the given project.
     * @return The project's required PMP keys. Empty if none are required.
     */
    function getRequiredPMPKeys(
        uint256 projectId,
        address coreContract
    ) internal view returns (string[] memory) {
        return
            getRequiredPMPProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            }).requiredKeys.getAll();
    }

    /**
     * Loads the RequiredPMPProjectConfig for a given project and core contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getRequiredPMPProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (RequiredPMPProjectConfig storage) {
        return s().requiredPMPProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Validates that `pmpKey` may be required during mint for project
     * `projectId`.
     * @dev Reverts if the key is not part of the project's active PMP config,
     * does not authenticate this contract as a configuring address, or could
     * ever lock.
     * @param projectId Project ID the key is being required for.
     * @param coreContract Core contract address for the given project.
     * @param pmpContract PMP contract the project's params are configured on.
     * @param pmpKey PMP key to validate.
     * @param projectConfigNonce The project's current PMP config nonce.
     */
    function _validateRequiredPMPKey(
        uint256 projectId,
        address coreContract,
        address pmpContract,
        string calldata pmpKey,
        uint8 projectConfigNonce
    ) private view {
        IPMPV0.PMPConfigView memory pmpConfig = IPMPProjectViewsV0(pmpContract)
            .getProjectPMPConfig({
                coreContract: coreContract,
                projectId: projectId,
                pmpKey: pmpKey
            });
        // the key must be configured on the project
        // @dev checked independently of the config nonce, because a project
        // that has never been configured has a zero nonce that would otherwise
        // trivially match an unconfigured key's zero highestConfigNonce
        require(
            pmpConfig.paramType != IPMPV0.ParamType.Unconfigured,
            "Req PMP key unconfigured"
        );
        // ...and must be part of the project's most recently configured params
        require(
            pmpConfig.highestConfigNonce == projectConfigNonce,
            "Req PMP key not in config"
        );
        // ...and must permit a configured address to set its value, since this
        // contract is the caller when the key is configured at mint
        require(
            _authOptionIncludesAddress(pmpConfig.authOption),
            "Req PMP key needs addr auth"
        );
        // ...and that configured address must be this contract
        require(
            pmpConfig.authAddress == address(this),
            "Req PMP key must auth minter"
        );
        // ...and must never lock, because a locked key can no longer be
        // configured by any party and would permanently halt minting
        require(
            pmpConfig.pmpLockedAfterTimestamp == 0,
            "Req PMP key must never lock"
        );
    }

    /**
     * @notice Returns whether `authOption` permits a configured address to set
     * a param's value.
     * @param authOption The PMP auth option to check.
     * @return bool True if the auth option includes address authentication.
     */
    function _authOptionIncludesAddress(
        IPMPV0.AuthOption authOption
    ) private pure returns (bool) {
        return
            authOption == IPMPV0.AuthOption.Address ||
            authOption == IPMPV0.AuthOption.ArtistAndAddress ||
            authOption == IPMPV0.AuthOption.TokenOwnerAndAddress ||
            authOption == IPMPV0.AuthOption.ArtistAndTokenOwnerAndAddress;
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The RequiredPMPLibStorage struct.
     */
    function s()
        internal
        pure
        returns (RequiredPMPLibStorage storage storageStruct)
    {
        bytes32 position = REQUIRED_PMP_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
