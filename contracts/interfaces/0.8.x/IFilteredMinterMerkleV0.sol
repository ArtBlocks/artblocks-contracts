// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV0.sol";

pragma solidity ^0.8.0;

interface IFilteredMinterMerkleV0 is IFilteredMinterV0 {
    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address. Requires Merkle proof.
    function purchase(uint256 _projectId, bytes32[] memory _proof)
        external
        payable
        returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address. Requires Merkle proof.
    function purchaseTo(
        address _to,
        uint256 _projectId,
        bytes32[] memory _proof
    ) external payable returns (uint256 tokenId);
}
