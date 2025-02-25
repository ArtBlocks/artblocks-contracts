// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPConfigureHook} from "./IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";
import {IWeb3Call} from "./IWeb3Call.sol";

interface IPMPV0 {
    event ProjectHooksConfigured(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    );

    event ProjectConfigured(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] pmpInputConfigs
    );

    event TokenParamsConfigured(
        address coreContract,
        uint256 tokenId,
        PMPInput[] pmpInputs
    );

    // @dev note: enum ordering relied on in _validatePMPConfig (relies on ArtistAndTokenOwnerAndAddress being last)
    enum AuthOption {
        Artist,
        TokenOwner,
        Address,
        ArtistAndTokenOwner,
        ArtistAndAddress,
        TokenOwnerAndAddress,
        ArtistAndTokenOwnerAndAddress
    }

    // @dev note: enum ordering relied on in _validatePMPConfig (relies on String being last)
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

    struct PMPInputConfig {
        string key; // slot 0: 32 bytes
        PMPConfig pmpConfig; // slot 1: 32 bytes
    }

    // @dev struct for function input when configuring a project's PMP
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

    // @dev struct for function input when configuring a token's PMP
    struct PMPInput {
        string key; // slot 0: 32 bytes
        ParamType configuredParamType;
        // @dev store values as bytes32 for efficiency, cast appropriately when reading
        bytes32 configuredValue;
        bool configuringArtistString;
        string configuredValueString;
    }

    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    ) external;

    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external;

    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external;
}
