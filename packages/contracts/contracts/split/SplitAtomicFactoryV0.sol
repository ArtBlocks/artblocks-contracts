// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {SplitAtomicV0} from "./SplitAtomicV0.sol";
import {ISplitAtomicV0, Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
import {ISplitAtomicFactoryV0} from "../interfaces/v0.8.x/ISplitAtomicFactoryV0.sol";

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

    // abandon old factories that use abandoned required split addresses or bps
    // @dev use uint256 instead of bool for gas efficiency
    uint256 public isAbandoned; // default 0 (false)

    address public immutable deployer;

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
        require(
            // @dev use uint256 instead of bool for gas efficiency
            isAbandoned == 0,
            "factory is abandoned"
        );
        // validate first split is initial split
        require(
            splits[0].recipient == requiredSplitAddress &&
                splits[0].basisPoints == requiredSplitBasisPoints,
            "splits[0] must be required split"
        );
        // create the split atomic contract
        splitAtomic = address(
            new SplitAtomicV0({
                splitAtomicV0Helpers_: splitAtomicImplementation,
                splits: splits
            })
        );
        // emit event
        emit SplitAtomicCreated(splitAtomic);
    }

    function createSplitDeterministic(
        Split[] calldata splits,
        bytes32 salt
    ) external returns (address splitAtomic) {
        require(
            // @dev use uint256 instead of bool for gas efficiency
            isAbandoned == 0,
            "factory is abandoned"
        );
        // validate first split is initial split
        require(
            splits[0].recipient == requiredSplitAddress &&
                splits[0].basisPoints == requiredSplitBasisPoints,
            "splits[0] must be required split"
        );
        // TODO
        // emit event
        emit SplitAtomicCreated(splitAtomic);
    }

    function abandon() external {
        require(msg.sender == deployer, "only deployer can abandon");
        // set isAbandoned to true
        // @dev use uint256 instead of bool for gas efficiency
        isAbandoned = 1;
        // emit event
        emit Abandoned();
    }

    // function predictDeterministicAddress(
    //     bytes32 salt
    // ) external view returns (address) {
    //     return
    //         Clones.predictDeterministicAddress({
    //             implementation: splitAtomicImplementation,
    //             salt: salt
    //         });
    // }
}
