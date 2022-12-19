// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterHolderV1.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterHolderV1 interface in order to
 * add support for manually setting project max invocations.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterHolderV2 is IFilteredMinterHolderV1 {
    /**
     * @notice Local max invocations for project `_projectId`, tied to core contract `_coreContractAddress`,
     * updated to `_maxInvocations`.
     */
    event ManuallySetProjectMaxInvocations(
        uint256 indexed _projectId,
        address indexed _coreContractAddress,
        uint256 _maxInvocations
    );

    // Sets the local max invocations for a given project, checking that the provided max invocations is
    // less than or equal to the global max invocations for the project set on the core contract.
    function manuallySetProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) external;
}
