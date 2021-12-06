// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IMultiContractRoyaltyOverride {
    function getRoyalties(address tokenAddress, uint256 tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps);
}
