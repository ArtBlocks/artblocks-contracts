// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ISharedMinterRequired} from "./ISharedMinterRequired.sol";

/**
 * @title ISharedMinterV0
 * @notice This interface extends the minimum required interface for a shared
 * minter contract to add additional functionality that is generally available
 * for all shared minter contracts on the shared minter filter.
 * @dev Custom, one-off minter contracts that are not globally approved may
 * choose to not implement this interface, but should still implement the
 * ISharedMinterRequired interface.
 */
interface ISharedMinterV0 is ISharedMinterRequired {
    // Sets the local max invocations for a given project, checking that the provided max invocations is
    // less than or equal to the global max invocations for the project set on the core contract.
    // This does not impact the max invocations value defined on the core contract.
    function manuallyLimitProjectMaxInvocations(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocations
    ) external;

    // Called to make the minter contract aware of the max invocations for a
    // given project.
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) external;

    // Gets if token price is configured, token price in wei, currency symbol,
    // and currency address, assuming this is project's minter.
    // Supersedes any defined core price.
    function getPriceInfo(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        );
}
