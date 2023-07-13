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

    function tokenIdToProjectId(
        uint256 _tokenId
    ) internal pure returns (uint256) {
        // int division properly rounds down
        return _tokenId / ONE_MILLION;
    }

    function tokenIdToTokenNumber(
        uint256 _tokenId
    ) internal pure returns (uint256) {
        // mod returns remainder, which is the token number
        return _tokenId % ONE_MILLION;
    }

    function tokenIdFromProjectIdAndTokenNumber(
        uint256 _projectId,
        uint256 _tokenNumber
    ) internal pure returns (uint256) {
        return (_projectId * ONE_MILLION) + _tokenNumber;
    }
}
