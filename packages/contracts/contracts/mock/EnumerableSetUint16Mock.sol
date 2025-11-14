// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {EnumerableSetUint16} from "../libs/v0.8.x/EnumerableSetUint16.sol";

/**
 * @title EnumerableSetUint16Mock
 * @author Art Blocks Inc.
 * @notice Mock contract for testing EnumerableSetUint16 library
 */
contract EnumerableSetUint16Mock {
    using EnumerableSetUint16 for EnumerableSetUint16.Uint16Set;

    EnumerableSetUint16.Uint16Set private _set;

    /**
     * @dev Add a value to the set. Returns true if added, false if already present.
     */
    function add(uint16 value) external returns (bool) {
        return _set.add(value);
    }

    /**
     * @dev Remove a value from the set. Returns true if removed, false if not present.
     */
    function remove(uint16 value) external returns (bool) {
        return _set.remove(value);
    }

    /**
     * @dev Check if a value is in the set.
     */
    function contains(uint16 value) external view returns (bool) {
        return _set.contains(value);
    }

    /**
     * @dev Get the number of values in the set.
     */
    function length() external view returns (uint256) {
        return _set.length();
    }

    /**
     * @dev Get the value at a specific index.
     */
    function at(uint256 index) external view returns (uint16) {
        return _set.at(index);
    }

    /**
     * @dev Get all values in the set.
     */
    function values() external view returns (uint256[] memory) {
        return _set.values();
    }

    /**
     * @dev Add multiple values at once for testing.
     */
    function addMultiple(uint16[] calldata valuesToAdd) external {
        for (uint256 i = 0; i < valuesToAdd.length; i++) {
            _set.add(valuesToAdd[i]);
        }
    }

    /**
     * @dev Remove multiple values at once for testing.
     */
    function removeMultiple(uint16[] calldata valuesToRemove) external {
        for (uint256 i = 0; i < valuesToRemove.length; i++) {
            _set.remove(valuesToRemove[i]);
        }
    }

    /**
     * @dev Clear all values from the set.
     */
    function clear() external {
        uint256 len = _set.length();
        for (uint256 i = 0; i < len; i++) {
            uint16 value = _set.at(0);
            _set.remove(value);
        }
    }
}
