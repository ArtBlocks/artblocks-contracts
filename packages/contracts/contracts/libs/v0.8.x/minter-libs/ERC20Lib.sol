// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/v0.8.x/IMinterBaseV0.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";
import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Split Funds Library
 * @notice This library is designed for the Art Blocks platform. It splits
 * Ether (ETH) and ERC20 token funds among stakeholders, such as sender
 * (if refund is applicable), providers, artists, and artists' additional
 * payees.
 * @author Art Blocks Inc.
 */

library ERC20Lib {
    struct ProjectCurrencyConfig {
        string currencySymbol;
        address currencyAddress;
    }

    /**
     * @notice Updates payment currency of the referenced `ERC20ProjectConfig
     * to be `_currencySymbol` at address `_currencyAddress`.
     * `_currencySymbol` at address `_currencyAddress`.
     * @param _projectCurrencyConfig ERC20ProjectConfig to update.
     * @param _currencySymbol Currency symbol.
     * @param _currencyAddress Currency address.
     */
    function updateProjectCurrencyInfo(
        ProjectCurrencyConfig storage _projectCurrencyConfig,
        string memory _currencySymbol,
        address _currencyAddress
    ) internal {
        // require null address if symbol is "ETH"
        require(
            (keccak256(abi.encodePacked(_currencySymbol)) ==
                keccak256(abi.encodePacked("ETH"))) ==
                (_currencyAddress == address(0)),
            "ETH is only null address"
        );
        _projectCurrencyConfig.currencySymbol = _currencySymbol;
        _projectCurrencyConfig.currencyAddress = _currencyAddress;
    }

    /**
     * Validate that `_msgSender` has approved the contract to spend at least
     * `_pricePerTokenInWei` of `_currencyAddress` ERC20 tokens, and that
     * `_msgSender` has a balance of at least `_pricePerTokenInWei` of
     * `_currencyAddress` ERC20 tokens.
     * Reverts if insufficient allowance or balance.
     * @param _msgSender Address of the message sender to validate.
     * @param _currencyAddress Address of the ERC20 token to validate.
     * @param _pricePerTokenInWei Price per token in wei to validate.
     */
    function validateERC20Approvals(
        address _msgSender,
        address _currencyAddress,
        uint256 _pricePerTokenInWei
    ) internal view {
        require(
            IERC20(_currencyAddress).allowance(_msgSender, address(this)) >=
                _pricePerTokenInWei,
            "Insufficient ERC20 allowance"
        );
        require(
            IERC20(_currencyAddress).balanceOf(_msgSender) >=
                _pricePerTokenInWei,
            "Insufficient ERC20 balance"
        );
    }

    /**
     * Get the balance of `_currencyAddress` ERC20 tokens for `_walletAddress`.
     * @param _currencyAddress ERC20 token address.
     * @param _walletAddress wallet address.
     */
    function getERC20Balance(
        address _currencyAddress,
        address _walletAddress
    ) internal view returns (uint256) {
        return IERC20(_currencyAddress).balanceOf(_walletAddress);
    }

    function getERC20Allowance(
        address _currencyAddress,
        address _walletAddress,
        address _spenderAddress
    ) internal view returns (uint256 allowance) {
        allowance = IERC20(_currencyAddress).allowance(
            _walletAddress,
            _spenderAddress
        );
        return allowance
    }
}
