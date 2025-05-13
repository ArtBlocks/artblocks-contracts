// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";

/**
 * @title InjectBlockHeightAndArtistProjectPaletteOverride
 * @author Art Blocks Inc.
 * @notice This hook injects the current block height into a token's PMPs.
 */
contract InjectBlockHeightAndArtistProjectPaletteOverride is
    AbstractPMPAugmentHook
{
    using Strings for uint256;

    // mapping of project to artist pmp overrides - empty string indicates no override
    mapping(address coreContract => mapping(uint256 projectId => mapping(string key => string value)))
        public artistProjectOverrides;

    /**
     * @notice Set a palette override for a project.
     * Only the artist of the project can set the palette override.
     * @dev intentionally does not emit events - artist overrides are intended to be not indexed.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     * @param palette The palette to set.
     */
    function artistSetProjectPaletteOverride(
        address coreContract,
        uint256 projectId,
        string memory palette
    ) external {
        // CHECKS
        _onlyArtist({
            caller: msg.sender,
            coreContract: coreContract,
            projectId: projectId
        });

        // EFFECTS
        artistProjectOverrides[coreContract][projectId]["Palette"] = palette;
    }

    /**
     * @notice Clear a palette override for a project.
     * Only the artist of the project can clear the palette override.
     * @dev intentionally does not emit events - artist overrides are intended to be not indexed.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     */
    function artistClearProjectPaletteOverride(
        address coreContract,
        uint256 projectId
    ) external {
        // CHECKS
        _onlyArtist({
            caller: msg.sender,
            coreContract: coreContract,
            projectId: projectId
        });

        // EFFECTS
        artistProjectOverrides[coreContract][projectId]["Palette"] = "";
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the block height into a tokens PMPs.
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
        // create a new tokenParam array with one extra element
        uint256 originalLength = tokenParams.length;
        uint256 newLength = originalLength + 1;
        augmentedTokenParams = new IWeb3Call.TokenParam[](newLength);

        // copy the original tokenParams into the new array
        for (uint256 i = 0; i < originalLength; i++) {
            string memory overrideValue = artistProjectOverrides[coreContract][
                tokenId
            ][tokenParams[i].key];

            // if the artist has set a project-level override for this key, use that instead of the original
            if (bytes(overrideValue).length > 0) {
                // use the artist's override
                augmentedTokenParams[i] = IWeb3Call.TokenParam({
                    key: tokenParams[i].key,
                    value: artistProjectOverrides[coreContract][tokenId][
                        tokenParams[i].key
                    ]
                });
            } else {
                // use the original
                augmentedTokenParams[i] = tokenParams[i];
            }
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

    /**
     * @notice Only the artist of the project can call the function.
     * @dev reverts if the caller is not the artist of the project.
     * @param caller The address of the caller.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     */
    function _onlyArtist(
        address caller,
        address coreContract,
        uint256 projectId
    ) internal view {
        if (
            caller !=
            IGenArt721CoreContractV3_Base(coreContract)
                .projectIdToArtistAddress(projectId)
        ) {
            revert("Only artist of project");
        }
    }
}
