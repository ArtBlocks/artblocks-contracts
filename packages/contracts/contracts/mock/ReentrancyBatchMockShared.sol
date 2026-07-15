// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity ^0.8.0;

interface IBatchMinter {
    function purchaseMultiple(
        uint256 projectId,
        address coreContract,
        uint24 quantity
    ) external payable returns (uint256[] memory tokenIds);

    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId);
}

contract ReentrancyBatchMockShared {
    uint256 public currentProjectId;
    address public currentCoreContract;
    address public currentMinter;
    uint256 public currentPriceToPay;
    bool public shouldReenter;

    function attackBatch(
        address _minterContractAddress,
        uint256 _projectId,
        address _coreContract,
        uint24 _quantity,
        uint256 _priceToPay
    ) external payable {
        currentProjectId = _projectId;
        currentCoreContract = _coreContract;
        currentMinter = _minterContractAddress;
        currentPriceToPay = _priceToPay;
        shouldReenter = true;
        IBatchMinter(_minterContractAddress).purchaseMultiple{value: msg.value}(
            _projectId,
            _coreContract,
            _quantity
        );
    }

    receive() external payable {
        if (shouldReenter) {
            shouldReenter = false;
            IBatchMinter(currentMinter).purchase{value: currentPriceToPay}(
                currentProjectId,
                currentCoreContract
            );
        }
    }
}
