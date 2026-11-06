// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface defines events for shared minters that require
 * specific post-mint params (PMPs) to be configured during mint.
 * @author Art Blocks Inc.
 */
interface ISharedMinterRequiredPMPV0 {
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
}
