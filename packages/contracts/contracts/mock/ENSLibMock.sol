// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {ENSLib} from "../libs/v0.8.x/ENSLib.sol";

/**
 * @title ENSLibMock
 * @notice Mock contract to expose ENSLib functions for testing
 * @dev This contract is only used for testing and should not be deployed in production
 * @author Art Blocks Inc.
 */
contract ENSLibMock {
    /**
     * @notice Wrapper for ENSLib.getEnsName to enable testing
     * @param ownerAddress The address to resolve the ENS name for
     * @return The ENS name for the address, or empty string if not found/invalid
     */
    function getEnsName(
        address ownerAddress
    ) external view returns (string memory) {
        return ENSLib.getEnsName(ownerAddress);
    }
}
