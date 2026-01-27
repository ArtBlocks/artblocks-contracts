// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/IPMPV0.sol";
import "../interfaces/v0.8.x/IWeb3Call.sol";

/**
 * @title Mock PMP (Project Metadata Parameters) Contract for E2E Testing
 * @author Art Blocks Inc.
 * @notice This is a minimal mock implementation of IPMPV0 and IWeb3Call
 * for e2e integration testing on testnets.
 * @dev This contract returns representative token params for token 0,
 * and empty params for all other tokens. Write functions are no-ops.
 */
contract MockPMP is IPMPV0 {
    // =========================================================================
    // Constants
    // =========================================================================

    // Token 0 is the only token with configured PMP params
    uint256 constant CONFIGURED_TOKEN_ID = 0;

    // =========================================================================
    // IWeb3Call Implementation (READ)
    // =========================================================================

    /**
     * @notice Get the token parameters for a given token.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @return tokenParams An array of token parameters for the queried token.
     * @dev Returns representative params for token 0, empty array for others.
     */
    function getTokenParams(
        address coreContract,
        uint256 tokenId
    )
        external
        pure
        override
        returns (IWeb3Call.TokenParam[] memory tokenParams)
    {
        // Silence unused variable warning
        coreContract;

        // Only token 0 has configured PMP params
        if (tokenId != CONFIGURED_TOKEN_ID) {
            // Return empty array for unconfigured tokens
            return new IWeb3Call.TokenParam[](0);
        }

        // Return representative token params for token 0
        // These simulate a typical PMP configuration with various param types
        tokenParams = new IWeb3Call.TokenParam[](5);

        // Color parameter (hex color)
        tokenParams[0] = IWeb3Call.TokenParam({key: "color", value: "#FF5733"});

        // Size parameter (uint256 range)
        tokenParams[1] = IWeb3Call.TokenParam({key: "size", value: "42"});

        // Enabled parameter (boolean)
        tokenParams[2] = IWeb3Call.TokenParam({key: "enabled", value: "true"});

        // Mode parameter (select option)
        tokenParams[3] = IWeb3Call.TokenParam({key: "mode", value: "turbo"});

        // Label parameter (string)
        tokenParams[4] = IWeb3Call.TokenParam({
            key: "label",
            value: "Mock Token Label"
        });

        return tokenParams;
    }

    // =========================================================================
    // IPMPV0 Implementation (WRITE - No-ops for mock)
    // =========================================================================

    /**
     * @notice Configure the parameters for a specific token.
     * @param coreContract The address of the core contract.
     * @param tokenId The token ID to configure parameters for.
     * @param pmpInputs Array of parameter inputs to configure.
     * @dev No-op for mock - returns without throwing.
     */
    function configureTokenParams(
        address coreContract,
        uint256 tokenId,
        PMPInput[] calldata pmpInputs
    ) external pure override {
        // Silence unused variable warnings
        coreContract;
        tokenId;
        pmpInputs;
        // No-op: Mock doesn't store anything, just returns successfully
    }

    /**
     * @notice Configure the available parameters for a project.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure parameters for.
     * @param pmpInputConfigs Array of parameter configurations defining the available parameters.
     * @dev No-op for mock - returns without throwing.
     */
    function configureProject(
        address coreContract,
        uint256 projectId,
        PMPInputConfig[] calldata pmpInputConfigs
    ) external pure override {
        // Silence unused variable warnings
        coreContract;
        projectId;
        pmpInputConfigs;
        // No-op: Mock doesn't store anything, just returns successfully
    }

    /**
     * @notice Configure the hooks for a project.
     * @param coreContract The address of the core contract.
     * @param projectId The project ID to configure hooks for.
     * @param tokenPMPPostConfigHook The hook to call after a token's PMP is configured.
     * @param tokenPMPReadAugmentationHook The hook to call when reading a token's PMPs.
     * @dev No-op for mock - returns without throwing.
     */
    function configureProjectHooks(
        address coreContract,
        uint256 projectId,
        IPMPConfigureHook tokenPMPPostConfigHook,
        IPMPAugmentHook tokenPMPReadAugmentationHook
    ) external pure override {
        // Silence unused variable warnings
        coreContract;
        projectId;
        tokenPMPPostConfigHook;
        tokenPMPReadAugmentationHook;
        // No-op: Mock doesn't store anything, just returns successfully
    }

    /**
     * @notice Checks if the given wallet has the owner role for the given token.
     * @param wallet The wallet address to check.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to check.
     * @return isTokenOwnerOrDelegate_ Always returns true for mock.
     */
    function isTokenOwnerOrDelegate(
        address wallet,
        address coreContract,
        uint256 tokenId
    ) external pure override returns (bool isTokenOwnerOrDelegate_) {
        // Silence unused variable warnings
        wallet;
        coreContract;
        tokenId;
        // Mock always returns true for simplicity
        return true;
    }

    // =========================================================================
    // Project Config View Functions
    // =========================================================================

    /**
     * @notice Get the project config for a given project.
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @return pmpKeys The configured pmpKeys for the project.
     * @return configNonce The config nonce for the project.
     * @return tokenPMPPostConfigHook The tokenPMPPostConfigHook for the project.
     * @return tokenPMPReadAugmentationHook The tokenPMPReadAugmentationHook for the project.
     * @dev Returns representative mock config for project 0, empty for others.
     */
    function getProjectConfig(
        address coreContract,
        uint256 projectId
    )
        external
        pure
        returns (
            string[] memory pmpKeys,
            uint8 configNonce,
            IPMPConfigureHook tokenPMPPostConfigHook,
            IPMPAugmentHook tokenPMPReadAugmentationHook
        )
    {
        // Silence unused variable warning
        coreContract;

        // Only project 0 has configured PMP
        if (projectId != 0) {
            return (
                new string[](0),
                0,
                IPMPConfigureHook(address(0)),
                IPMPAugmentHook(address(0))
            );
        }

        // Return representative project config matching the token params
        pmpKeys = new string[](5);
        pmpKeys[0] = "color";
        pmpKeys[1] = "size";
        pmpKeys[2] = "enabled";
        pmpKeys[3] = "mode";
        pmpKeys[4] = "label";

        configNonce = 1;
        tokenPMPPostConfigHook = IPMPConfigureHook(address(0));
        tokenPMPReadAugmentationHook = IPMPAugmentHook(address(0));
    }

    /**
     * @notice Get the PMP config for a given project and pmpKey.
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @param pmpKey The pmpKey of the pmp to get data for.
     * @return pmpConfigView The PMP config for the given project and pmpKey.
     * @dev Returns representative config matching the mocked token params.
     */
    function getProjectPMPConfig(
        address coreContract,
        uint256 projectId,
        string memory pmpKey
    ) external pure returns (PMPConfigView memory pmpConfigView) {
        // Silence unused variable warnings
        coreContract;
        projectId;

        // Hash the key to determine which config to return
        bytes32 keyHash = keccak256(abi.encodePacked(pmpKey));

        // Initialize with defaults
        pmpConfigView.highestConfigNonce = 1;
        pmpConfigView.authOption = AuthOption.TokenOwner;
        pmpConfigView.pmpLockedAfterTimestamp = 0; // Not locked
        pmpConfigView.authAddress = address(0);
        pmpConfigView.selectOptionsLength = 0;
        pmpConfigView.selectOptions = new string[](0);
        pmpConfigView.minRange = bytes32(0);
        pmpConfigView.maxRange = bytes32(0);

        // "color" - HexColor type
        if (keyHash == keccak256(abi.encodePacked("color"))) {
            pmpConfigView.paramType = ParamType.HexColor;
            return pmpConfigView;
        }

        // "size" - Uint256Range type with min 0, max 100
        if (keyHash == keccak256(abi.encodePacked("size"))) {
            pmpConfigView.paramType = ParamType.Uint256Range;
            pmpConfigView.minRange = bytes32(uint256(0));
            pmpConfigView.maxRange = bytes32(uint256(100));
            return pmpConfigView;
        }

        // "enabled" - Bool type
        if (keyHash == keccak256(abi.encodePacked("enabled"))) {
            pmpConfigView.paramType = ParamType.Bool;
            return pmpConfigView;
        }

        // "mode" - Select type with options
        if (keyHash == keccak256(abi.encodePacked("mode"))) {
            pmpConfigView.paramType = ParamType.Select;
            pmpConfigView.selectOptionsLength = 3;
            pmpConfigView.selectOptions = new string[](3);
            pmpConfigView.selectOptions[0] = "normal";
            pmpConfigView.selectOptions[1] = "turbo";
            pmpConfigView.selectOptions[2] = "eco";
            return pmpConfigView;
        }

        // "label" - String type
        if (keyHash == keccak256(abi.encodePacked("label"))) {
            pmpConfigView.paramType = ParamType.String;
            return pmpConfigView;
        }

        // Unknown key - return unconfigured
        pmpConfigView.paramType = ParamType.Unconfigured;
        pmpConfigView.highestConfigNonce = 0;
    }
}
