// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

/**
 * @title InjectBlockHeightAndNumOwnedProjectTokens
 * @author Art Blocks Inc.
 * @notice This hook injects the current block height into a token's PMPs.
 * Also injects the quantity of token's owner's owned tokens from a
 * reference Art Blocks project.
 */
contract InjectBlockHeightAndNumOwnedProjectTokens is AbstractPMPAugmentHook {
    using Strings for uint256;

    /// @notice The address of the reference contract.
    address public immutable referenceContract;
    /// @notice The projectId of the reference project.
    uint256 public immutable referenceProjectId;
    /// @notice The number of project tokens.
    uint256 public immutable numReferenceTokens;

    event ReferenceContractSet(address referenceContract);
    event ReferenceProjectIdSet(uint256 referenceProjectId);
    event NumReferenceTokensSet(uint256 numReferenceTokens);

    /**
     * @notice Populates the referenceContract and referenceProjectId immutable variables.
     * @param referenceContract_ The address of the project contract.
     * @param referenceProjectId_ The projectId of the project.
     * @param numReferenceTokens_ The number of project tokens.
     */
    constructor(
        address referenceContract_,
        uint256 referenceProjectId_,
        uint256 numReferenceTokens_
    ) {
        // @dev keep iteration gas cost manageable by limiting numReferenceTokens
        require(
            numReferenceTokens_ <= 1000,
            "numReferenceTokens must be less than or equal to 1000"
        );
        // assign immutable variables
        referenceContract = referenceContract_;
        referenceProjectId = referenceProjectId_;
        numReferenceTokens = numReferenceTokens_;

        // emit events
        emit ReferenceContractSet(referenceContract_);
        emit ReferenceProjectIdSet(referenceProjectId_);
        emit NumReferenceTokensSet(numReferenceTokens_);
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the block height into a tokens PMPs.
     * Also injects the quantity of token's owner's owned reference tokens.
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

        // get + inject the block height and owned reference tokens into the new array
        uint256 currentBlock = block.number;
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "BlockNumber",
            value: currentBlock.toString()
        });

        // get + inject the owned reference tokens into the new array
        address tokenOwner = IERC721(coreContract).ownerOf(tokenId);
        uint256 ownedReferenceTokens = _getNumberOwnedReferenceTokens(
            tokenOwner
        );
        augmentedTokenParams[originalLength + 1] = IWeb3Call.TokenParam({
            key: "NumOwnedReferenceTokens",
            value: ownedReferenceTokens.toString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    /**
     * @notice Gets the number of owned reference tokens for a given token.
     * @param tokenOwner The owner of the token.
     * @return The number of owned reference tokens.
     */
    function _getNumberOwnedReferenceTokens(
        address tokenOwner
    ) internal view returns (uint256) {
        uint256 ownedReferenceTokens = 0;

        // iterate over the number of reference tokens
        // @dev acknowledge iteration gas cost in view function - see constructor for limit of numReferenceTokens
        for (uint256 i = 0; i < numReferenceTokens; i++) {
            // get the reference token id
            uint256 referenceTokenId = ABHelpers
                .tokenIdFromProjectIdAndTokenNumber({
                    projectId: referenceProjectId,
                    tokenNumber: i
                });

            if (
                IERC721(referenceContract).ownerOf(referenceTokenId) ==
                tokenOwner
            ) {
                ownedReferenceTokens++;
            }
        }
        return ownedReferenceTokens;
    }
}
