// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {Split} from "./ISplitAtomicV0.sol";

interface ISplitAtomicFactoryV0 {
    event ImplementationSet(address indexed implementation);
    event SplitAtomicCreated(address indexed splitAtomic);

    /**
     * @notice Initializes the contract with the provided `splits`.
     * Only callable once.
     * @param splits Splits to configure the contract with. Must add up to
     * 10_000 BPS.
     * @return splitAtomic The address of the newly created split atomic
     * contract
     */
    function createSplit(
        Split[] calldata splits
    ) external returns (address splitAtomic);

    /**
     * @notice The implementation contract that is used when creating new
     * split atomic contracts.
     */
    function splitAtomicImplementation() external view returns (address);
}
