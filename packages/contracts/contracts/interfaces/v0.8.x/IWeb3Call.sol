// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

interface IWeb3Call {
    /**
     * @notice TokenParam struct defines the parameters for a given token.
     * @param key The key of the token parameter.
     * @param value The value of the token parameter.
     */
    struct TokenParam {
        string key;
        string value;
    }

    /**
     * @notice Get the token parameters for a given token.
     * If none are configured, the tokenParams should be empty.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @return tokenParams An array of token parameters for the queried token.
     */
    function getTokenParams(
        address coreContract,
        uint256 tokenId
    ) external view returns (TokenParam[] memory tokenParams);
}
