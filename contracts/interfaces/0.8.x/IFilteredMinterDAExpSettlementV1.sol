// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterDAExpSettlementV0.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV1 interface in order to
 * add support for Dutch Auction with Settlement minter updates.
 * @dev keys represent strings of finite length encoded in bytes32 to minimize
 * gas.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterDAExpSettlementV1 is IFilteredMinterDAExpSettlementV0 {
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
