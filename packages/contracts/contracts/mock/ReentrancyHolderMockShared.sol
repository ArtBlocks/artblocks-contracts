// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/ISharedMinterHolderV0.sol";

pragma solidity ^0.8.0;

contract ReentrancyHolderMockShared {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    address public currentCoreContract;
    uint256 public currentPriceToPay;
    address public currentOwnedNftAddress;
    uint256 public currentOwnedNftTokenId;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on the shared AB minter filter suite. 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _qtyToPurchase,
        address _minterContractAddress,
        uint256 _projectId,
        address _coreContract,
        uint256 _priceToPay,
        address _ownedNftAddress,
        uint256 _ownedNftTokenId
    ) external payable {
        // update state variables so that receive() knows what to do
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentCoreContract = _coreContract;
        currentPriceToPay = _priceToPay;
        currentOwnedNftAddress = _ownedNftAddress;
        currentOwnedNftTokenId = _ownedNftTokenId;
        ISharedMinterHolderV0(_minterContractAddress).purchase{
            value: _priceToPay
        }(_projectId, _coreContract, _ownedNftAddress, _ownedNftTokenId);
    }

    // receiver is called when minter sends refunded Ether to this contract.
    receive() external payable {
        // decrement num to be purchased
        currentQtyToPurchase--;
        if (currentQtyToPurchase > 0) {
            // purchase again!
            ISharedMinterHolderV0(msg.sender).purchase{
                value: currentPriceToPay
            }(
                currentProjectId,
                currentCoreContract,
                currentOwnedNftAddress,
                currentOwnedNftTokenId
            );
        }
    }
}
