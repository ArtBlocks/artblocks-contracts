// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;
import "./ISharedMinterDAExpV0.sol";

interface ISharedMinterDAExpSettlementV0 is ISharedMinterDAExpV0 {
    /// returns latest purchase price for project `_projectId`, or 0 if no
    /// purchases have been made.
    function getProjectLatestPurchasePrice(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256 latestPurchasePrice);

    /// returns the number of settleable invocations for project `_projectId`.
    function getNumSettleableInvocations(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256 numSettleableInvocations);

    /// Returns the current excess settlement funds on project `_projectId`
    /// for address `_walletAddress`.
    function getProjectExcessSettlementFunds(
        uint256 _projectId,
        address _coreContract,
        address _walletAddress
    ) external view returns (uint256 excessSettlementFundsInWei);
}
