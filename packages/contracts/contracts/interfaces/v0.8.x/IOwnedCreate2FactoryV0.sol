// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {EngineConfiguration} from "./IGenArt721CoreContractV3_Engine.sol";

interface IOwnedCreate2FactoryV0 {
    /**
     * @notice This contract was deployed.
     */
    event Deployed();
    /**
     * @notice New curated core contract was created.
     * @param newContract new contract
     */
    event ContractCreated(address indexed newContract);

    /**
     * @notice Drains the contract's balance to the `recipient`.
     * @param recipient The address to send funds to.
     * Only callable by the owner.
     */
    function drainETH(address payable recipient) external;

    /**
     * @notice Drains the contract's balance of an input ERC20 token to
     * the `recipient`.
     * @param ERC20TokenAddress The address of the ERC20 token to withdraw.
     * @param recipient The address to send ERC20 tokens to.
     * Only callable by the owner.
     */
    function drainERC20(address ERC20TokenAddress, address recipient) external;

    /**
     * @notice Indicates the type of the contract, e.g. `EngineFactoryV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
