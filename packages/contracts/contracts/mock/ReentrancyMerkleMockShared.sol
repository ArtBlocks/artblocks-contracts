// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/ISharedMinterMerkleV0.sol";

pragma solidity ^0.8.0;

contract ReentrancyMerkleMockShared {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    address public currentCoreContract;
    uint256 public currentPriceToPay;
    bytes32[3] currentProof;

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
        bytes32[] memory _proof
    ) external payable {
        // update state variables so that receive() knows what to do
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentCoreContract = _coreContract;
        currentPriceToPay = _priceToPay;
        currentProof[0] = _proof[0];
        currentProof[1] = _proof[1];
        currentProof[2] = _proof[2];
        ISharedMinterMerkleV0(_minterContractAddress).purchase{
            value: _priceToPay
        }(_projectId, _coreContract, _proof);
    }

    // receiver is called when minter sends refunded Ether to this contract.
    receive() external payable {
        // decrement num to be purchased
        currentQtyToPurchase--;
        if (currentQtyToPurchase > 0) {
            // rebuild _proof
            bytes32[] memory _proof = new bytes32[](3);
            _proof[0] = currentProof[0];
            _proof[1] = currentProof[1];
            _proof[2] = currentProof[2];
            // purchase again!
            ISharedMinterMerkleV0(msg.sender).purchase{
                value: currentPriceToPay
            }(currentProjectId, currentCoreContract, _proof);
        }
    }
}
