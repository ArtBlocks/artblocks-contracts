// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface IEngineContractMintingAPIV0 {
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;

    function purchaseTo(address _to, uint256 _projectId)
        private
        returns (uint256 _tokenId);

    function getPriceInfo(uint256 _projectId)
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        );
}
