// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterDAExpV0.sol";
import "./IFilteredMinterV3.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterDAExpV0 interface in order to
 * add support for manually setting project max invocations.
 * @author Art Blocks Inc.
 */
interface IFilteredMinterDAExpV2 is IFilteredMinterDAExpV0, IFilteredMinterV3 {

}
