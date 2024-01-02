// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

// import {Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
// TODO make this an import...
struct Split {
    // address to send funds to
    address payable recipient;
    // basis points to allocate to recipient (1-10_000)
    uint16 basisPoints;
}
struct SplitConfig {
    // address 0 to send funds to
    address payable recipient0;
    // basis points to allocate to recipient0 (1-10_000)
    uint256 basisPoints0;
    // address 1 to send funds to
    address payable recipient1;
    // basis points to allocate to recipient1 (1-10_000)
    uint256 basisPoints1;
    // address 2 to send funds to
    address payable recipient2;
    // basis points to allocate to recipient2 (1-10_000)
    uint256 basisPoints2;
}

interface ISplitAtomicV0Helpers {
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
     * @notice Indicates that the contract has been initialized.
     * @param type_ The type of the contract.
     */
    event Initialized(bytes32 type_);

    function initialize() external;

    function onReceiveETH(
        uint256 receivedValueInWei,
        SplitConfig calldata splitConfig
    ) external payable;

    function drainETH(SplitConfig calldata splitConfig) external;

    function drainERC20(
        address ERC20TokenAddres,
        SplitConfig calldata splitConfig
    ) external;
}
