// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

struct Split {
    // address to send funds to
    address payable recipient;
    // basis points to allocate to recipient (1-10_000)
    uint16 basisPoints;
}

interface ISplitAtomicV0 {
    /**
     * @notice Indicates that the contract has been initialized.
     */
    event Initialized();

    /**
     * @notice Initializes the contract with the provided `splits`.
     * Only callable once.
     * @param splits Splits to configure the contract with. Must add up to
     * 10_000 BPS.
     */
    function initialize(Split[] calldata splits) external;

    /**
     * @notice Drains the contract's balance to the configured `splits`.
     * Reverts if not initialized.
     */
    function drainETH() external;

    /**
     * @notice Drains the contract's balance of an input ERC20 token to the
     * configured `splits`.
     * @param ERC20TokenAddress The address of the ERC20 token to split.
     */
    function drainERC20(address ERC20TokenAddress) external;

    /**
     * @notice Returns the configured `splits`.
     */
    function getSplits() external view returns (Split[] memory);
}
