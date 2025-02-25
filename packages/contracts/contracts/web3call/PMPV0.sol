// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {IWeb3Call} from "../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";
import {IPMPConfigureHook} from "../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "../interfaces/v0.8.x/IPMPAugmentHook.sol";
import {IGenArt721CoreContractV3_Base} from "../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {ERC165Checker} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165Checker.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin-5.0/contracts/utils/ReentrancyGuard.sol";

import {ImmutableStringArray} from "../libs/v0.8.x/ImmutableStringArray.sol";
import {ABHelpers} from "../libs/v0.8.x/ABHelpers.sol";

/**
 * @title Project Metadata Parameters (PMP) contract, V0
 * @author Art Blocks Inc.
 * @notice This contract enables Artists to define and configure project parameters that token
 * owners can set within constraints. This provides a standardized way for projects to expose
 * configurable parameters that can be used by renderers and other contracts.
 * @dev This contract implements the IWeb3Call and IPMPV0 interfaces, providing functionality
 * for parameter configuration and retrieval. It includes support for various parameter types,
 * authorization options, and hooks for extending functionality.
 */
contract PMPV0 is IWeb3Call, IPMPV0, ReentrancyGuard, ERC165 {
    using Strings for string;
    using Strings for uint256;
    using Strings for int256;
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    bytes32 private constant _TYPE = "PMPV0";

    uint256 private constant _DECIMAL_PRECISION_DIGITS = 10;
    uint256 private constant _DECIMAL_PRECISION =
        10 ** _DECIMAL_PRECISION_DIGITS;

    // @dev min hex color assumed to be 0x000000
    uint256 private constant _HEX_COLOR_MAX = 0xFFFFFF;

    uint256 private constant _TIMESTAMP_MIN = 0; // @dev unix timestamp, 0 = 1970-01-01
    uint256 private constant _TIMESTAMP_MAX = type(uint64).max; // max guardrail, ~10 billion years

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
     * @notice Configure project hooks for post-configuration and read augmentation.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure hooks for.
     * @param tokenPMPPostConfigHook The hook to call after a token's PMP is configured.
     * @param tokenPMPReadAugmentationHook The hook to call when reading a token's PMPs.
     * @dev Only the project artist can configure project hooks.
     * @dev Both hooks are validated for ERC165 interface compatibility.
     */
    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    ) external {
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
     */
    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external {
        // only artists may configure projects
        _onlyArtist({
            coreContract: coreContract,
            projectId: projectId,
            sender: msg.sender
        });
        // validate pmpInputConfigs
        uint256 pmpInputConfigsLength = pmpInputConfigs.length;
        require(pmpInputConfigsLength <= 256, "PMP: Only <= 256 configs");
        for (uint256 i = 0; i < pmpInputConfigsLength; i++) {
            _validatePMPConfig(pmpInputConfigs[i].pmpConfig);
        }
        // store pmpInputConfigs data in ProjectConfig struct
        // @dev load projectConfig storage pointer
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        // increment config nonce
        // @dev reverts on overflow (greater than 255 edits not supported)
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
                // validate current pmp is not locked
                uint256 currentPPMLockedAfterTimestamp = pmpConfigStorage
                    .pmpLockedAfterTimestamp;
                require(
                    currentPPMLockedAfterTimestamp == 0 ||
                        currentPPMLockedAfterTimestamp > block.timestamp,
                    "PMP: pmp is locked and cannot be updated"
                );
            }
            require(
                pmpInputConfigs[i].pmpConfig.pmpLockedAfterTimestamp == 0 ||
                    pmpInputConfigs[i].pmpConfig.pmpLockedAfterTimestamp >
                    block.timestamp,
                "PMP: pmpLockedAfterTimestamp is in the past and not unlimited (zero)"
            );
            // update highestConfigNonce
            pmpConfigStorage.highestConfigNonce = newConfigNonce;
            // copy function input pmpConfig data to pmpConfigStorage
            PMPConfig memory inputPMPConfig = pmpInputConfigs[i].pmpConfig;
            pmpConfigStorage.authOption = inputPMPConfig.authOption;
            pmpConfigStorage.paramType = inputPMPConfig.paramType;
            pmpConfigStorage.pmpLockedAfterTimestamp = inputPMPConfig
                .pmpLockedAfterTimestamp;
            pmpConfigStorage.authAddress = inputPMPConfig.authAddress;
            pmpConfigStorage.selectOptions = inputPMPConfig.selectOptions;
            pmpConfigStorage.minRange = inputPMPConfig.minRange;
            pmpConfigStorage.maxRange = inputPMPConfig.maxRange;
        }

        // emit event
        emit ProjectConfigured({
            coreContract: coreContract,
            projectId: projectId,
            pmpInputConfigs: pmpInputConfigs
        });
    }

    /**
     * @notice Configure the parameters for a specific token according to project constraints.
     * @param coreContract The address of the core contract.
     * @param tokenId The tokenId of the token to configure.
     * @param pmpInputs The parameter inputs to configure for the token.
     * @dev Validates each parameter input against the project's configuration.
     * @dev Stores the configured parameters for the token.
     * @dev Calls the post-configuration hook if one is configured for the project.
     * @dev Uses nonReentrant modifier to prevent reentrancy attacks during hook calls.
     */
    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external nonReentrant {
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
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
            // validate pmpInput
            _validatePMPInput({
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
            // @dev trusted interaction, but this function is nonreentrant for additional safety
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
            pmpInputs: pmpInputs
        });
    }

    /**
     * @notice Get the token parameters for a given token.
     * If none are configured, the tokenParams should be empty.
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
            // @dev trusted interaction in read-only context
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
        pmpKeys = projectConfig.pmpKeys.getAll();
        configNonce = projectConfig.configNonce;
        tokenPMPPostConfigHook = projectConfig.tokenPMPPostConfigHook;
        tokenPMPReadAugmentationHook = projectConfig
            .tokenPMPReadAugmentationHook;
    }

    /**
     * @notice Get the PMP config for a given project and pmpKey.
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @param pmpKey The pmpKey of the pmp to get data for.
     * @return pmpConfigStorage The PMP config for the given project and pmpKey.
     */
    function getProjectPMPConfig(
        address coreContract,
        uint256 projectId,
        string memory pmpKey
    ) external view returns (PMPConfigStorage memory pmpConfigStorage) {
        pmpConfigStorage = projectConfigs[coreContract][projectId]
            .pmpConfigsStorage[_getStringHash(pmpKey)];
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
            configuredParamType == pmpConfigStorage.paramType // stale - token configured param type is different from project config
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
                pmpConfigStorage.selectOptions.length
            ) {
                return (false, "");
            }
            return (
                true,
                pmpConfigStorage.selectOptions[uint256(pmp.configuredValue)]
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
            if (
                configuredValue < uint256(pmpConfigStorage.minRange) ||
                configuredValue > uint256(pmpConfigStorage.maxRange)
            ) {
                return (false, "");
            }
            // handle decimal case
            if (configuredParamType == ParamType.DecimalRange) {
                return (true, _uintToDecimalString(configuredValue));
            }
            // handle all other cases
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
            projectConfig.pmpKeys.store(inputKeys);
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
        require(
            authOption <= AuthOption.ArtistAndTokenOwnerAndAddress,
            "PMP: Invalid authOption"
        );
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
                pmpConfig.selectOptions.length <= 256,
                "PMP: selectOptions length > 256"
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
            // @dev range should have empty selectOptions
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
            // @dev should never reach
            revert("PMP: Invalid paramType");
        }
    }

    /**
     * @notice Validates a PMP input against the project's configuration.
     * @dev Checks authorization, parameter type consistency, and value constraints.
     * @dev Checks that pmp param is included in most recently configured PMP config for token's project.
     * @param tokenId The token ID for which the parameter is being configured.
     * @param coreContract The address of the core contract.
     * @param pmpInput The parameter input to validate.
     * @param pmpConfigStorage The project's configuration storage for this parameter.
     * @param projectConfigNonce The project's current configuration nonce.
     */
    function _validatePMPInput(
        uint256 tokenId,
        address coreContract,
        PMPInput memory pmpInput,
        PMPConfigStorage storage pmpConfigStorage,
        uint8 projectConfigNonce
    ) internal view {
        // check that the param is part of the project's most recently configured PMP params
        // @dev use config nonce to check if param is part of most recently configured PMP params
        require(
            pmpConfigStorage.highestConfigNonce == projectConfigNonce,
            "PMP: param not part of most recently configured PMP params"
        );
        // check that the param type matches
        require(
            pmpInput.configuredParamType == pmpConfigStorage.paramType,
            "PMP: paramType mismatch"
        );

        // ensure caller has appropriate auth
        {
            // @dev block scope to reduce stack depth
            AuthOption authOption = pmpConfigStorage.authOption;
            if (authOption == AuthOption.Artist) {
                require(
                    _isArtist({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }),
                    "PMP: artist auth required"
                );
            } else if (authOption == AuthOption.TokenOwner) {
                require(
                    _isTokenOwner({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }),
                    "PMP: token owner auth required"
                );
            } else if (authOption == AuthOption.ArtistAndTokenOwner) {
                require(
                    _isTokenOwner({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }) ||
                        _isArtist({
                            tokenId: tokenId,
                            coreContract: coreContract,
                            sender: msg.sender
                        }),
                    "PMP: artist and token owner auth required"
                );
            } else if (authOption == AuthOption.Address) {
                require(
                    msg.sender == pmpConfigStorage.authAddress,
                    "PMP: address auth required"
                );
            } else if (authOption == AuthOption.ArtistAndTokenOwnerAndAddress) {
                require(
                    _isTokenOwner({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }) ||
                        _isArtist({
                            tokenId: tokenId,
                            coreContract: coreContract,
                            sender: msg.sender
                        }) ||
                        msg.sender == pmpConfigStorage.authAddress,
                    "PMP: artist and token owner and address auth required"
                );
            } else if (authOption == AuthOption.ArtistAndAddress) {
                require(
                    _isArtist({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }) || msg.sender == pmpConfigStorage.authAddress,
                    "PMP: artist and address auth required"
                );
            } else if (authOption == AuthOption.TokenOwnerAndAddress) {
                require(
                    _isTokenOwner({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }) || msg.sender == pmpConfigStorage.authAddress,
                    "PMP: token owner and address auth required"
                );
            }
        }

        // ensure properly configured value
        ParamType paramType = pmpConfigStorage.paramType;
        // range checks for non-string params
        if (paramType != ParamType.String) {
            if (paramType == ParamType.Select) {
                require(
                    uint256(pmpInput.configuredValue) <
                        pmpConfigStorage.selectOptions.length,
                    "PMP: param value out of bounds"
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
                    pmpInput.configuredValue > pmpConfigStorage.minRange &&
                        pmpInput.configuredValue < pmpConfigStorage.maxRange,
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.Int256Range) {
                require(
                    int256(uint256(pmpInput.configuredValue)) > // @dev ensure this converts as expected
                        int256(uint256(pmpConfigStorage.minRange)) &&
                        int256(uint256(pmpInput.configuredValue)) <
                        int256(uint256(pmpConfigStorage.maxRange)),
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.Timestamp) {
                require(
                    uint256(pmpInput.configuredValue) < _TIMESTAMP_MAX &&
                        uint256(pmpInput.configuredValue) > _TIMESTAMP_MIN,
                    "PMP: param value out of bounds"
                );
            } else if (paramType == ParamType.HexColor) {
                require(
                    uint256(pmpInput.configuredValue) < _HEX_COLOR_MAX, // @dev minimum hex color of zero implicitly passed by using uint256
                    "PMP: invalid hex color"
                );
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
                require(
                    _isArtist({
                        tokenId: tokenId,
                        coreContract: coreContract,
                        sender: msg.sender
                    }),
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
     * @return Returns true if the sender is the artist, false otherwise.
     */
    function _isArtist(
        uint256 tokenId,
        address coreContract,
        address sender
    ) internal view returns (bool) {
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        return
            IGenArt721CoreContractV3_Base(coreContract)
                .projectIdToArtistAddress(projectId) == sender;
    }

    /**
     * @notice Checks if an address is the owner of a token.
     * @dev Assumes Art Blocks V3 Core Contract interface.
     * @param tokenId The token ID to check ownership for.
     * @param coreContract The address of the core contract.
     * @param sender The address to check if it's the token owner.
     * @return Returns true if the sender is the token owner, false otherwise.
     */
    function _isTokenOwner(
        uint256 tokenId,
        address coreContract,
        address sender
    ) internal view returns (bool) {
        return IERC721(coreContract).ownerOf(tokenId) == sender;
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
}
