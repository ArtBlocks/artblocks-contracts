// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title InjectTokenOwnerEthBalance
 * @author Art Blocks Inc.
 * @notice This hook appends the token owner's ETH balance, in wei, to a tokens PMPs.
 */
contract InjectTokenOwnerEthBalance is AbstractPMPAugmentHook {
    using Strings for uint256;

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the token owner's ETH balance into a tokens PMPs.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address coreContract,
        uint256 tokenId,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        // create a new tokenParam array with one extra element
        uint256 originalLength = tokenParams.length;
        uint256 newLength = originalLength + 1;
        augmentedTokenParams = new IWeb3Call.TokenParam[](newLength);

        // copy the original tokenParams into the new array
        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        // get + inject the token owner into the new array
        address tokenOwner = IERC721(coreContract).ownerOf(tokenId);
        uint256 tokenOwnerEthBalanceInWei = address(tokenOwner).balance;
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "tokenOwnerEthBalance",
            value: tokenOwnerEthBalanceInWei.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }
}
