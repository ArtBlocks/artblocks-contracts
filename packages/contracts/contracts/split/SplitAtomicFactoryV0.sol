// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISplitAtomicV0, Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
import {ISplitAtomicFactoryV0} from "../interfaces/v0.8.x/ISplitAtomicFactoryV0.sol";

import {Clones} from "@openzeppelin-5.0/contracts/proxy/Clones.sol";

/**
 * @title SplitAtomicFactoryV0
 * @author Art Blocks Inc.
 */
contract SplitAtomicFactoryV0 is ISplitAtomicFactoryV0 {
    // public type
    bytes32 public constant type_ = "SplitAtomicFactoryV0";
    // public immutable implementation contract
    address public immutable splitAtomicImplementation;

    // required split address and basis points
    // @dev make immutable to avoid SLOAD on every createSplit call
    address public immutable requiredSplitAddress;
    uint16 public immutable requiredSplitBasisPoints;

    // deployer of the contract is the only one who can abandon the contract
    address public immutable deployer;

    // abandon old factories that use abandoned required split addresses or bps
    bool public isAbandoned; // default false

    /**
     * @notice Initializes contract with the provided `splits`.
     * @dev This function should be called atomically, immediately after
     * deployment.
     */
    constructor(
        address splitAtomicImplementation_,
        address requiredSplitAddress_,
        uint16 requiredSplitBasisPoints_
    ) {
        // input validation
        require(
            requiredSplitBasisPoints_ <= 10_000,
            "only reqd split BPS <= 10_000"
        );
        splitAtomicImplementation = splitAtomicImplementation_;
        requiredSplitAddress = requiredSplitAddress_;
        requiredSplitBasisPoints = requiredSplitBasisPoints_;
        deployer = msg.sender;
        // emit event
        emit Deployed({
            implementation: splitAtomicImplementation_,
            type_: type_,
            requiredSplitAddress: requiredSplitAddress_,
            requiredSplitBasisPoints: requiredSplitBasisPoints_
        });
    }

    function createSplit(
        Split[] calldata splits
    ) external returns (address splitAtomic) {
        require(!isAbandoned, "factory is abandoned");
        // validate first split is initial split
        require(
            splits[0].recipient == requiredSplitAddress &&
                splits[0].basisPoints == requiredSplitBasisPoints,
            "splits[0] must be required split"
        );
        // Create the EIP 1167 split atomic contract
        splitAtomic = Clones.clone({implementation: splitAtomicImplementation});
        // initialize the new split atomic contract
        ISplitAtomicV0(splitAtomic).initialize(splits);
        // emit event
        emit SplitAtomicCreated(splitAtomic);
    }

    function abandon() external {
        require(!isAbandoned, "factory is abandoned");
        require(msg.sender == deployer, "only deployer may abandon");
        // set isAbandoned to true
        isAbandoned = true;
        // emit event
        emit Abandoned();
    }
}
