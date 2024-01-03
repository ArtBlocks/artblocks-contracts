// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/ISplitAtomicV0.sol";

pragma solidity ^0.8.0;

contract ReentrancySplitterSendETHMock {
    address public currentSplitterAddress;
    bool public haveReentered;

    receive() external payable {
        // only re-enter once to prevent infinite loop
        if (haveReentered) {
            return;
        }
        // update state
        haveReentered = true;
        // re-enter via sending ETH to splitter's receive function
        (bool success, ) = currentSplitterAddress.call{value: msg.value}("");
        require(success, "attack failed");
        // reset state
        haveReentered = false;
    }

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite. 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(address splitterAddress) external payable {
        currentSplitterAddress = splitterAddress;
        (bool success, ) = splitterAddress.call{value: msg.value}("");
        require(success, "attack failed");
    }
}

contract ReentrancySplitterDrainETHMock {
    address public currentSplitterAddress;
    bool public haveReentered;

    receive() external payable {
        // only re-enter once to prevent infinite loop
        if (haveReentered) {
            return;
        }
        // update state
        haveReentered = true;
        // re-enter via calling splitter's drainETH function
        ISplitAtomicV0(currentSplitterAddress).drainETH();
        // reset state
        haveReentered = false;
    }

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite. 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(address splitterAddress) external payable {
        currentSplitterAddress = splitterAddress;
        (bool success, ) = splitterAddress.call{value: msg.value}("");
        require(success, "attack failed");
    }
}
