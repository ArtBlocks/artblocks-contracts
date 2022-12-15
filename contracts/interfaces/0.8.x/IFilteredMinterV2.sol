// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV1.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV1 interface in order to
 * add support for manually setting project max invocations.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterV2 is IFilteredMinterV1 {
    event ManuallySetProjectMaxInvocations(
        uint256 indexed _projectId,
        address indexed _coreContractAddress,
        uint256 _maxInvocations
    );

    function manuallySetProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) external;
}
