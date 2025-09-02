// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

/**
 * @title InjectBlockHeightAndOwnedForecast
 * @author Art Blocks Inc.
 * @notice This hook injects the current block height into a token's PMPs.
 * Also injects the quantity of token's owner's owned Forecast tokens.
 */
contract InjectBlockHeightAndOwnedForecast is AbstractPMPAugmentHook {
    using Strings for uint256;

    /// @notice The address of the Forecast contract.
    address public immutable forecastContract;
    /// @notice The projectId of the Forecast project.
    uint256 public immutable forecastProjectId;
    /// @notice The number of forecast tokens.
    uint256 public immutable numForecastTokens;

    event ForecastContractSet(address forecastContract);
    event ForecastProjectIdSet(uint256 forecastProjectId);
    event NumForecastTokensSet(uint256 numForecastTokens);

    /**
     * @notice Populates the forecastContract and forecastProjectId immutable variables.
     * @param forecastContract_ The address of the Forecast contract.
     * @param forecastProjectId_ The projectId of the Forecast project.
     * @param numForecastTokens_ The number of forecast tokens.
     */
    constructor(
        address forecastContract_,
        uint256 forecastProjectId_,
        uint256 numForecastTokens_
    ) {
        // @dev keep iteration gas cost manageable by limiting numForecastTokens
        require(
            numForecastTokens_ <= 365,
            "numForecastTokens must be less than or equal to 365"
        );
        // assign immutable variables
        forecastContract = forecastContract_;
        forecastProjectId = forecastProjectId_;
        numForecastTokens = numForecastTokens_;

        // emit events
        emit ForecastContractSet(forecastContract_);
        emit ForecastProjectIdSet(forecastProjectId_);
        emit NumForecastTokensSet(numForecastTokens_);
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the block height into a tokens PMPs.
     * Also injects the quantity of token's owner's owned Forecast tokens.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
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
        // create a new tokenParam array with two extra elements
        uint256 originalLength = tokenParams.length;
        uint256 newLength = originalLength + 2;
        augmentedTokenParams = new IWeb3Call.TokenParam[](newLength);

        // copy the original tokenParams into the new array
        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        // get + inject the block height and owned forecast into the new array
        uint256 currentBlock = block.number;
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "BlockNumber",
            value: currentBlock.toString()
        });

        // get + inject the owned forecast into the new array
        address tokenOwner = IERC721(coreContract).ownerOf(tokenId);
        uint256 ownedForecast = _getNumberOwnedForecast(tokenOwner);
        augmentedTokenParams[originalLength + 1] = IWeb3Call.TokenParam({
            key: "NumOwnedForecast",
            value: ownedForecast.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    /**
     * @notice Gets the number of owned Forecast tokens for a given token.
     * @param tokenOwner The owner of the token.
     * @return The number of owned Forecast tokens.
     */
    function _getNumberOwnedForecast(
        address tokenOwner
    ) internal view returns (uint256) {
        uint256 ownedForecast = 0;

        // iterate over the number of forecast tokens
        // @dev acknowledge iteration gas cost in view function - see constructor for limit of numForecastTokens
        for (uint256 i = 0; i < numForecastTokens; i++) {
            // get the forecast token id
            uint256 forecastTokenId = ABHelpers
                .tokenIdFromProjectIdAndTokenNumber({
                    projectId: forecastProjectId,
                    tokenNumber: i
                });

            if (
                IERC721(forecastContract).ownerOf(forecastTokenId) == tokenOwner
            ) {
                ownedForecast++;
            }
        }
        return ownedForecast;
    }
}
