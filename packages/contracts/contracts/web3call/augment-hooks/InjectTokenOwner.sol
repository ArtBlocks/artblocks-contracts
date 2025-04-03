// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title Abstract Web3Call contract
 * @author Art Blocks Inc.
 * @notice This abstract can be inherited by any contract that wants to implement the Web3Call interface.
 * It indicates support for the IWeb3Call interface via ERC165 interface detection, and ensures that all
 * child contracts implement the required IWeb3Call functions.
 */
contract InjectTokenOwner is AbstractPMPAugmentHook {
    using Strings for address;

    /**
     * @notice Augment the token parameters for a given token.
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
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "tokenOwner",
            value: tokenOwner.toHexString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }
}
