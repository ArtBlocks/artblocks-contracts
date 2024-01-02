// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
import {SplitConfig, ISplitAtomicV0Helpers} from "../interfaces/v0.8.x/ISplitAtomicV0Helpers.sol";

import {NamespacedReentrancyGuard} from "../utils/NamespacedReentrancyGuard.sol";

import {IERC20} from "@openzeppelin-5.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {Proxy} from "@openzeppelin-5.0/contracts/proxy/Proxy.sol";

/**
 * @title SplitAtomicV0Helpers
 * @author Art Blocks Inc.
 * @notice This contract splits provides helper functions to reduce the
 * bytecode size of SplitAtomicV0.
 *
 * TODO - add details on why a library is not used
 * TODO - add details about how this contract is intended to be DELEGATECALL only
 */
contract SplitAtomicV0Helpers is
    ISplitAtomicV0Helpers,
    NamespacedReentrancyGuard
{
    /**
     * @notice Initializes the contract, specifically the
     * state used by NamespacedReentrancyGuard.
     */
    function initialize() public {
        NamespacedReentrancyGuard._initialize();
        // TODO: emit initialized event
    }

    /**
     * @notice receive function splits received funds according to the
     * configured `splits`.
     * Reverts if contract is not yet initialized.
     * @dev This function automatically splits funds when the native token of a
     * blockchain is sent to the contract. It is important to note that this
     * function uses an unspecified amount of gas, and therefore sending funds
     * to this contract via the deprecated `transfer` method is not supported.
     * @dev This function relies on being non-reentrant for security.
     */
    function onReceiveETH(
        uint256 receivedValueInWei,
        SplitConfig calldata splitConfig
    ) public payable nonReentrant {
        // split received funds
        _splitETH({valueInWei: receivedValueInWei, splitConfig: splitConfig});
    }

    /**
     * @notice Drains the contract's balance to the configured `splits`.
     * Reverts if not initialized.
     * @dev This function is useful for draining the contract's balance to the
     * configured `splits` in the event that the contract receives funds via
     * a force-send (e.g. `SELFDESTRUCT` or `SENDALL`) operation.
     * @dev This function relies on being non-reentrant for security.
     */
    function drainETH(SplitConfig calldata splitConfig) public nonReentrant {
        // split contract balance
        uint256 balance = address(this).balance;
        if (balance > 0) {
            _splitETH({valueInWei: balance, splitConfig: splitConfig});
        }
        emit DrainedETH();
    }

    /**
     * @notice Drains the contract's balance of an input ERC20 token to the
     * configured `splits`.
     * Reverts if not initialized
     * @dev This function is useful for draining the contract's balance of an
     * ERC20 token to the configured `splits`. ERC20 tokens are not split upon
     * receiving (due to transfers not always calling a receive hook),
     * therefore this function provides critical functionality for this
     * contract.
     * @dev This function relies on being non-reentrant for security.
     * @param ERC20TokenAddress The address of the ERC20 token to split.
     */
    function drainERC20(
        address ERC20TokenAddress,
        SplitConfig calldata splitConfig
    ) public nonReentrant {
        // split contract balance of ERC20 token
        uint256 balance = IERC20(ERC20TokenAddress).balanceOf(address(this));
        if (balance > 0) {
            _splitERC20({
                ERC20TokenAddress: ERC20TokenAddress,
                value: balance,
                splitConfig: splitConfig
            });
        }
        emit DrainedERC20(ERC20TokenAddress);
    }

    /**
     * @notice Splits the input `valueInWei` of ETH to the configured `splits`.
     * Reverts if any transfers fail. Reverts if called outside of a
     * non-reentrant function. Reverts if not initialized.
     * @param valueInWei The amount of ETH to split.
     */
    function _splitETH(
        uint256 valueInWei,
        SplitConfig calldata splitConfig
    ) private {
        // split funds
        if (splitConfig.basisPoints0 > 0) {
            _splitETHToRecipient({
                recipient: splitConfig.recipient0,
                basisPoints: splitConfig.basisPoints0,
                totalValueInWei: valueInWei
            });
        }
        if (splitConfig.basisPoints1 > 0) {
            _splitETHToRecipient({
                recipient: splitConfig.recipient1,
                basisPoints: splitConfig.basisPoints1,
                totalValueInWei: valueInWei
            });
        }
        if (splitConfig.basisPoints2 > 0) {
            _splitETHToRecipient({
                recipient: splitConfig.recipient2,
                basisPoints: splitConfig.basisPoints2,
                totalValueInWei: valueInWei
            });
        }
    }

    /**
     * @notice Splits the input `value` of ERC20 token at `ERC20TokenAddress`
     * to the configured `splits`.
     * Reverts if any transfers fail. Reverts if called outside of a
     * non-reentrant function. Reverts if not initialized.
     * @param ERC20TokenAddress The address of the ERC20 token to split.
     * @param value The amount of the ERC20 token to split.
     */
    function _splitERC20(
        address ERC20TokenAddress,
        uint256 value,
        SplitConfig calldata splitConfig
    ) private {
        // split funds
        IERC20 token = IERC20(ERC20TokenAddress);
        if (splitConfig.basisPoints0 > 0) {
            _splitERC20ToRecipient({
                recipient: splitConfig.recipient0,
                basisPoints: splitConfig.basisPoints0,
                totalValue: value,
                token: token
            });
        }
        if (splitConfig.basisPoints1 > 0) {
            _splitERC20ToRecipient({
                recipient: splitConfig.recipient1,
                basisPoints: splitConfig.basisPoints1,
                totalValue: value,
                token: token
            });
        }
        if (splitConfig.basisPoints2 > 0) {
            _splitERC20ToRecipient({
                recipient: splitConfig.recipient2,
                basisPoints: splitConfig.basisPoints2,
                totalValue: value,
                token: token
            });
        }
    }

    function _splitETHToRecipient(
        address payable recipient,
        uint256 basisPoints,
        uint256 totalValueInWei
    ) private {
        // @dev overflow checked automatically in solidity 0.8
        // @dev integer division rounds down, which is conservatively safe
        // when splitting funds. Will not run out of funds, but may leave a
        // small amount behind (e.g. a few wei). Can always be drained
        // later, but likely never worth the gas.
        uint256 splitValue = (totalValueInWei * basisPoints) / 10_000;
        // send funds
        (bool success, ) = recipient.call{value: splitValue}("");
        require(success, "Payment failed");
    }

    function _splitERC20ToRecipient(
        address payable recipient,
        uint256 basisPoints,
        uint256 totalValue,
        IERC20 token
    ) private {
        // @dev overflow checked automatically in solidity 0.8
        // @dev integer division rounds down, which is conservatively safe
        // when splitting funds. Will not run out of funds, but may leave a
        // small amount behind (e.g. a few decimals). Can always be drained
        // later, but likely never worth the gas.
        uint256 splitValue = (totalValue * basisPoints) / 10_000;
        // transfer ERC20 tokens
        // @dev use SafeERC20 to only revert if ERC20 transfer returns
        // false, not if it returns nothing (which is the behavior of some
        // ERC20 tokens, and we don't want to forever lock those tokens)
        SafeERC20.safeTransfer({
            token: token,
            to: recipient,
            value: splitValue
        });
    }
}
