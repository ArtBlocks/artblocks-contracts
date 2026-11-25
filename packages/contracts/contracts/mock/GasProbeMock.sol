// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity 0.8.22;

/**
 * @title GasProbeMock
 * @notice Measures the gas a static call consumes, for scripts that compare view-call costs
 * (e.g. generator renders) against RPC eth_call gas caps without an estimateGas binary search.
 */
contract GasProbeMock {
    function probe(
        address target,
        bytes calldata data
    ) external view returns (uint256 gasUsed, bool ok, uint256 returnLength) {
        uint256 gasBefore = gasleft();
        bytes memory result;
        (ok, result) = target.staticcall(data);
        gasUsed = gasBefore - gasleft();
        returnLength = result.length;
    }
}
