// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/ISharedMinterSEAV0.sol";

pragma solidity ^0.8.0;

contract ReentrancySEAAutoBidderMockShared {
    uint256 public targetTokenId;
    address public targetCoreContract;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on AB minter filter suite. 
        Note that _priceToPay should be > project price per token to induce refund, 
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _targetTokenId,
        address _targetCoreContract,
        address _minterContractAddress,
        uint256 _initialBidValue
    ) external payable {
        targetTokenId = _targetTokenId;
        targetCoreContract = _targetCoreContract;
        ISharedMinterSEAV0(_minterContractAddress).createBid{
            value: _initialBidValue
        }(_targetTokenId, _targetCoreContract);
    }

    // receiver is called when minter sends refunded Ether to this contract, when outbid
    receive() external payable {
        // auto-rebid
        uint256 newBidValue = (msg.value * 110) / 100;
        ISharedMinterSEAV0(msg.sender).createBid{value: newBidValue}(
            targetTokenId,
            targetCoreContract
        );
    }
}
