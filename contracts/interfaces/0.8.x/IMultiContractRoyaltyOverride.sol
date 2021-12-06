// SPDX-License-Identifier: MIT

import "../../libs/0.8.x/IERC165.sol";

pragma solidity ^0.8.0;

interface IMultiContractRoyaltyOverride is IERC165 {
    function getRoyalties(address tokenAddress, uint256 tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps);
}
