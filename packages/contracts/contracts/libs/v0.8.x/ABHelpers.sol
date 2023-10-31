// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Helpers Library
 * @notice This library contains helper functions for common operations in the
 * Art Blocks ecosystem of smart contracts.
 * @author Art Blocks Inc.
 */

library ABHelpers {
    uint256 constant ONE_MILLION = 1_000_000;

    /**
     * @notice Function to convert token id to project id.
     * @param tokenId The id of the token.
     */
    function tokenIdToProjectId(
        uint256 tokenId
    ) internal pure returns (uint256) {
        // int division properly rounds down
        // @dev unchecked because will never divide by zero
        unchecked {
            return tokenId / ONE_MILLION;
        }
    }

    /**
     * @notice Function to convert token id to token number.
     * @param tokenId The id of the token.
     */
    function tokenIdToTokenNumber(
        uint256 tokenId
    ) internal pure returns (uint256) {
        // mod returns remainder, which is the token number
        // @dev no way to disable mod zero check in solidity, so not unchecked
        return tokenId % ONE_MILLION;
    }

    /**
     * @notice Function to convert token id to token invocation.
     * @dev token invocation is the token number plus one, because token #0 is
     * invocation 1.
     * @param tokenId The id of the token.
     */
    function tokenIdToTokenInvocation(
        uint256 tokenId
    ) internal pure returns (uint256) {
        // mod returns remainder, which is the token number
        // @dev no way to disable mod zero check in solidity, so not unchecked
        return (tokenId % ONE_MILLION) + 1;
    }

    /**
     * @notice Function to convert project id and token number to token id.
     * @param projectId The id of the project.
     * @param tokenNumber The token number.
     */
    function tokenIdFromProjectIdAndTokenNumber(
        uint256 projectId,
        uint256 tokenNumber
    ) internal pure returns (uint256) {
        // @dev intentionally not unchecked to ensure overflow detection, which
        // would likley only occur in a malicious call
        return (projectId * ONE_MILLION) + tokenNumber;
    }
}
