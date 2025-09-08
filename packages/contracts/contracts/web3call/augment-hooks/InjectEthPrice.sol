// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

// Define the Chainlink interface directly for this example instead of importing it
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title Abstract Web3Call contract
 * @author Art Blocks Inc.
 * @notice This abstract can be inherited by any contract that wants to implement the Web3Call interface.
 * It indicates support for the IWeb3Call interface via ERC165 interface detection, and ensures that all
 * child contracts implement the required IWeb3Call functions.
 */
abstract contract InjectEthPrice is AbstractPMPAugmentHook {
    AggregatorV3Interface internal dataFeed;
    /**
     * @notice From the Chainlink documentation:
     * Network: Mainnet
     * Aggregator: ETH/USD
     * Address: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
     */
    constructor() {
        dataFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    }

    /**
     * @notice Augment the token parameters for a given token.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address,
        uint256,
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

        // Get the latest ETH price in USD from Chainlink
        (
            ,
            /* uint80 roundId */ int256 answer /*uint256 startedAt*/ /*uint256 updatedAt*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = dataFeed.latestRoundData();

        // Add the ETH price as a new parameter
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "ethPriceUSD",
            value: _formatPriceData(answer)
        });
        return augmentedTokenParams;
    }

    /**
     * @dev Converts a Chainlink price answer to a 2-decimal fixed-point string.
     * @param priceData The price from Chainlink (with 8 decimal places)
     * @return formattedPriceData The formatted price string to 2 decimal places
     */
    function _formatPriceData(
        int256 priceData
    ) internal pure returns (string memory) {
        require(priceData > 0, "Negative price");
        uint256 uintPriceData = uint256(priceData);

        // convert from 8 decimals to 2 decimals by dividing by 1e6
        uint256 withTwoDecimals = uintPriceData / 1e6;
        string memory integerPart = Strings.toString(withTwoDecimals / 100);
        string memory decimalPart = Strings.toString(withTwoDecimals % 100);

        // Pad the decimal part with a leading zero if needed
        if (bytes(decimalPart).length == 1) {
            decimalPart = string.concat("0", decimalPart);
        }

        return string.concat(integerPart, ".", decimalPart);
    }
}
