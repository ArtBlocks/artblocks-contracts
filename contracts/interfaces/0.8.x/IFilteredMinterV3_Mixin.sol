// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV2.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface adds any events and functions required to support
 * a minter intended to integrate with a V3 flagship or V3 engine contract.
 * It does not extend any other interface.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterV3_Mixin {
    // Function that returns if a minter is configured to integrate with a V3 flagship or V3 engine contract.
    // Returns true only if the minter is configured to integrate with an engine contract.
    function isEngine() external returns (bool isEngine);
}
