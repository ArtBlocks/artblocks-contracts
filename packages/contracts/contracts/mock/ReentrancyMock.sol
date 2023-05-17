// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IFilteredMinterV0.sol";

pragma solidity ^0.8.0;

contract ReentrancyMock {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    uint256 public currentPriceToPay;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite. 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _qtyToPurchase,
        address _minterContractAddress,
        uint256 _projectId,
        uint256 _priceToPay
    ) external payable {
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentPriceToPay = _priceToPay;
        IFilteredMinterV0(_minterContractAddress).purchase{value: _priceToPay}(
            _projectId
        );
    }

    // receiver is called when minter sends refunded Ether to this contract.
    receive() external payable {
        // decrement num to be purchased
        currentQtyToPurchase--;
        if (currentQtyToPurchase > 0) {
            // purchase again!
            IFilteredMinterV0(msg.sender).purchase{value: currentPriceToPay}(
                currentProjectId
            );
        }
    }
}
