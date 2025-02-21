// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ImmutableStringArray} from "../libs/v0.8.x/ImmutableStringArray.sol";

/**
 * @title ImmutableStringArrayMock
 * @notice Mock contract for testing ImmutableStringArray library functionality
 */
contract ImmutableStringArrayMock {
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    ImmutableStringArray.StringArray private stringArray;

    /**
     * @notice Store an array of strings
     * @param strings The array of strings to store
     */
    function store(string[] memory strings) external {
        stringArray.store(strings);
    }

    /**
     * @notice Get the length of the stored array
     * @return The number of strings stored
     */
    function length() external view returns (uint256) {
        return stringArray.length();
    }

    /**
     * @notice Get a string at a specific index
     * @param index The index to retrieve
     * @return The string at the given index
     */
    function get(uint256 index) external view returns (string memory) {
        return stringArray.get(index);
    }

    /**
     * @notice Get all stored strings
     * @return An array containing all stored strings
     */
    function getAll() external view returns (string[] memory) {
        return stringArray.getAll();
    }
}
