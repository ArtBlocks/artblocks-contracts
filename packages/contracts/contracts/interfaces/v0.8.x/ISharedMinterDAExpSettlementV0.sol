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

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * project `projectId` on core contract `coreContract`.
     * The current settled price is the price paid for the most recently
     * purchased token, or the base price if the artist has withdrawn revenues
     * after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends excess settlement funds to msg.sender.
     * @param projectId Project ID to reclaim excess settlement funds on.
     * @param coreContract Contract address of the core contract
     */
    function reclaimProjectExcessSettlementFunds(
        uint256 projectId,
        address coreContract
    ) external;
}
