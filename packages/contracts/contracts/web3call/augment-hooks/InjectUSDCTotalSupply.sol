// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IERC20} from "@openzeppelin-5.0/contracts/interfaces/IERC20.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title InjectUSDCTotalSupply
 * @author Art Blocks Inc.
 * @notice This hook appends the total supply of USDC, in wei, to a tokens PMPs.
 */
contract InjectUSDCTotalSupply is AbstractPMPAugmentHook {
    using Strings for uint256;

    address public immutable usdcAddress;

    /**
     * @notice Constructor.
     * @param _usdcAddress The address of the USDC contract.
     * For mainnet, this is 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
     */
    constructor(address _usdcAddress) {
        usdcAddress = _usdcAddress;
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the token owner's ETH balance into a tokens PMPs.
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

        // get + inject the total supply of USDC
        uint256 totalSupplyUSDC = IERC20(usdcAddress).totalSupply();
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "totalSupplyUSDC",
            value: totalSupplyUSDC.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }
}
