// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./IFilteredMinterV2.sol";

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV2 interface to support
 * emitting an event and exposing a getter function for if a minter is
 * configured to integrate with a V3 flagship or V3 engine contract, `isEngine`
 * @author Art Blocks Inc.
 */
interface IFilteredMinterV3 is IFilteredMinterV2 {
    /**
     * @notice Emitted when a minter is configured to integrate with a V3 flagship or V3 engine contract
     */
    event ConfiguredIsEngine(bool indexed isEngine);

    // Function that returns if a minter is configured to integrate with a V3 flagship or V3 engine contract.
    // Returns true only if the minter is configured to integrate with an engine contract.
    function isEngine() external returns (bool isEngine);
}
