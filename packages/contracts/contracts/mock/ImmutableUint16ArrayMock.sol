// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ImmutableUint16Array} from "../libs/v0.8.x/ImmutableUint16Array.sol";

/**
 * @title ImmutableUint16ArrayMock
 * @notice Mock contract for testing ImmutableUint16Array library functionality
 */
contract ImmutableUint16ArrayMock {
    using ImmutableUint16Array for ImmutableUint16Array.Uint16Array;

    ImmutableUint16Array.Uint16Array private uint16Array;

    /**
     * @notice Store an array of uint16 values
     * @param values The array of uint16 values to store
     */
    function store(uint16[] memory values) external {
        uint16Array.store(values);
    }

    /**
     * @notice Clear the stored array
     */
    function clear() external {
        uint16Array.clear();
    }

    /**
     * @notice Check if the array is empty
     * @return Whether the array is empty
     */
    function isEmpty() external view returns (bool) {
        return uint16Array.isEmpty();
    }

    /**
     * @notice Get the length of the stored array
     * @return The number of uint16 values stored
     */
    function length() external view returns (uint256) {
        return uint16Array.length();
    }

    /**
     * @notice Get a uint16 value at a specific index
     * @param index The index to retrieve
     * @return The uint16 value at the given index
     */
    function get(uint256 index) external view returns (uint16) {
        return uint16Array.get(index);
    }

    /**
     * @notice Get all stored uint16 values
     * @return An array containing all stored uint16 values
     */
    function getAll() external view returns (uint16[] memory) {
        return uint16Array.getAll();
    }
}
