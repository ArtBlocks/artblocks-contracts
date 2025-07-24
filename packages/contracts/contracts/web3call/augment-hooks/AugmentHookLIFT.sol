// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";

interface IGenArt721V0_Minimal {
    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory);
}

/**
 * @title AugmentHookLIFT
 * @author Art Blocks Inc.
 * @notice This hook verifies ownership of any custom squiggle PostParam setting,
 * and injects the squiggle's token hash into the token's PMPs if ownership is passed.
 * It supports delegate.xyz V1 and V2, and also allows squiggle 9999 for any address that
 * signed the squiggle Relic contract on eth mainnet: 0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80
 */
contract AugmentHookLIFT is AbstractPMPAugmentHook {
    using Strings for uint256;

    address public constant SQUIGGLE_GENART_V0_ADDRESS =
        0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a;
    uint256 private constant OOB_SQUIGGLE_TOKEN_ID = 1000000;

    /**
     * @notice Augment the token parameters for a given token.
     * Augments the token parameters as described in the contract natspec doc.
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
        // create a new augmentedTokenParams array with maximum length of
        // input tokenParams + 1 extra element for the squiggle's token hash
        uint256 originalLength = tokenParams.length;
        uint256 augmentedMaxLength = originalLength + 1;
        augmentedTokenParams = new IWeb3Call.TokenParam[](augmentedMaxLength);

        // allocate squiggle token id to a variable (may or may not be configured)
        uint256 squiggleTokenId = OOB_SQUIGGLE_TOKEN_ID; // default to out of bounds if not configured

        // copy the original tokenParams into the new array, skipping the squiggle token id
        uint256 j = 0;
        for (uint256 i = 0; i < originalLength; i++) {
            if (
                keccak256(bytes(tokenParams[i].key)) ==
                keccak256(bytes("squiggleTokenId"))
            ) {
                squiggleTokenId = parseUint(tokenParams[i].value);
                // skip the squiggle token id
                continue;
            } else {
                augmentedTokenParams[j++] = tokenParams[i];
            }
        }

        // if the squiggle token id is out of bounds, return the original tokenParams (no augmentation)
        if (squiggleTokenId == OOB_SQUIGGLE_TOKEN_ID) {
            return tokenParams;
        }

        // verify ownership of the squiggle token id, and return the new array, but shortened to length of j
        {
            address liftOwner = IERC721(coreContract).ownerOf(tokenId);
            if (
                !isOwnerOrDelegate({
                    squiggleTokenId: squiggleTokenId,
                    liftOwner: liftOwner
                })
            ) {
                // shorten the new array to length of j
                assembly {
                    mstore(augmentedTokenParams, j)
                }
                return augmentedTokenParams;
            }
        }

        // ownership is passed, so we can inject the squiggle's token hash into the new array
        bytes32 squiggleTokenHash = IGenArt721V0_Minimal(
            SQUIGGLE_GENART_V0_ADDRESS
        ).showTokenHashes(squiggleTokenId)[0];

        // inject the squiggles ID and hash into the new array
        augmentedTokenParams[j++] = IWeb3Call.TokenParam({
            key: "squiggleTokenId",
            value: squiggleTokenId.toString()
        });
        augmentedTokenParams[j] = IWeb3Call.TokenParam({
            key: "squiggleTokenHash",
            value: uint256(squiggleTokenHash).toHexString()
        });

        // @dev no need to reduce the array length, since we guaranteed to be max length in this case

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    function isOwnerOrDelegate(
        uint256 squiggleTokenId,
        address liftOwner
    ) internal view returns (bool) {
        address squiggleOwner = IERC721(SQUIGGLE_GENART_V0_ADDRESS).ownerOf(
            squiggleTokenId
        );

        // if the owner is the same, return true
        if (squiggleOwner == liftOwner) {
            return true;
        }

        // if the liftOwner is delegate of vault that owns squiggle(delegate.xyz V1 or V2), return true
        // TODO: implement this

        // otherwise, return false
        return false;
    }

    function parseUint(string memory s) internal pure returns (uint256 result) {
        bytes memory b = bytes(s);
        for (uint i = 0; i < b.length; i++) {
            // Require each character to be 0-9
            require(b[i] >= 0x30 && b[i] <= 0x39, "Invalid character");
            result = result * 10 + (uint8(b[i]) - 48);
        }
    }
}
