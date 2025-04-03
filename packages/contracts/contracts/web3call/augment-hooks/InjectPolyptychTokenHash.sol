// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title InjectPolyptychTokenHash
 * @author Art Blocks Inc.
 * @notice This hook injects the hash of a token on a different project into a tokens PMPs.
 */
contract InjectPolyptychTokenHash is AbstractPMPAugmentHook {
    using Strings for uint256;

    /**
     * @notice The projectId of the project to inject the hash from.
     */
    uint256 public immutable sourceProjectId;
    /**
     * @notice the core contract address of the project to inject the hash from.
     */
    address public immutable sourceCoreContract;

    /**
     * @notice Constructor.
     * @param _sourceCoreContract The address of the core contract to inject the hash from.
     * @param _sourceProjectId The projectId of the project to inject the hash from.
     */
    constructor(address _sourceCoreContract, uint256 _sourceProjectId) {
        sourceCoreContract = _sourceCoreContract;
        sourceProjectId = _sourceProjectId;
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the hash of a token on a different project into a tokens PMPs.
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

        // get + inject the source token hash into the new array
        uint256 tokenNumber = ABHelpers.tokenIdToTokenNumber(tokenId);
        uint256 sourceTokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: sourceProjectId,
            tokenNumber: tokenNumber
        });
        bytes32 sourceTokenHash = IGenArt721CoreContractV3_Base(
            sourceCoreContract
        ).tokenIdToHash(sourceTokenId);

        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "sourceTokenHash",
            value: uint256(sourceTokenHash).toHexString()
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }
}
