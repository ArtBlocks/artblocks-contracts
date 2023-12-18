// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISplitAtomicV0, Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
import {ISplitAtomicFactoryV0} from "../interfaces/v0.8.x/ISplitAtomicFactoryV0.sol";

import {Split} from "./SplitAtomicV0.sol";

import {Clones} from "@openzeppelin-5.0/contracts/proxy/Clones.sol";

/**
 * @title SplitAtomicFactoryV0
 * @author Art Blocks Inc.
 */
contract SplitAtomicFactoryV0 is ISplitAtomicFactoryV0 {
    address public immutable splitAtomicImplementation;

    /**
     * @notice Initializes contract with the provided `splits`.
     * @dev This function should be called atomically, immediately after
     * deployment.
     */
    constructor(address splitAtomicImplementation_) {
        splitAtomicImplementation = splitAtomicImplementation_;
        emit ImplementationSet(splitAtomicImplementation_);
    }

    function createSplit(
        Split[] calldata splits
    ) external returns (address splitAtomic) {
        // Create the EIP 1167 split atomic contract
        splitAtomic = Clones.clone({implementation: splitAtomicImplementation});
        // initialize the new split atomic contract
        ISplitAtomicV0(splitAtomic).initialize(splits);
        // emit event
        emit SplitAtomicCreated(splitAtomic);
    }
}
