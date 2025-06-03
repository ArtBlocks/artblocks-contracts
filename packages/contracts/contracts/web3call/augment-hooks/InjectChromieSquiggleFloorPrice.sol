// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

// @dev This is a simplified interface for the Uniswap V2 Pair contract.
interface IUniswapV2Pair {
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function token0() external view returns (address);

    function token1() external view returns (address);
}

/**
 * @title InjectChromieSquiggleFloorPrice
 * @author Art Blocks Inc.
 * @notice This hook appends the floor price of Chromie Squiggle, in wei, to a tokens PMPs.
 */
contract InjectChromieSquiggleFloorPrice is AbstractPMPAugmentHook {
    using Strings for uint256;

    address public immutable nftxVaultPoolSquiggleWeth;

    /**
     * @notice Constructor.
     * @param _nftxVaultPoolSquiggleWeth The address of the NFTX vault for Chromie Squiggle.
     * For mainnet, this is 0x698AbbBC986C59D02941E18BC96fe2396493339B
     */
    constructor(address _nftxVaultPoolSquiggleWeth) {
        nftxVaultPoolSquiggleWeth = _nftxVaultPoolSquiggleWeth;
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the spot price of Chromie Squiggle in WETH, based on the NFTX vault pool.
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

        // get + inject the floor price of Chromie Squiggle
        uint256 floorPriceChromieSquiggle = _getSquiggleFloorPriceInWETH();

        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "floorPriceChromieSquiggle",
            value: floorPriceChromieSquiggle.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    function _getSquiggleFloorPriceInWETH()
        internal
        view
        returns (uint256 priceInWei)
    {
        IUniswapV2Pair pair = IUniswapV2Pair(nftxVaultPoolSquiggleWeth);

        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        address token0 = pair.token0(); // expected to be SQGL

        // Price of 1 SquiggleVault token in WETH = reserve1 / reserve0
        // We'll scale result to return value in wei (1e18)

        if (token0 == 0x8d137e3337eb1B58A222Fef2B2Cc7C423903d9cf) {
            // token0 is SQGL, token1 is WETH
            priceInWei = (uint256(reserve1) * 1e18) / reserve0;
        } else {
            // token1 is SQGL, token0 is WETH
            priceInWei = (uint256(reserve0) * 1e18) / reserve1;
        }
    }
}
