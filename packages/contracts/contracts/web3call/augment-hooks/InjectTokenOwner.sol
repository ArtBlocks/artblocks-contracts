// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";

/**
 * @title Abstract Web3Call contract
 * @author Art Blocks Inc.
 * @notice This abstract can be inherited by any contract that wants to implement the Web3Call interface.
 * It indicates support for the IWeb3Call interface via ERC165 interface detection, and ensures that all
 * child contracts implement the required IWeb3Call functions.
 */
abstract contract InjectTokenOwner is AbstractPMPAugmentHook {
    /// @dev Constant for the applicable token param
    bytes32 internal constant TOKEN_OWNER_KEY = keccak256(bytes("token_owner"));

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
        augmentedTokenParams = new IWeb3Call.TokenParam[](tokenParams.length);

        address owner = IERC721(coreContract).ownerOf(tokenId);
        string memory ownerAddress = Strings.toHexString(owner);
        for (uint256 i = 0; i < tokenParams.length; i++) {
            string memory key = tokenParams[i].key;
            string memory value = tokenParams[i].value;

            bytes32 keyHash = keccak256(bytes(key));

            // check if this parameter should be augmented with owner info
            if (keyHash == TOKEN_OWNER_KEY) {
                value = ownerAddress;
            }

            augmentedTokenParams[i] = IWeb3Call.TokenParam({
                key: key,
                value: value
            });
        }
        return augmentedTokenParams;
    }
}
