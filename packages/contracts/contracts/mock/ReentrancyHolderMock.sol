// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IFilteredMinterHolderV0.sol";

pragma solidity ^0.8.0;

contract ReentrancyHolderMock {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    uint256 public currentPriceToPay;
    address public currentOwnedNftAddress;
    uint256 public currentOwnedNftTokenId;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite's Token Holder minter.
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _qtyToPurchase,
        address _minterContractAddress,
        uint256 _projectId,
        uint256 _priceToPay,
        address _ownedNftAddress,
        uint256 _ownedNftTokenId
    ) external payable {
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentPriceToPay = _priceToPay;
        currentOwnedNftAddress = _ownedNftAddress;
        currentOwnedNftTokenId = _ownedNftTokenId;
        IFilteredMinterHolderV0(_minterContractAddress).purchase{
            value: _priceToPay
        }(_projectId, _ownedNftAddress, _ownedNftTokenId);
    }

    // receiver is called when minter sends refunded Ether to this contract.
    receive() external payable {
        // decrement num to be purchased
        currentQtyToPurchase--;
        if (currentQtyToPurchase > 0) {
            // purchase again!
            IFilteredMinterHolderV0(msg.sender).purchase{
                value: currentPriceToPay
            }(currentProjectId, currentOwnedNftAddress, currentOwnedNftTokenId);
        }
    }
}
