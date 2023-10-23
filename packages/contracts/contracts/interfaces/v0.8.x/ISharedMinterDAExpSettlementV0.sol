// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;
import "./ISharedMinterDAExpV0.sol";

interface ISharedMinterDAExpSettlementV0 is ISharedMinterDAExpV0 {
    /// returns latest purchase price for project `projectId`, or 0 if no
    /// purchases have been made.
    function getProjectLatestPurchasePrice(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 latestPurchasePrice);

    /// returns the number of settleable invocations for project `projectId`.
    function getNumSettleableInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 numSettleableInvocations);

    /// Returns the current excess settlement funds on project `projectId`
    /// for address `walletAddress`.
    function getProjectExcessSettlementFunds(
        uint256 projectId,
        address coreContract,
        address walletAddress
    ) external view returns (uint256 excessSettlementFundsInWei);
}
