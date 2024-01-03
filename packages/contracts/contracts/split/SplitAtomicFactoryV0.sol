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
 * @notice Factory contract for creating new split atomic contracts.
 * @dev This contract is deployed once, and then used to create new split
 * atomic contracts. The contract may be abandoned once it is no longer needed.
 * Once abandoned, the contract can no longer be used to create new split
 * atomic contracts.
 * The contract is initialized with a required split address and basis points.
 * All splits must include the required split address and basis points.
 * The contract is initialized with an implementation contract, which is cloned
 * when creating new split atomic contracts.
 */
contract SplitAtomicFactoryV0 is ISplitAtomicFactoryV0 {
    // public type
    bytes32 public constant type_ = "SplitAtomicFactoryV0";

    /**
     * The implementation contract that is cloned when creating new split
     * atomic contracts.
     */
    address public immutable splitAtomicImplementation;

    // required split address and basis points
    // @dev make immutable to avoid SLOAD on every createSplit call
    address public immutable requiredSplitAddress;
    uint16 public immutable requiredSplitBasisPoints;

    // deployer of the contract is the only one who may abandon the contract
    address public immutable deployer;

    /**
     * Indicates whether the contract is abandoned.
     * Once abandoned, the contract can no longer be used to create new split
     * atomic contracts.
     */
    bool public isAbandoned; // default false

    /**
     * @notice validates and assigns immutable configuration variables
     * @param splitAtomicImplementation_ address of the split atomic
     * implementation contract
     * @param requiredSplitAddress_ address that must be included in all splits
     * @param requiredSplitBasisPoints_ basis points that must be included in
     * all splits, for the required split address. Must be <= 10_000.
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

    /**
     * @notice Creates a new split atomic contract with the provided `splits`.
     * @param splits Splits to configure the contract with. Must add up to
     * 10_000 BPS, and the first split must be the required split; reverts
     * otherwise.
     * @return splitAtomic The address of the newly created split atomic
     * contract. The address is also emitted in the `SplitAtomicCreated` event.
     */
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

    /**
     * @notice Abandons the contract, preventing it from being used to create
     * new split atomic contracts.
     * Only callable by the deployer, and only once; reverts otherwise.
     */
    function abandon() external {
        require(!isAbandoned, "factory is abandoned");
        require(msg.sender == deployer, "only deployer may abandon");
        // set isAbandoned to true
        isAbandoned = true;
        // emit event
        emit Abandoned();
    }
}
