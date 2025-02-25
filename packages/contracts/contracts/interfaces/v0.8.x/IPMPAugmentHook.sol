// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IPMPV0} from "./IPMPV0.sol";
import {IWeb3Call} from "./IWeb3Call.sol";

interface IPMPAugmentHook {
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
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams);
}
