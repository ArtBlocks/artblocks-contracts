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
     * @param type_ The type of the contract.
     */
    event Initialized(bytes32 type_);

    /**
     * @notice Indicates that the contract's balance manually was drained of
     * ETH.
     */
    event DrainedETH();

    /**
     * @notice Indicates that the contract's balance manually was drained of
     * ERC20 token at address `ERC20TokenAddress`.
     * @param ERC20TokenAddress The address of the ERC20 token that was
     * drained.
     */
    event DrainedERC20(address ERC20TokenAddress);

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

    /**
     * @notice Indicates the type of the contract, e.g. `SplitAtomicV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
