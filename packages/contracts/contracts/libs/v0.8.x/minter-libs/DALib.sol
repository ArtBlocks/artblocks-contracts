// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Merkle Library
 * @notice This library is designed to manage and verify merkle based gating for Art Blocks projects.
 * It provides functionalities such as updating the merkle root of project, verifying an address against a proof,
 * and setting the maximum number of invocations per address for a project.
 * @author Art Blocks Inc.
 */

library DALib {
    struct DAProjectConfig {
        uint64 timestampStart;
        uint64 timestampEnd;
        uint256 startPrice;
        uint256 basePrice;
        uint64 priceDecayHalfLifeSeconds;
    }
}
