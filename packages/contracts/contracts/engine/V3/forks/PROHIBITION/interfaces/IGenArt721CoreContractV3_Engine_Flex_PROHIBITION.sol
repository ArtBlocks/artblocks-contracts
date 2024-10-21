// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0_PROHIBITION.sol";
import "../../../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine_Flex_PreV3p2.sol";

/**
 * @title This interface is intended to house interface items that are common
 * across all GenArt721CoreContractV3 Engine Flex and derivative implementations.
 * @author Art Blocks Inc.
 */
interface IGenArt721CoreContractV3_Engine_Flex_PROHIBITION is
    IGenArt721CoreContractV3_Engine_Flex_PreV3p2
{
    /**
     * Function determining if _sender is allowed to call function with
     * selector _selector on contract `_contract` for project `_projectId`.
     * Intended to be used with peripheral contracts such as minters, as well
     * as internally by the core contract itself.
     */
    function adminACLAllowed(
        address _sender,
        address _contract,
        bytes4 _selector,
        uint256 _projectId
    ) external returns (bool);
}
