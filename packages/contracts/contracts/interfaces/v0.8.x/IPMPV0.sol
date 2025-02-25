// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPConfigureHook} from "./IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";
import {IWeb3Call} from "./IWeb3Call.sol";

/**
 * @title Project Metadata Parameters (PMP) Interface, V0
 * @author Art Blocks Inc.
 * @notice Interface for the Project Metadata Parameters (PMP) contract that defines
 * how projects can expose configurable parameters for tokens. This interface establishes
 * the standard for parameter configuration, validation, and retrieval.
 * @dev This interface extends the IWeb3Call interface to provide compatibility with
 * existing Web3 infrastructure.
 */
interface IPMPV0 is IWeb3Call {
    /**
     * @notice Emitted when project hooks are configured.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID for which hooks were configured.
     * @param tokenPMPPostConfigHook The hook to call after a token's PMP is configured.
     * @param tokenPMPReadAugmentationHook The hook to call when reading a token's PMPs.
     */
    event ProjectHooksConfigured(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    );

    /**
     * @notice Emitted when a project's available parameters are configured.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID for which parameters were configured.
     * @param pmpInputConfigs Array of parameter configurations defining the available parameters.
     */
    event ProjectConfigured(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] pmpInputConfigs
    );

    /**
     * @notice Emitted when a token's parameters are configured.
     * @param coreContract The address of the core contract.
     * @param tokenId The token ID for which parameters were configured.
     * @param pmpInputs Array of parameter inputs that were configured.
     */
    event TokenParamsConfigured(
        address coreContract,
        uint256 tokenId,
        PMPInput[] pmpInputs
    );

    /**
     * @notice Defines who can configure a parameter for a token.
     * @dev Enum ordering is relied on (ArtistAndTokenOwnerAndAddress being last).
     */
    enum AuthOption {
        Artist,
        TokenOwner,
        Address,
        ArtistAndTokenOwner,
        ArtistAndAddress,
        TokenOwnerAndAddress,
        ArtistAndTokenOwnerAndAddress
    }

    /**
     * @notice Defines the type of parameter that can be configured.
     * @dev Enum ordering is relied on (String being last).
     */
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

    /**
     * @notice Structure for a parameter configuration input.
     * @dev Used when configuring a project's available parameters.
     */
    struct PMPInputConfig {
        string key; // slot 0: 32 bytes
        PMPConfig pmpConfig; // slot 1: 32 bytes
    }

    /**
     * @notice Structure for a parameter configuration.
     * @dev Defines the constraints and options for a parameter.
     */
    struct PMPConfig {
        AuthOption authOption; // slot 0: 1 byte
        ParamType paramType; // slot 0: 1 byte
        uint48 pmpLockedAfterTimestamp; // slot 0: 6 bytes
        address authAddress; // slot 0: 20 bytes
        string[] selectOptions; // slot 1: 32 bytes
        // @dev use bytes32 for all range types for SSTORE efficiency
        // @dev minRange and maxRange cast to defined numeric type when verifying assigned PMP values
        bytes32 minRange; // slot 2: 32 bytes
        bytes32 maxRange; // slot 3: 32 bytes
    }

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
        string[] selectOptions; // slot 1: 32 bytes
        bytes32 minRange; // slot 2: 32 bytes
        bytes32 maxRange; // slot 3: 32 bytes
    }

    /**
     * @notice Structure for a parameter input.
     * @dev Used when configuring a token's parameters.
     */
    struct PMPInput {
        string key; // slot 0: 32 bytes
        ParamType configuredParamType;
        // @dev store values as bytes32 for efficiency, cast appropriately when reading
        bytes32 configuredValue;
        bool configuringArtistString;
        string configuredValueString;
    }

    /**
     * @notice Storage structure for a configured parameter.
     * @dev Includes both artist and non-artist configured string values.
     */
    struct PMPStorage {
        ParamType configuredParamType; // slot 0: 1 byte
        // @dev store values as bytes32 for efficiency, cast appropriately when reading
        bytes32 configuredValue; // slot 1: 32 bytes
        string artistConfiguredValueString; // slot 2: 32 bytes
        string nonArtistConfiguredValueString; // slot 3: 32 bytes
    }

    /**
     * @notice Configure the hooks for a project.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure hooks for.
     * @param tokenPMPPostConfigHook The hook to call after a token's PMP is configured.
     * @param tokenPMPReadAugmentationHook The hook to call when reading a token's PMPs.
     */
    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    ) external;

    /**
     * @notice Configure the available parameters for a project.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure parameters for.
     * @param pmpInputConfigs Array of parameter configurations defining the available parameters.
     */
    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external;

    /**
     * @notice Configure the parameters for a specific token.
     * @param coreContract The address of the core contract.
     * @param tokenId The token ID to configure parameters for.
     * @param pmpInputs Array of parameter inputs to configure.
     */
    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external;
}
