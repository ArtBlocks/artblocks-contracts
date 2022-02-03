// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.5.0;

interface IFilteredMinter {
    /**
     * @notice Price per token in wei updated for project `_projectId` to
     * `_pricePerTokenInWei`.
     */
    event PricePerTokenInWeiUpdated(
        uint256 indexed _projectId,
        uint256 indexed _pricePerTokenInWei
    );

    /**
     * @notice Currency updated for project `_projectId` to symbol
     * `_currencySymbol` and address `_currencyAddress`.
     */
    event ProjectCurrencyInfoUpdated(
        uint256 indexed _projectId,
        string indexed _currencySymbol,
        address indexed _currencyAddress
    );

    /// togglePurchaseToDisabled updated
    event PurchaseToDisabledUpdated(
        uint256 _projectId,
        bool _purchaseToDisabled
    );

    // getter function of public variable
    function minterType() external view returns (string memory);

    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address.
    function purchase(uint256 _projectId)
        external
        payable
        returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address.
    function purchaseTo(address _to, uint256 _projectId)
        external
        payable
        returns (uint256 tokenId);

    // Toggles the ability for `purchaseTo` to be called directly with a
    // specified receiving address that differs from the TX-sending address.
    function togglePurchaseToDisabled(uint256 _projectId) external;

    // Called to make the minter contract aware of the max invocations for a
    // given project.
    function setProjectMaxInvocations(uint256 _projectId) external;

    // Gets current price of minting a token, assuming this is project's minter
    function getPrice(uint256 _projectId) external view returns (uint256);

    // Gets currency symbol for project, assuming this is project's minter
    function getCurrencySymbol(uint256 _projectId)
        external
        view
        returns (string memory);

    // Gets currency address for project, assuming this is project's minter
    // Must return null address if project currency is ETH.
    function getCurrencyAddress(uint256 _projectId)
        external
        view
        returns (address);
}
