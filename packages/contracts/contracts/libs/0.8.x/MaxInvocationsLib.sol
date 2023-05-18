// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "./MerkleLib.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Max Invocations Library
 * @notice [TO FILL OUT]
 * @author Art Blocks Inc.
 */

library MaxInvocationsLib {
    uint256 constant ONE_MILLION = 1_000_000;

    struct MaxInvocationsProjectConfig {
        bool maxHasBeenInvoked;
        uint24 maxInvocations;
    }

    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract,
        mapping(address => mapping(uint256 => MaxInvocationsProjectConfig))
            storage projectConfigMapping
    ) internal returns (uint256) {
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = IGenArt721CoreContractV3_Base(
            _coreContract
        ).projectStateData(_projectId);
        // update storage with results
        projectConfigMapping[_coreContract][_projectId].maxInvocations = uint24(
            maxInvocations
        );

        // We need to ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        // This synced value of maxInvocations from the core contract will always be greater
        // than or equal to the previous value of maxInvocations stored locally.
        projectConfigMapping[_coreContract][_projectId].maxHasBeenInvoked =
            invocations == maxInvocations;
        return maxInvocations;
    }

    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint256 _maxInvocations,
        mapping(address => mapping(uint256 => MaxInvocationsProjectConfig))
            storage projectConfigMapping
    ) internal {
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = IGenArt721CoreContractV3_Base(
            _coreContract
        ).projectStateData(_projectId);
        require(
            _maxInvocations <= maxInvocations,
            "Cannot increase project max invocations above core contract set project max invocations"
        );
        require(
            _maxInvocations >= invocations,
            "Cannot set project max invocations to less than current invocations"
        );

        // EFFECTS
        // update storage with results
        projectConfigMapping[_coreContract][_projectId].maxInvocations = uint24(
            _maxInvocations
        );
        // We need to ensure maxHasBeenInvoked is correctly set after manually setting the
        // local maxInvocations value.
        projectConfigMapping[_coreContract][_projectId].maxHasBeenInvoked =
            invocations == _maxInvocations;
    }

    function purchaseEffectsInvocations(
        uint256 _projectId,
        address _coreContract,
        uint256 _tokenId,
        mapping(address => mapping(uint256 => MaxInvocationsProjectConfig))
            storage projectConfigMapping
    ) internal {
        // invocation is token number plus one, and will never overflow due to
        // limit of 1e6 invocations per project. block scope for gas efficiency
        // (i.e. avoid an unnecessary var initialization to 0).
        unchecked {
            uint256 tokenInvocation = (_tokenId % ONE_MILLION) + 1;
            uint256 localMaxInvocations = projectConfigMapping[_coreContract][
                _projectId
            ].maxInvocations;
            // handle the case where the token invocation == minter local max
            // invocations occurred on a different minter, and we have a stale
            // local maxHasBeenInvoked value returning a false negative.
            // @dev this is a CHECK after EFFECTS, so security was considered
            // in detail here.
            require(
                tokenInvocation <= localMaxInvocations,
                "Maximum invocations reached"
            );
            // in typical case, update the local maxHasBeenInvoked value
            // to true if the token invocation == minter local max invocations
            // (enables gas efficient reverts after sellout)
            if (tokenInvocation == localMaxInvocations) {
                projectConfigMapping[_coreContract][_projectId]
                    .maxHasBeenInvoked = true;
            }
        }
    }
}
