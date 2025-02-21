// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {IWeb3Call} from "../interfaces/v0.8.x/IWeb3Call.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

import {ImmutableStringArray} from "../libs/v0.8.x/ImmutableStringArray.sol";

/**
 * @title PMPV0
 * @author Art Blocks Inc.
 * @notice TBD
 */
contract PMPV0 is
    IWeb3Call,
    ERC165 // TODO: add IPMPV0 interface
{
    using Strings for string;
    using Strings for uint256;
    using Strings for int256;
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    bytes32 private constant _TYPE = "PMPV0";

    uint256 private constant _DECIMAL_PRECISION_DIGITS = 10;
    uint256 private constant _DECIMAL_PRECISION =
        10 ** _DECIMAL_PRECISION_DIGITS;

    uint256 private constant _HEX_COLOR_MIN = 0x000000;
    uint256 private constant _HEX_COLOR_MAX = 0xFFFFFF;

    uint256 private constant _TIMESTAMP_MIN = 0; // @dev unix timestamp, 0 = 1970-01-01
    uint256 private constant _TIMESTAMP_MAX = type(uint64).max; // max guardrail, ~10 billion years

    enum AuthOption {
        Artist,
        TokenOwner,
        Address,
        ArtistAndTokenOwner,
        ArtistAndAddress,
        TokenOwnerAndAddress,
        ArtistAndTokenOwnerAndAddress
    }

    enum ParamType {
        Unconfigured, // @dev default value, used to check if PMP is configured
        Select,
        Bool,
        Uint256Range,
        Int256Range,
        DecimalRange,
        HexColor,
        Timestamp,
        String // utilizes string in PMP struct, all other param types utilize the generic bytes32 param
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
        address tokenPMPPostConfigHook; // slot 2: 20 bytes
        // token pmp read augmentation hook to be called when reading a token's PMPs
        address tokenPMPReadAugmentationHook; // slot 3: 20 bytes
    }

    struct PMPInputConfig {
        string key; // slot 0: 32 bytes
        PMPConfig pmpConfig; // slot 1: 32 bytes
    }

    // @dev struct for function input when configuring a project's PMP
    struct PMPConfig {
        AuthOption authOption; // slot 0: 1 byte
        ParamType paramType; // slot 0: 1 byte
        address authAddress; // slot 0: 20 bytes
        string[] selectOptions; // slot 1: 32 bytes
        // @dev use bytes32 for all range types for SSTORE efficiency
        // @dev minRange and maxRange cast to defined numeric type when verifying assigned PMP values
        bytes32 minRange; // slot 2: 32 bytes
        bytes32 maxRange; // slot 3: 32 bytes
    }

    // @dev storage struct for PMPConfig (same as PMPConfig, but includes highestConfigNonce)
    struct PMPConfigStorage {
        // @dev highest config nonce for which this PMPConfig is valid (relative to projectConfig.configNonce)
        uint8 highestConfigNonce; // slot 0: 1 byte
        AuthOption authOption; // slot 0: 1 byte
        ParamType paramType; // slot 0: 1 byte
        address authAddress; // slot 0: 20 bytes
        string[] selectOptions; // slot 1: 32 bytes
        bytes32 minRange; // slot 2: 32 bytes
        bytes32 maxRange; // slot 3: 32 bytes
    }

    struct PMPInput {
        string key; // slot 0: 32 bytes
        PMP pmp; // slot 1: 32 bytes
    }

    // @dev key is implicit based on mapping pointing to PMP struct
    struct PMP {
        ParamType configuredParamType; // slot 0: 1 byte
        // @dev store values as bytes32 for efficiency, cast appropriately when reading
        bytes32 configuredValue; // slot 1: 32 bytes
        string artistConfiguredValueString; // slot 4: 32 bytes
        string nonArtistConfiguredValueString; // slot 5: 32 bytes
    }

    // mapping of ProjectConfig structs for each project
    mapping(address coreContract => mapping(uint256 projectId => ProjectConfig projectConfig)) projectConfigs;

    // mapping of PMP structs for each token
    mapping(address coreContract => mapping(uint256 tokenId => mapping(bytes32 pmpKeyHash => PMP pmp))) tokenPMPs;

    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        address tokenPMPPostConfigHook,
        address tokenPMPReadAugmentationHook
    ) external {
        // TODO: only registered artblocks projects?
        // TODO: only artists can configure projects
        // TODO - validation - check for interface implementation?
        // update projectConfig
        ProjectConfig storage projectConfig = projectConfigs[coreContract][
            projectId
        ];
        projectConfig.tokenPMPPostConfigHook = tokenPMPPostConfigHook;
        projectConfig
            .tokenPMPReadAugmentationHook = tokenPMPReadAugmentationHook;
        // TODO: emit event
    }

    /**
     * @notice TBD
     */
    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external {
        // TODO: only registered artblocks projects?
        // TODO: only artists can configure projects
        // validate pmpInputConfigs
        uint256 pmpInputConfigsLength = pmpInputConfigs.length;
        // TODO - handle empty pmpInputConfigs
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
            // update highestConfigNonce
            pmpConfigStorage.highestConfigNonce = newConfigNonce;
            // copy function input pmpConfig data to pmpConfigStorage
            PMPConfig memory inputPMPConfig = pmpInputConfigs[i].pmpConfig;
            pmpConfigStorage.authOption = inputPMPConfig.authOption;
            pmpConfigStorage.paramType = inputPMPConfig.paramType;
            pmpConfigStorage.authAddress = inputPMPConfig.authAddress;
            pmpConfigStorage.selectOptions = inputPMPConfig.selectOptions;
            pmpConfigStorage.minRange = inputPMPConfig.minRange;
            pmpConfigStorage.maxRange = inputPMPConfig.maxRange;
        }
        // TODO: emit event (recommend emitting entire input calldata for indexing without web3 calls)
    }

    // TODO add configureTokenParams function
    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external {
        // TODO: implement
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
        // TODO: only registered artblocks projects?
        // TODO use util library for conversion
        uint256 projectId = tokenId / 1_000_000;
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

        // TODO: call augmentation hook

        // TODO: return tokenParams
    }

    function _getPMPValue(
        PMPConfigStorage storage pmpConfigStorage,
        PMP storage pmp
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
            // TODO: implement (if we want to support this)
            return (true, "TODO");
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

    function _getDecimalString(
        uint256 value
    ) internal pure returns (string memory) {
        // TODO: implement
        return value.toString(); // bug - must insert appropriate decimal point
    }

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

    function _validatePMPConfig(PMPConfig calldata pmpConfig) internal pure {
        // require type is not unconfigured
        require(
            pmpConfig.paramType != ParamType.Unconfigured,
            "PMP: paramType is unconfigured"
        );
        // validate enums are within bounds
        require(
            pmpConfig.authOption <= AuthOption.ArtistAndTokenOwnerAndAddress,
            "PMP: Invalid authOption"
        );
        require(
            pmpConfig.paramType <= ParamType.String,
            "PMP: Invalid paramType"
        );
        // validate appropriate fields are empty
        if (
            pmpConfig.paramType == ParamType.Bool ||
            pmpConfig.paramType == ParamType.String ||
            pmpConfig.paramType == ParamType.HexColor
        ) {
            // @dev should have all fields empty
            require(
                pmpConfig.selectOptions.length == 0,
                "PMP: selectOptions is not empty"
            );
            // @dev min/max range for hex color checked during assignment, should be empty in config
            require(pmpConfig.minRange == 0, "PMP: minRange is not empty");
            require(pmpConfig.maxRange == 0, "PMP: maxRange is not empty");
        } else if (pmpConfig.paramType == ParamType.Select) {
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
            pmpConfig.paramType == ParamType.Uint256Range ||
            pmpConfig.paramType == ParamType.Int256Range ||
            pmpConfig.paramType == ParamType.DecimalRange ||
            pmpConfig.paramType == ParamType.Timestamp
        ) {
            // @dev range should have empty selectOptions
            require(
                pmpConfig.selectOptions.length == 0,
                "PMP: selectOptions is not empty"
            );
            // require minRange is less than maxRange
            if (pmpConfig.paramType == ParamType.Int256Range) {
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
                if (pmpConfig.paramType == ParamType.Timestamp) {
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

    function _getStringHash(string memory str) internal pure returns (bytes32) {
        return keccak256(abi.encode(str));
    }

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
