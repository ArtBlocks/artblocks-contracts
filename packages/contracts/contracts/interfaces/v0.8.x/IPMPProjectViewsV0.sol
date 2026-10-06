// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPV0} from "./IPMPV0.sol";
import {IPMPConfigureHook} from "./IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";

/**
 * @title PMP project introspection views
 * @author Art Blocks Inc.
 * @notice Interface for the project-level introspection views implemented by
 * the PMP contracts. These views are intentionally not part of `IPMPV0`, which
 * describes the configuration and read surface of the PMP protocol itself.
 * They are declared separately here so that consumers which need to validate a
 * project's PMP configuration on-chain may do so without requiring PMP
 * implementers to adopt them.
 * @dev Implemented by PMPV0 and PMPV1.
 */
interface IPMPProjectViewsV0 {
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
        );

    /**
     * @notice Get the PMP config from storage for a given project and pmpKey.
     * @dev Returns the storage values, even if unconfigured or not part of the
     * active project config. Check highestConfigNonce against the project's
     * configNonce to verify if the pmpKey is part of the active project config.
     * @param coreContract The address of the core contract to call.
     * @param projectId The projectId of the project to get data for.
     * @param pmpKey The pmpKey of the pmp to get data for.
     * @return pmpConfigView The PMP config for the given project and pmpKey.
     */
    function getProjectPMPConfig(
        address coreContract,
        uint256 projectId,
        string memory pmpKey
    ) external view returns (IPMPV0.PMPConfigView memory pmpConfigView);
}
