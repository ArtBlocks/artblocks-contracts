// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {IWeb3Call} from "../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";
import {IPMPConfigureHook} from "../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "../interfaces/v0.8.x/IPMPAugmentHook.sol";
import {IGenArt721CoreContractV3_Base} from "../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";
import {IDelegateRegistry} from "../interfaces/v0.8.x/IDelegateRegistry.sol";

import {ERC165Checker} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165Checker.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin-5.0/contracts/utils/ReentrancyGuard.sol";

import {Web3Call} from "./Web3Call.sol";
import {ImmutableStringArray} from "../libs/v0.8.x/ImmutableStringArray.sol";
import {ABHelpers} from "../libs/v0.8.x/ABHelpers.sol";

/**
 * @title Project Metadata Parameters (PMP) contract, V0
 * @author Art Blocks Inc.
 * @notice This contract enables Artists to define and configure project parameters that token
 * owners can set within constraints. This provides a standardized way for projects to expose
 * configurable parameters that can be used by renderers and other contracts.
 * WARNING: This contract implements an open protocol for parameter configuration, and does not
 * restrict usage to Art Blocks or its affiliates. Use with caution. The contract does assume
 * that the core contract conforms to the IGenArt721CoreContractV3_Base interface for authentication,
 * and that the core contract is using the ERC721 standard for token management. These assumptions
 * may not hold for all core contracts, especially those outside of the Art Blocks ecosystem.
 * @notice Artists may configure arbitrary external hooks for post-token-configuration and
 * read-augmentation. These hooks are executed at the end of the token configuration process
 * and when reading token PMPs, respectively. These hooks are validated for ERC165 interface
 * compatibility, but have the ability to execute arbitrary code at the discretion of the artist.
 * The contract implements reentrancy guards to protect against reentrancy attacks during hook calls,
 * resulting in the subcall having a similar level as a minting contract sending funds to an artist's
 * additional payee address during a token sale. Use appropriate discretion.
 * WARNING: Hook calls are not validated, and may cause unexpected behavior. These include:
 * - Hooks may revert the transaction, resulting in denial of service
 * - Hooks may augment the token's returned parameters with unintended data, resulting in
 *   unexpected behavior
 * The artist is solely responsible for configuring hooks and validating their behavior.
 * @dev This contract implements the IWeb3Call and IPMPV0 interfaces, providing functionality
 * for parameter configuration and retrieval. It includes support for various parameter types,
 * authorization options, and hooks for extending functionality.
 */
contract PMPV0 is IPMPV0, Web3Call, ReentrancyGuard {
    using Strings for string;
    using Strings for uint256;
    using Strings for int256;
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    IDelegateRegistry public immutable delegateRegistry;
    bytes32 public constant DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS =
        bytes32("postmintparameters");

    bytes32 private constant _TYPE = "PMPV0";

    bytes16 private constant _HEX_DIGITS = "0123456789abcdef";
    uint256 private constant _DECIMAL_PRECISION_DIGITS = 10;
    uint256 private constant _DECIMAL_PRECISION =
        10 ** _DECIMAL_PRECISION_DIGITS;

    // @dev min hex color assumed to be 0x000000
    // @dev intentionally not including alpha channel, can be separate PMP if desired
    uint256 private constant _HEX_COLOR_MAX = 0xFFFFFF;

    uint256 private constant _TIMESTAMP_MIN = 0; // @dev unix timestamp, 0 = 1970-01-01
    uint256 private constant _TIMESTAMP_MAX = type(uint64).max; // max guardrail, ~10 billion years

    /**
     * @notice Storage structure for parameter configuration.
     * @dev Includes additional field highestConfigNonce compared to PMPConfig.
     */
    struct PMPConfigStorage {
        // @dev highest config nonce for which this PMPConfig is valid (relative to projectConfig.configNonce)
        uint8 highestConfigNonce; // slot 0: 1 byte
        AuthOption authOption; // slot 0: 1 byte
        ParamType paramType; // slot 0: 1 byte
        uint48 pmpLockedAfterTimestamp; // slot 0: 6 bytes // @dev uint48 is sufficient to store ~2^48 seconds, ~8,900 years
        address authAddress; // slot 0: 20 bytes
        // @dev store array length as uint8 in slot 0 for SLOAD efficiency during token configuration
        uint8 selectOptionsLength; // slot 0: 1 byte
        // @dev use immutable string array for storage efficiency during project configuration
        ImmutableStringArray.StringArray selectOptions; // slot 1: 32 bytes
        bytes32 minRange; // slot 2: 32 bytes
        bytes32 maxRange; // slot 3: 32 bytes
    }

    // @dev core contract address and projectId are implicit based on mapping pointing to ProjectConfig struct
    struct ProjectConfig {
        // @dev array of pmpKeys for efficient enumeration, uses efficient SSTORE2 storage
        ImmutableStringArray.StringArray pmpKeys; // slot 0: 32 bytes
        // @dev mapping of pmpKeys to PMPConfigStorage for O(1) access, and cheap updates when no changes
        mapping(bytes32 pmpKeyHash => PMPConfigStorage pmpConfigStorage) pmpConfigsStorage; // slot 1: 32 bytes
        // config nonce that is incremented during each configureProject call
        uint8 configNonce; // slot 2: 1 byte
        // post-configuration hook to be called after a token's PMP is configured
        IPMPConfigureHook tokenPMPPostConfigHook; // slot 2: 20 bytes
        // token pmp read augmentation hook to be called when reading a token's PMPs
        IPMPAugmentHook tokenPMPReadAugmentationHook; // slot 3: 20 bytes
    }

    // mapping of ProjectConfig structs for each project
    mapping(address coreContract => mapping(uint256 projectId => ProjectConfig projectConfig)) projectConfigs;

    // mapping of PMP structs for each token
    mapping(address coreContract => mapping(uint256 tokenId => mapping(bytes32 pmpKeyHash => PMPStorage pmp))) tokenPMPs;

    /**
     * @notice Constructor for PMPV0 contract.
     * @param delegateRegistry_ The address of the delegate registry contract. Intended to be
     * the delegate.xyz v2 contract.
     */
    constructor(IDelegateRegistry delegateRegistry_) {
        delegateRegistry = delegateRegistry_;
        emit DelegationRegistryUpdated(address(delegateRegistry_));
    }

    /**
     * @notice Configure project hooks for post-configuration and read augmentation.
     * WARNING: Hook calls may revert the transaction, and may cause unexpected behavior.
     * The artist is solely responsible for configuring hooks and validating their behavior.
     * Improper configuration or hooks with unexpected behavior may result in denial of service,
     * unexpected behavior, or other issues.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure hooks for.
     * @param tokenPMPPostConfigHook The hook to call after a token's PMP is configured.
     * @param tokenPMPReadAugmentationHook The hook to call when reading a token's PMPs.
     * @dev Only the project artist can configure project hooks.
     * @dev Both hooks are validated for ERC165 interface compatibility.
     * @dev Uses nonReentrant modifier to prevent reentrancy attacks during hook calls or auth checks.
     */
    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    ) external nonReentrant {
        // only artists may configure project hooks
        _onlyArtist({
            coreContract: coreContract,
            projectId: projectId,
            sender: msg.sender
        });
        // validation - check for ERC165 implementation for non-null hooks
        if (address(tokenPMPPostConfigHook) != address(0)) {
            // use ERC165 checker to validate implementation
            require(
                ERC165Checker.supportsInterface({
                    account: address(tokenPMPPostConfigHook),
                    interfaceId: type(IPMPConfigureHook).interfaceId
                }),
                "PMP: tokenPMPPostConfigHook does not implement IPMPConfigureHook"
            );
        }
        if (address(tokenPMPReadAugmentationHook) != address(0)) {
            require(
                ERC165Checker.supportsInterface({
                    account: address(tokenPMPReadAugmentationHook),
                    interfaceId: type(IPMPAugmentHook).interfaceId
                }),
                "PMP: tokenPMPReadAugmentationHook does not implement IPMPAugmentHook"
            );
        }
        // update projectConfig
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        projectConfig.tokenPMPPostConfigHook = tokenPMPPostConfigHook;
        projectConfig
            .tokenPMPReadAugmentationHook = tokenPMPReadAugmentationHook;

        // emit event
        emit ProjectHooksConfigured({
            coreContract: coreContract,
            projectId: projectId,
            tokenPMPPostConfigHook: tokenPMPPostConfigHook,
            tokenPMPReadAugmentationHook: tokenPMPReadAugmentationHook
        });
    }

    /**
     * @notice Configure the available parameters for a project and their constraints.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure parameters for.
     * @param pmpInputConfigs Array of parameter configurations defining the available parameters.
     * @dev Only the project artist can configure project parameters.
     * @dev Each configuration is validated for proper parameter type and constraints.
     * @dev The project's configuration nonce is incremented with each call.
     * @dev Only <= 256 configs are supported.
     * @dev Only <= 255 bytes are supported for pmpKeys.
     * @dev nonReentrant due to auth check that requires interaction.
     */
    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external nonReentrant {
        // only artists may configure projects
        _onlyArtist({
            coreContract: coreContract,
            projectId: projectId,
            sender: msg.sender
        });
        // validate pmpInputConfigs
        uint256 pmpInputConfigsLength = pmpInputConfigs.length;
        // @dev no coverage on else branch due to test complexity
        require(pmpInputConfigsLength <= 256, "PMP: Only <= 256 configs");
        for (uint256 i = 0; i < pmpInputConfigsLength; i++) {
            uint256 keyLengthBytes = bytes(pmpInputConfigs[i].key).length;
            // @dev max key length constraint is a reasonable gas guardrail
            require(
                keyLengthBytes > 0 && keyLengthBytes < 256,
                "PMP: pmpKey cannot be empty or exceed 255 bytes"
            );
            _validatePMPConfig(pmpInputConfigs[i].pmpConfig);
        }
        // store pmpInputConfigs data in ProjectConfig struct
        // @dev load projectConfig storage pointer
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        // increment config nonce
        // @dev solidity ^0.8 reverts on overflow (greater than 255 edits not supported)
        uint8 newConfigNonce = projectConfig.configNonce + 1;
        projectConfig.configNonce = newConfigNonce;

        // efficiently sync pmp keys to ProjectConfig
        // copy input pmp keys to memory array for efficient passing to _syncPMPKeys
        string[] memory pmpKeys = new string[](pmpInputConfigsLength);
        for (uint256 i = 0; i < pmpInputConfigsLength; i++) {
            pmpKeys[i] = pmpInputConfigs[i].key;
        }
        _syncPMPKeys({inputKeys: pmpKeys, projectConfig: projectConfig});
        // store pmp configs in ProjectConfig struct's mapping
        for (uint256 i = 0; i < pmpInputConfigsLength; i++) {
            // store pmpConfigStorage in ProjectConfig struct's mapping
            PMPConfigStorage storage pmpConfigStorage = projectConfig
                .pmpConfigsStorage[_getStringHash(pmpKeys[i])];
            {
                // validate that any current pmp at this key is not locked
                uint256 currentPPMLockedAfterTimestamp = pmpConfigStorage
                    .pmpLockedAfterTimestamp;
                require(
                    currentPPMLockedAfterTimestamp == 0 ||
                        currentPPMLockedAfterTimestamp > block.timestamp,
                    "PMP: pmp is locked and cannot be updated"
                );
            }
            // update highestConfigNonce
            pmpConfigStorage.highestConfigNonce = newConfigNonce;
            // copy function input pmpConfig data to pmpConfigStorage
            PMPConfig memory inputPMPConfig = pmpInputConfigs[i].pmpConfig;
            pmpConfigStorage.authOption = inputPMPConfig.authOption;
            pmpConfigStorage.paramType = inputPMPConfig.paramType;
            pmpConfigStorage.pmpLockedAfterTimestamp = inputPMPConfig
                .pmpLockedAfterTimestamp;
            pmpConfigStorage.authAddress = inputPMPConfig.authAddress;
            // @dev length already validated <= 255 in _validatePMPConfig, safe to cast unchecked
            pmpConfigStorage.selectOptionsLength = uint8(
                inputPMPConfig.selectOptions.length
            );
            // @dev ImmutableStringArray is optimized for the case where the array is empty.
            ImmutableStringArray.store(
                pmpConfigStorage.selectOptions,
                inputPMPConfig.selectOptions
            );
            pmpConfigStorage.minRange = inputPMPConfig.minRange;
            pmpConfigStorage.maxRange = inputPMPConfig.maxRange;
        }

        // emit event
        emit ProjectConfigured({
            coreContract: coreContract,
            projectId: projectId,
            pmpInputConfigs: pmpInputConfigs,
            projectConfigNonce: newConfigNonce
        });
    }

    /**
     * @notice Configure the parameters for a specific token according to project constraints.
     * WARNING: This contract represents an open protocol for parameter configuration, and does not
     * restrict usage to Art Blocks or its affiliates. Use with caution. The contract does assume
     * that the core contract conforms to the IGenArt721CoreContractV3_Base interface for authentication,
     * and that the core contract is using the ERC721 standard for token management. These assumptions
     * may not hold for all core contracts, especially those outside of the Art Blocks ecosystem.
     * WARNING: Hook calls may revert the transaction, and may cause unexpected behavior.
     * The artist is solely responsible for configuring hooks and validating their behavior.
     * Improper configuration or hooks with unexpected behavior may result in denial of service,
     * unexpected behavior, or other issues.
     * ERC-721 Token-level wallet delegation for the TokenOwner role is supported via delegate.xyz v2.
     * For opt-in granular control of rights specific to these operations, vault owners may define subdelegations
     * with bytes32 rights "postmintparameters". Per the delegate.xyz v2 specification, delegations made with the
     * empty string "" will be interpreted as a full delegation of all rights.
     * @param coreContract The address of the core contract.
     * @param tokenId The tokenId of the token to configure.
     * @param pmpInputs The parameter inputs to configure for the token.
     * @dev Validates each parameter input against the project's configuration.
     * @dev Stores the configured parameters for the token.
     * @dev Calls the post-configuration hook if one is configured for the project.
     * @dev Uses nonReentrant modifier to prevent reentrancy attacks during hook calls or auth checks.
     */
    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external nonReentrant {
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            ABHelpers.tokenIdToProjectId(tokenId)
        ];
        // preallocate memory for auth addresses of each pmpInput
        address[] memory authAddresses = new address[](pmpInputs.length);
        // assign each pmpInput to the token
        // @dev pmpInputs processed sequentially in order of input
        for (uint256 i = 0; i < pmpInputs.length; i++) {
            bytes32 pmpKeyHash = _getStringHash(pmpInputs[i].key);
            PMPInput memory pmpInput = pmpInputs[i];
            PMPStorage storage tokenPMP = tokenPMPs[coreContract][tokenId][
                pmpKeyHash
            ];
            PMPConfigStorage storage pmpConfigStorage = projectConfig
                .pmpConfigsStorage[pmpKeyHash];
            // validate pmpInput + record the authenticated address used to configure the pmpInput
            authAddresses[i] = _validatePMPInputAndAuth({
                tokenId: tokenId,
                coreContract: coreContract,
                pmpInput: pmpInput,
                pmpConfigStorage: pmpConfigStorage,
                projectConfigNonce: projectConfig.configNonce
            });
            // store pmpInput data in PMPStorage struct
            tokenPMP.configuredParamType = pmpConfigStorage.paramType;
            // only assign the value that affects param type (gas savings)
            if (pmpConfigStorage.paramType == ParamType.String) {
                if (pmpInput.configuringArtistString) {
                    tokenPMP.artistConfiguredValueString = pmpInput
                        .configuredValueString;
                } else {
                    tokenPMP.nonArtistConfiguredValueString = pmpInput
                        .configuredValueString;
                }
            } else {
                tokenPMP.configuredValue = pmpInput.configuredValue;
            }
            // call post-config hook if configured for the project
            // @dev this function is nonreentrant for additional reentrancy protection
            // @dev intentionally revert entire transaction if hook reverts to prevent latent failure
            if (address(projectConfig.tokenPMPPostConfigHook) != address(0)) {
                projectConfig.tokenPMPPostConfigHook.onTokenPMPConfigure({
                    coreContract: coreContract,
                    tokenId: tokenId,
                    pmpInput: pmpInput
                });
            }
        }

        // emit event
        emit TokenParamsConfigured({
            coreContract: coreContract,
            tokenId: tokenId,
            pmpInputs: pmpInputs,
            authAddresses: authAddresses
        });
    }

    /**
     * @notice Get the token parameters for a given token.
     * If none are configured, the tokenParams should be empty.
     * WARNING: Hook calls may revert the transaction, and may cause unexpected behavior.
     * The artist is solely responsible for configuring hooks and validating their behavior.
     * Improper configuration or hooks with unexpected behavior may result in denial of service,
     * unexpected behavior, or other issues.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @return tokenParams An array of token parameters for the queried token.
     */
    function getTokenParams(
        address coreContract,
        uint256 tokenId
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory tokenParams)
    {
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        string[] memory pmpKeys = projectConfig.pmpKeys.getAll();
        uint256 pmpKeysLength = pmpKeys.length;
        // @dev initialize tokenParams array with maximum possible length
        tokenParams = new IWeb3Call.TokenParam[](pmpKeysLength);
        uint256 populatedParamsIndex = 0; // @dev index of next populated tokenParam
        for (uint256 i = 0; i < pmpKeysLength; i++) {
            // load pmp value
            bytes32 pmpKeyHash = _getStringHash(pmpKeys[i]);
            (bool isConfigured, string memory value) = _getPMPValue({
                pmpConfigStorage: projectConfig.pmpConfigsStorage[pmpKeyHash],
                pmp: tokenPMPs[coreContract][tokenId][pmpKeyHash]
            });
            // continue when param is unconfigured
            if (!isConfigured) {
                // continue without incrementing populatedParamsIndex
                continue;
            }
            // append configured to tokenParams array
            tokenParams[populatedParamsIndex] = IWeb3Call.TokenParam({
                key: pmpKeys[i],
                value: value
            });
            populatedParamsIndex++;
        }
        // truncate tokenParams array to populatedParamsIndex via assembly
        assembly {
            // directly modify the memory array length in memory
            mstore(tokenParams, populatedParamsIndex)
        }

        // call augmentation hook if configured for the project
        if (address(projectConfig.tokenPMPReadAugmentationHook) != address(0)) {
            // assign return value to the augmented tokenParams
            // @dev executed in read-only context, artist-configured hook contract (not entirely arbitrary)
            tokenParams = projectConfig
                .tokenPMPReadAugmentationHook
                .onTokenPMPReadAugmentation({
                    coreContract: coreContract,
                    tokenId: tokenId,
                    tokenParams: tokenParams
                });
        }

        // @dev implicitly returns tokenParams
    }

    // ---- introspection view functions ----

    /**
     * @notice Get the project config for a given project.
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @return pmpKeys The configured pmpKeys for the project.
     * @return configNonce The config nonce for the project.
     * @return tokenPMPPostConfigHook The tokenPMPPostConfigHook for the project.
     * @return tokenPMPReadAugmentationHook The tokenPMPReadAugmentationHook for the project.
     */
    function getProjectConfig(
        address coreContract,
        uint256 projectId
    )
        external
        view
        returns (
            string[] memory pmpKeys,
            uint8 configNonce,
            IPMPConfigureHook tokenPMPPostConfigHook,
            IPMPAugmentHook tokenPMPReadAugmentationHook
        )
    {
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        // @dev edge case - uninitialized pmpKeys - empty array returned by getAll()
        pmpKeys = projectConfig.pmpKeys.getAll();
        configNonce = projectConfig.configNonce;
        tokenPMPPostConfigHook = projectConfig.tokenPMPPostConfigHook;
        tokenPMPReadAugmentationHook = projectConfig
            .tokenPMPReadAugmentationHook;
    }

    /**
     * @notice Checks if the given wallet has the owner role for the given token.
     * It returns true if the wallet is the owner of the token or if the wallet
     * is a delegate of the token owner; otherwise it returns false.
     * Reverts if an invalid coreContract or tokenId is provided.
     * Provided for convenience, as the same check is performed in the
     * configureTokenParams function.
     * @param wallet The wallet address to check.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to check.
     * @return isTokenOwnerOrDelegate_ True if the wallet is the owner or a delegate of the token,
     * false otherwise.
     */
    function isTokenOwnerOrDelegate(
        address wallet,
        address coreContract,
        uint256 tokenId
    ) external view returns (bool isTokenOwnerOrDelegate_) {
        (isTokenOwnerOrDelegate_, ) = _isTokenOwnerOrDelegate({
            tokenId: tokenId,
            coreContract: coreContract,
            sender: wallet
        });
    }

    /**
     * @notice Get the PMP config from storage for a given project and pmpKey.
     * @dev Returns the storage values, even if unconfigured or not part of the
     * active project config. Check latestConfigNonce to verify if the pmpKey
     * is part of the active project config.
     * @dev any populated select options are loaded and returned as a string array
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @param pmpKey The pmpKey of the pmp to get data for.
     * @return pmpConfigView The PMP config for the given project and pmpKey.
     */
    function getProjectPMPConfig(
        address coreContract,
        uint256 projectId,
        string memory pmpKey
    ) external view returns (PMPConfigView memory pmpConfigView) {
        PMPConfigStorage storage pmpConfigStorage = projectConfigs[
            coreContract
        ][projectId].pmpConfigsStorage[_getStringHash(pmpKey)];
        // load values from storage
        pmpConfigView.highestConfigNonce = pmpConfigStorage.highestConfigNonce;
        pmpConfigView.authOption = pmpConfigStorage.authOption;
        pmpConfigView.paramType = pmpConfigStorage.paramType;
        pmpConfigView.pmpLockedAfterTimestamp = pmpConfigStorage
            .pmpLockedAfterTimestamp;
        pmpConfigView.authAddress = pmpConfigStorage.authAddress;
        pmpConfigView.selectOptionsLength = pmpConfigStorage
            .selectOptionsLength;
        pmpConfigView.selectOptions = pmpConfigStorage.selectOptions.getAll();
        pmpConfigView.minRange = pmpConfigStorage.minRange;
        pmpConfigView.maxRange = pmpConfigStorage.maxRange;
    }

    /**
     * @notice Get the PMP storage for a given token and pmpKey.
     * Returns the PMP storage struct for the queried token and pmpKey. The storage
     * may be stale if the token has been reconfigured, or empty if never configured.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @param pmpKey The pmpKey of the pmp to get data for.
     * @return pmp The PMP storage for the given token and pmpKey.
     */
    function getTokenPMPStorage(
        address coreContract,
        uint256 tokenId,
        string memory pmpKey
    ) external view returns (PMPStorage memory pmp) {
        pmp = tokenPMPs[coreContract][tokenId][_getStringHash(pmpKey)];
    }

    /**
     * @notice Synchronizes the project's parameter keys with the provided input keys.
     * @dev Only updates the storage if the keys have changed to optimize gas usage.
     * @param inputKeys The new parameter keys to store.
     * @param projectConfig The project configuration storage reference.
     */
    function _syncPMPKeys(
        string[] memory inputKeys,
        ProjectConfig storage projectConfig
    ) internal {
        string[] memory currentKeys = projectConfig.pmpKeys.getAll();
        // determine if inputKeys are different from currentKeys to avoid expensive operation
        // @dev in general, we don't expect many changes to pmpKeys after initial configuration
        bool keysChanged = false;
        if (inputKeys.length != currentKeys.length) {
            keysChanged = true;
        } else {
            for (uint256 i = 0; i < inputKeys.length; i++) {
                if (!inputKeys[i].equal(currentKeys[i])) {
                    keysChanged = true;
                    break;
                }
            }
        }
        // if keys changed, update projectConfig's pmpKeys (expensive operation)
        if (keysChanged) {
            ImmutableStringArray.store(projectConfig.pmpKeys, inputKeys);
        }
    }

    /**
     * @notice Validates a PMP configuration. Ensures arbitrary input is valid and intentional.
     * @dev Verifies parameter types, authorization options, and constraints.
     * @param pmpConfig The PMP configuration to validate.
     */
    function _validatePMPConfig(PMPConfig calldata pmpConfig) internal view {
        // memoize paramType and authOption
        ParamType paramType = pmpConfig.paramType;
        AuthOption authOption = pmpConfig.authOption;
        // require type is not unconfigured
        require(
            paramType != ParamType.Unconfigured,
            "PMP: paramType is unconfigured"
        );
        // validate locked after timestamp is in the future, or is zero (unlimited)
        require(
            pmpConfig.pmpLockedAfterTimestamp == 0 ||
                pmpConfig.pmpLockedAfterTimestamp > block.timestamp,
            "PMP: pmpLockedAfterTimestamp is in the past and not unlimited (zero)"
        );
        // validate enums are within bounds
        // @dev no coverage else branch, this is redundant as used due to solidity compiler checks on function enum inputs
        require(
            authOption <= AuthOption.ArtistAndTokenOwnerAndAddress,
            "PMP: Invalid authOption"
        );
        // @dev no coverage else branch, this is redundant as used due to solidity compiler checks on function enum inputs
        require(paramType <= ParamType.String, "PMP: Invalid paramType");
        // only artist+ authentication types are supported for string params
        if (paramType == ParamType.String) {
            require(
                authOption == AuthOption.Artist ||
                    authOption == AuthOption.ArtistAndTokenOwner ||
                    authOption == AuthOption.ArtistAndTokenOwnerAndAddress ||
                    authOption == AuthOption.ArtistAndAddress,
                "PMP: String params must have artist+ authentication"
            );
        }
        // validate auth with address has non-zero auth address
        if (
            authOption == AuthOption.Address ||
            authOption == AuthOption.TokenOwnerAndAddress ||
            authOption == AuthOption.ArtistAndAddress ||
            authOption == AuthOption.ArtistAndTokenOwnerAndAddress
        ) {
            require(
                pmpConfig.authAddress != address(0),
                "PMP: authAddress is zero"
            );
        } else {
            // auth address must be zero for any non-address auth option
            require(
                pmpConfig.authAddress == address(0),
                "PMP: authAddress is not zero"
            );
        }
        // validate appropriate fields are empty
        if (
            paramType == ParamType.Bool ||
            paramType == ParamType.String ||
            paramType == ParamType.HexColor
        ) {
            // @dev should have all fields empty
            require(
                pmpConfig.selectOptions.length == 0,
                "PMP: selectOptions is not empty"
            );
            // @dev min/max range for hex color checked during assignment, should be empty in config
            require(pmpConfig.minRange == 0, "PMP: minRange is not empty");
            require(pmpConfig.maxRange == 0, "PMP: maxRange is not empty");
        } else if (paramType == ParamType.Select) {
            // @dev select should have selectOptions and empty min/max range values
            require(
                pmpConfig.selectOptions.length > 0,
                "PMP: selectOptions is empty"
            );
            require(
                pmpConfig.selectOptions.length < 256,
                "PMP: selectOptions length > 255"
            );
            // @dev do not check if options are unique on-chain
            // require min/max range values are empty
            require(pmpConfig.minRange == 0, "PMP: minRange is not empty");
            require(pmpConfig.maxRange == 0, "PMP: maxRange is not empty");
        } else if (
            paramType == ParamType.Uint256Range ||
            paramType == ParamType.Int256Range ||
            paramType == ParamType.DecimalRange ||
            paramType == ParamType.Timestamp
        ) {
            // @dev range params should have empty selectOptions
            require(
                pmpConfig.selectOptions.length == 0,
                "PMP: selectOptions is not empty"
            );
            // require minRange is less than maxRange
            if (paramType == ParamType.Int256Range) {
                // cast minRange and maxRange to int256
                int256 minRange = int256(uint256(pmpConfig.minRange));
                int256 maxRange = int256(uint256(pmpConfig.maxRange));
                require(minRange < maxRange, "PMP: minRange >= maxRange");
            } else {
                // cast minRange and maxRange to uint256
                // @dev lt works for uint256, decimal, or timestamp types cast as uint256
                uint256 minRange = uint256(pmpConfig.minRange);
                uint256 maxRange = uint256(pmpConfig.maxRange);
                require(minRange < maxRange, "PMP: minRange >= maxRange");
                // additional guardrails on timestamp range
                if (paramType == ParamType.Timestamp) {
                    // require maxRange is not gt _TIMESTAMP_MAX
                    require(
                        maxRange <= _TIMESTAMP_MAX,
                        "PMP: maxRange > _TIMESTAMP_MAX"
                    );
                }
            }
        } else {
            // @dev should never reach, no coverage
            revert("PMP: Invalid paramType");
        }
    }

    /**
     * @notice Validates a PMP input against the project's configuration.
     * Includes auth checks based on the pmpKey's current authOption.
     * @dev Checks authorization, parameter type consistency, and value constraints.
     * @dev Checks that pmp param is included in most recently configured PMP config for token's project.
     * @param tokenId The token ID for which the parameter is being configured.
     * @param coreContract The address of the core contract.
     * @param pmpInput The parameter input to validate.
     * @param pmpConfigStorage The project's configuration storage for this parameter.
     * @param projectConfigNonce The project's current configuration nonce.
     * @return permissionedAddress the address used to make the update, accounting for delegation.
     */
    function _validatePMPInputAndAuth(
        uint256 tokenId,
        address coreContract,
        PMPInput memory pmpInput,
        PMPConfigStorage storage pmpConfigStorage,
        uint8 projectConfigNonce
    ) internal view returns (address permissionedAddress) {
        // check that the param is part of the project's most recently configured PMP params
        // @dev use config nonce to check if param is part of most recently configured PMP params
        require(
            pmpConfigStorage.highestConfigNonce == projectConfigNonce,
            "PMP: param not part of most recently configured PMP params"
        );
        // check that the param type matches and is not unconfigured
        require(
            pmpInput.configuredParamType == pmpConfigStorage.paramType,
            "PMP: paramType mismatch"
        );
        // @dev checking value in memory for lower gas cost
        require(
            pmpInput.configuredParamType != ParamType.Unconfigured,
            "PMP: input paramType is unconfigured"
        );

        // ensure caller has appropriate auth
        bool isAuthenticated;
        {
            AuthOption authOption = pmpConfigStorage.authOption;
            // if artist may configure, check and authenticate if not already authenticated
            if (
                authOption == AuthOption.Artist ||
                authOption == AuthOption.ArtistAndAddress ||
                authOption == AuthOption.ArtistAndTokenOwner ||
                authOption == AuthOption.ArtistAndTokenOwnerAndAddress
            ) {
                bool isArtist;
                (isArtist, permissionedAddress) = _isArtist({
                    tokenId: tokenId,
                    coreContract: coreContract,
                    sender: msg.sender
                });
                isAuthenticated = isArtist;
            }
            // if address may configure, check and authenticate if not already authenticated
            if (
                !isAuthenticated &&
                (authOption == AuthOption.Address ||
                    authOption == AuthOption.TokenOwnerAndAddress ||
                    authOption == AuthOption.ArtistAndAddress ||
                    authOption == AuthOption.ArtistAndTokenOwnerAndAddress)
            ) {
                permissionedAddress = pmpConfigStorage.authAddress;
                isAuthenticated = permissionedAddress == msg.sender;
            }
            // if token owner or delegate may configure, check and authenticate
            // @dev check token ownerlast to enable pre-mint PMP configuration by non-token-owner
            if (
                !isAuthenticated &&
                (authOption == AuthOption.TokenOwner ||
                    authOption == AuthOption.ArtistAndTokenOwner ||
                    authOption == AuthOption.TokenOwnerAndAddress ||
                    authOption == AuthOption.ArtistAndTokenOwnerAndAddress)
            ) {
                bool isTokenOwnerOrDelegate_;
                (
                    isTokenOwnerOrDelegate_,
                    permissionedAddress
                ) = _isTokenOwnerOrDelegate({
                    tokenId: tokenId,
                    coreContract: coreContract,
                    sender: msg.sender
                });
                isAuthenticated = isTokenOwnerOrDelegate_;
            }
        }
        // if not authenticated, revert with appropriate auth error
        if (!isAuthenticated) {
            AuthOption authOption = pmpConfigStorage.authOption;
            if (authOption == AuthOption.Artist) {
                revert("PMP: artist auth required");
            } else if (authOption == AuthOption.TokenOwner) {
                revert("PMP: token owner auth required");
            } else if (authOption == AuthOption.ArtistAndTokenOwner) {
                revert("PMP: artist and token owner auth required");
            } else if (authOption == AuthOption.Address) {
                revert("PMP: address auth required");
            } else if (authOption == AuthOption.ArtistAndTokenOwnerAndAddress) {
                revert("PMP: artist and token owner and address auth required");
            } else if (authOption == AuthOption.ArtistAndAddress) {
                revert("PMP: artist and address auth required");
            } else if (authOption == AuthOption.TokenOwnerAndAddress) {
                revert("PMP: token owner and address auth required");
            } else {
                // @dev no coverage, this should never be reached
                revert("PMP: invalid authOption");
            }
        }
        // @dev auth check is complete

        // ensure properly configured value
        ParamType paramType = pmpConfigStorage.paramType;
        // range checks for non-string params
        if (paramType != ParamType.String) {
            if (paramType == ParamType.Select) {
                require(
                    uint256(pmpInput.configuredValue) <
                        pmpConfigStorage.selectOptionsLength,
                    "PMP: selectOptions index out of bounds"
                );
            } else if (paramType == ParamType.Bool) {
                require(
                    pmpInput.configuredValue == bytes32(0) ||
                        uint256(pmpInput.configuredValue) == 1,
                    "PMP: bool param value must be 0 or 1"
                );
            } else if (
                paramType == ParamType.Uint256Range ||
                paramType == ParamType.DecimalRange
            ) {
                require(
                    pmpInput.configuredValue >= pmpConfigStorage.minRange &&
                        pmpInput.configuredValue <= pmpConfigStorage.maxRange,
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.Int256Range) {
                require(
                    int256(uint256(pmpInput.configuredValue)) >= // @dev ensure this converts as expected
                        int256(uint256(pmpConfigStorage.minRange)) &&
                        int256(uint256(pmpInput.configuredValue)) <=
                        int256(uint256(pmpConfigStorage.maxRange)),
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.Timestamp) {
                require(
                    uint256(pmpInput.configuredValue) <= _TIMESTAMP_MAX &&
                        uint256(pmpInput.configuredValue) >= _TIMESTAMP_MIN, // @dev no coverage, this is redundant due to being assigned zero
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.HexColor) {
                require(
                    uint256(pmpInput.configuredValue) <= _HEX_COLOR_MAX, // @dev minimum hex color of zero implicitly passed by using uint256
                    "PMP: invalid hex color"
                );
            } else {
                // @dev no coverage, this should never be reached
                revert("PMP: invalid paramType");
            }
        }

        // string and non-string checks
        if (pmpConfigStorage.paramType == ParamType.String) {
            require(
                pmpInput.configuredValue == bytes32(0),
                "PMP: value must be empty for string params"
            );
            // require artist is caller if configuring artist string
            if (pmpInput.configuringArtistString) {
                // require artist is caller
                (bool isArtist, ) = _isArtist({
                    tokenId: tokenId,
                    coreContract: coreContract,
                    sender: msg.sender
                });
                require(
                    isArtist,
                    "PMP: artist auth required to configure artist string"
                );
            }
        } else {
            // non-string - ensure configured string is empty
            require(
                bytes(pmpInput.configuredValueString).length == 0,
                "PMP: non-string param must have empty string value"
            );
            // non-string - ensure configuring artist string is false, because it is not relevant for non-string params
            require(
                !pmpInput.configuringArtistString,
                "PMP: artist string cannot be configured for non-string params"
            );
        }
    }

    /**
     * @notice Gets the value of a PMP as a formatted string.
     * @dev Used internally to retrieve a PMP value in string format for external consumption.
     * @param pmpConfigStorage The config storage for the PMP.
     * @param pmp The PMP storage instance.
     * @return isConfigured Whether the PMP has been configured for the token.
     * @return value The string representation of the PMP value, or empty if not configured.
     */
    function _getPMPValue(
        PMPConfigStorage storage pmpConfigStorage,
        PMPStorage storage pmp
    ) internal view returns (bool isConfigured, string memory value) {
        ParamType configuredParamType = pmp.configuredParamType;
        // unconfigured param for token
        if (
            configuredParamType == ParamType.Unconfigured || // unconfigured for token
            configuredParamType != pmpConfigStorage.paramType // stale - token configured param type is different from project config
        ) {
            return (false, "");
        }
        // if string, return value
        if (pmpConfigStorage.paramType == ParamType.String) {
            // return artist configured value if present
            if (bytes(pmp.artistConfiguredValueString).length > 0) {
                return (true, pmp.artistConfiguredValueString);
            }
            // return non-artist configured value if present
            if (bytes(pmp.nonArtistConfiguredValueString).length > 0) {
                return (true, pmp.nonArtistConfiguredValueString);
            }
            // empty string is considered not configured
            return (false, "");
        }
        if (configuredParamType == ParamType.Select) {
            // return unconfigured if index is out of bounds (obviously stale)
            if (
                uint256(pmp.configuredValue) >=
                pmpConfigStorage.selectOptionsLength
            ) {
                return (false, "");
            }
            return (
                true,
                pmpConfigStorage.selectOptions.get(uint256(pmp.configuredValue))
            );
        }
        if (configuredParamType == ParamType.Bool) {
            return (true, pmp.configuredValue == bytes32(0) ? "false" : "true");
        }
        if (
            configuredParamType == ParamType.Uint256Range ||
            configuredParamType == ParamType.HexColor ||
            configuredParamType == ParamType.Timestamp ||
            configuredParamType == ParamType.DecimalRange
        ) {
            // verify configured value is within bounds (obviously stale if not)
            uint256 configuredValue = uint256(pmp.configuredValue);
            uint256 maxRange = configuredParamType == ParamType.HexColor
                ? _HEX_COLOR_MAX
                : uint256(pmpConfigStorage.maxRange);
            uint256 minRange = configuredParamType == ParamType.HexColor
                ? 0
                : uint256(pmpConfigStorage.minRange);
            if (
                configuredValue < uint256(minRange) ||
                configuredValue > uint256(maxRange)
            ) {
                return (false, "");
            }
            // handle decimal case
            if (configuredParamType == ParamType.DecimalRange) {
                return (true, _uintToDecimalString(configuredValue));
            }
            // handle hex color case
            if (configuredParamType == ParamType.HexColor) {
                return (true, _uintToHexColorString(configuredValue));
            }
            // handle other cases - uint256 and timestamp
            return (true, configuredValue.toString());
        }
        if (configuredParamType == ParamType.Int256Range) {
            // verify configured value is within bounds (obviously stale if not)
            int256 configuredValue = int256(uint256(pmp.configuredValue));
            if (
                configuredValue < int256(uint256(pmpConfigStorage.minRange)) ||
                configuredValue > int256(uint256(pmpConfigStorage.maxRange))
            ) {
                return (false, "");
            }
            return (true, configuredValue.toStringSigned());
        }
        // @dev should never reach
        // @dev no coverage, unreachable
        revert("PMP: Unhandled ParamType");
    }

    /**
     * @notice Enforces that the caller is the artist of the specified project.
     * @dev Reverts if the caller is not the artist.
     * @dev Assumes Art Blocks V3 Core Contract interface.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to check artist permissions for.
     * @param sender The address to check if it's the artist.
     */
    function _onlyArtist(
        address coreContract,
        uint256 projectId,
        address sender
    ) internal view {
        require(
            IGenArt721CoreContractV3_Base(coreContract)
                .projectIdToArtistAddress(projectId) == sender,
            "PMP: only artist"
        );
    }

    /**
     * @notice Checks if an address is the artist of the project associated with a token.
     * @dev Assumes Art Blocks V3 Core Contract interface.
     * @param tokenId The token ID to get the project ID from.
     * @param coreContract The address of the core contract.
     * @param sender The address to check if it's the artist.
     * @return isArtist true if the sender is the artist, false otherwise.
     * @return artistAddress the address of the artist.
     */
    function _isArtist(
        uint256 tokenId,
        address coreContract,
        address sender
    ) internal view returns (bool isArtist, address artistAddress) {
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        artistAddress = IGenArt721CoreContractV3_Base(coreContract)
            .projectIdToArtistAddress(projectId);
        isArtist = artistAddress == sender;
    }

    /**
     * @notice Checks if an address is the owner of a token.
     * Supports ERC-721 Token-level wallet delegation for the TokenOwner role via delegate.xyz v2,
     * using the delegate.xyz v2 "postmintparameters" subdelegation rights.
     * @dev Assumes Art Blocks V3 Core Contract interface.
     * @param tokenId The token ID to check ownership for.
     * @param coreContract The address of the core contract.
     * @param sender The address to check if it's the token owner.
     * @return isTokenOwnerOrDelegate_ true if the sender is the token owner or delegate of the token owner, false otherwise.
     * @return tokenOwner the address of the token owner.
     * @dev Always execute within a nonReentrant context.
     */
    function _isTokenOwnerOrDelegate(
        uint256 tokenId,
        address coreContract,
        address sender
    ) internal view returns (bool isTokenOwnerOrDelegate_, address tokenOwner) {
        // @dev leading interaction - only execute within a nonReentrant context
        tokenOwner = IERC721(coreContract).ownerOf(tokenId);
        isTokenOwnerOrDelegate_ =
            (tokenOwner == sender) ||
            delegateRegistry.checkDelegateForERC721({
                to: sender, // hot wallet
                from: tokenOwner, // vault
                contract_: coreContract, // ERC-721 contract
                tokenId: tokenId, // tokenId
                rights: bytes32(DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS) // opt-in granular control of rights
            });
    }

    /**
     * @notice Computes the keccak256 hash of a string.
     * @dev Used to create mapping keys from string values.
     * @param str The string to hash.
     * @return The bytes32 hash of the input string.
     */
    function _getStringHash(string memory str) internal pure returns (bytes32) {
        return keccak256(abi.encode(str));
    }

    /**
     * @notice Converts a uint256 to a decimal string representation.
     * @dev Converts integer and fractional parts separately and combines them.
     * @param number The uint256 value to convert to decimal string.
     * @return A string representation of the decimal number.
     */
    function _uintToDecimalString(
        uint256 number
    ) private pure returns (string memory) {
        uint256 integerPart = number / _DECIMAL_PRECISION; // Integer part
        uint256 fractionalPart = number % _DECIMAL_PRECISION; // Fractional part

        // Convert integer and fractional parts to strings
        string memory intStr = integerPart.toString();
        string memory fracStr = fractionalPart.toString();

        // Pad fractional part with zeros if necessary
        while (bytes(fracStr).length < _DECIMAL_PRECISION_DIGITS) {
            fracStr = string(abi.encodePacked("0", fracStr));
        }

        // Combine integer and fractional parts with a decimal point
        return string(abi.encodePacked(intStr, ".", fracStr));
    }

    /**
     * @notice Converts a uint256 to a hex color string.
     * @dev forked from OpenZeppelin's Strings library to use # prefix
     * @dev Assumes the value is a valid hex color.
     * @param value The uint256 value to convert to hex color string.
     * @return A string representation of the hex color.
     */
    function _uintToHexColorString(
        uint256 value
    ) private pure returns (string memory) {
        uint256 localValue = value;
        bytes memory buffer = new bytes(2 * 3 + 1);
        buffer[0] = "#";
        for (uint256 i = 2 * 3; i > 0; --i) {
            buffer[i] = _HEX_DIGITS[localValue & 0xf];
            localValue >>= 4;
        }
        if (localValue != 0) {
            // @dev no coverage, this is redundant due to use of max hex color value
            revert("PMP: invalid hex color");
        }
        return string(buffer);
    }
}
