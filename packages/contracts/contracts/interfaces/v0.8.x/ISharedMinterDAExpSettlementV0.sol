// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;
import "./ISharedMinterDAExpV0.sol";

interface ISharedMinterDAExpSettlementV0 is ISharedMinterDAExpV0 {
    /// sellout price updated for project `projectId`.
    /// @dev does not use generic event because likely will trigger additional
    /// actions in indexing layer
    event SelloutPriceUpdated(
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint128 _selloutPrice
    );

    /// artist and admin have withdrawn revenues from settleable purchases for
    /// project `projectId`.
    /// @dev does not use generic event because likely will trigger additional
    /// actions in indexing layer
    event ArtistAndAdminRevenuesWithdrawn(
        uint256 indexed _projectId,
        address indexed _coreContract
    );

    /// receipt has an updated state
    event ReceiptUpdated(
        address indexed _purchaser,
        uint256 indexed _projectId,
        address indexed _coreContract,
        uint24 _numPurchased,
        uint232 _netPosted
    );

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
