// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev 0.8.22 required by the PMP interfaces, which depend on OpenZeppelin 5.0
pragma solidity 0.8.22;

import {IPMPV0} from "../interfaces/v0.8.x/IPMPV0.sol";

interface IMinterPurchaseWithPMPs {
    function purchaseWithPMPs(
        uint256 projectId,
        address coreContract,
        IPMPV0.PMPInput[] calldata pmpInputs
    ) external payable returns (uint256 tokenId);
}

contract ReentrancyPMPMockShared {
    uint256 public currentQtyToPurchase;
    uint256 public currentProjectId;
    address public currentCoreContract;
    uint256 public currentPriceToPay;
    string public currentPMPKey;
    uint8 public currentPMPParamType;
    bytes32 public currentPMPValue;

    /**
        @notice This function can be called to induce controlled reentrency attacks
        on a shared AB minter's PMP-accepting purchase function.
        Note that _priceToPay should be > project price per token to induce refund,
        making reentrency possible via fallback function.
     */
    function attack(
        uint256 _qtyToPurchase,
        address _minterContractAddress,
        uint256 _projectId,
        address _coreContract,
        uint256 _priceToPay,
        string calldata _pmpKey,
        uint8 _pmpParamType,
        bytes32 _pmpValue
    ) external payable {
        // update state variables so that receive() knows what to do
        currentQtyToPurchase = _qtyToPurchase;
        currentProjectId = _projectId;
        currentCoreContract = _coreContract;
        currentPriceToPay = _priceToPay;
        currentPMPKey = _pmpKey;
        currentPMPParamType = _pmpParamType;
        currentPMPValue = _pmpValue;
        IMinterPurchaseWithPMPs(_minterContractAddress).purchaseWithPMPs{
            value: _priceToPay
        }(_projectId, _coreContract, _pmpInputs());
    }

    // receiver is called when minter sends refunded Ether to this contract.
    receive() external payable {
        // decrement num to be purchased
        currentQtyToPurchase--;
        if (currentQtyToPurchase > 0) {
            // purchase again!
            IMinterPurchaseWithPMPs(msg.sender).purchaseWithPMPs{
                value: currentPriceToPay
            }(currentProjectId, currentCoreContract, _pmpInputs());
        }
    }

    function _pmpInputs()
        internal
        view
        returns (IPMPV0.PMPInput[] memory pmpInputs)
    {
        pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: currentPMPKey,
            configuredParamType: IPMPV0.ParamType(currentPMPParamType),
            configuredValue: currentPMPValue,
            configuringArtistString: false,
            configuredValueString: ""
        });
    }
}
