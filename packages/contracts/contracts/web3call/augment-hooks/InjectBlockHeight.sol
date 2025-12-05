// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title InjectBlockHeight
 * @author Art Blocks Inc.
 * @notice This hook injects the current block height into a token's PMPs.
 */
contract InjectBlockHeight is AbstractPMPAugmentHook {
    using Strings for uint256;

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the block height into a tokens PMPs.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address /* coreContract */,
        uint256 /* tokenId */,
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

        // get + inject the block height into the new array
        uint256 currentBlock = block.number;
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "blockHeight",
            value: currentBlock.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }
}
