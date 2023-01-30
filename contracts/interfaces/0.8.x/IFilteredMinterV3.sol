// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV2.sol";
import "./IFilteredMinterV3_Mixin.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV2 interface to support
 * emitting an event and exposing a getter function for if a minter is
 * configured to integrate with a V3 flagship or V3 engine contract, `isEngine`.
 * Additional funcitonality is provided by the IFilteredMinterV3_Mixin interface.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterV3 is IFilteredMinterV2, IFilteredMinterV3_Mixin {

}
