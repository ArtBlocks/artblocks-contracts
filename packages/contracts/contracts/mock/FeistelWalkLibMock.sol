// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FeistelWalkLib} from "../libs/v0.8.x/FeistelWalkLib.sol";

/**
 * @title FeistelWalkLibMock
 * @notice Mock contract for testing FeistelWalkLib library functionality
 */
contract FeistelWalkLibMock {
    using FeistelWalkLib for FeistelWalkLib.Plan;

    /**
     * @notice Build a Feistel permutation plan
     * @param seed Arbitrary seed
     * @param N Domain size
     * @return N The domain size
     * @return M The next power of two >= N
     * @return rounds The number of Feistel rounds
     * @return k0 First round key
     * @return k1 Second round key
     * @return k2 Third round key
     * @return k3 Fourth round key
     */
    function makePlan(
        bytes32 seed,
        uint256 N
    )
        external
        pure
        returns (uint256, uint256, uint256, uint64, uint64, uint64, uint64)
    {
        FeistelWalkLib.Plan memory p = FeistelWalkLib.makePlan(seed, N);
        return (p.N, p.M, p.rounds, p.k0, p.k1, p.k2, p.k3);
    }

    /**
     * @notice Get the k-th index in the permutation
     * @param seed Arbitrary seed
     * @param N Domain size
     * @param k The index in the permutation sequence
     * @return The permuted index
     */
    function index(
        bytes32 seed,
        uint256 N,
        uint256 k
    ) external pure returns (uint256) {
        FeistelWalkLib.Plan memory p = FeistelWalkLib.makePlan(seed, N);
        return FeistelWalkLib.index(p, k);
    }

    /**
     * @notice Sample K indices from the permutation
     * @param seed Arbitrary seed
     * @param N Domain size
     * @param K Number of samples to take
     * @return Array of K permuted indices
     */
    function sample(
        bytes32 seed,
        uint256 N,
        uint256 K
    ) external pure returns (uint256[] memory) {
        FeistelWalkLib.Plan memory p = FeistelWalkLib.makePlan(seed, N);
        return FeistelWalkLib.sample(p, K);
    }

    /**
     * @notice Get all N indices in the permutation (full traversal)
     * @param seed Arbitrary seed
     * @param N Domain size
     * @return Array of all N permuted indices
     */
    function fullTraversal(
        bytes32 seed,
        uint256 N
    ) external pure returns (uint256[] memory) {
        FeistelWalkLib.Plan memory p = FeistelWalkLib.makePlan(seed, N);
        return FeistelWalkLib.sample(p, N);
    }
}
