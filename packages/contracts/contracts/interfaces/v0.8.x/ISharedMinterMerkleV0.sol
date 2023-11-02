// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface adds support for including Merkle proofs when purchasing.
 * @author Art Blocks Inc.
 */
interface ISharedMinterMerkleV0 {
    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address. Requires Merkle proof.
    function purchase(
        uint256 projectId,
        address coreContract,
        bytes32[] calldata proof
    ) external payable returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address. Requires Merkle proof.
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract,
        bytes32[] calldata proof
    ) external payable returns (uint256 tokenId);

    // Updates the Merkle root for the desired project.
    function updateMerkleRoot(
        uint256 projectId,
        address coreContract,
        bytes32 root
    ) external;
}
