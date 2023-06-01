// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "./MerkleLib.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Max Invocations Library
 * @notice This library manages the maximum invocation limits for Art Blocks
 * projects. It provides functionality for synchronizing, manually limiting, and
 * updating these limits, ensuring the integrity in relation to the core Art
 * Blocks contract, and managing updates upon token minting.
 * @dev Functions include `syncProjectMaxInvocationsToCore`,
 * `manuallyLimitProjectMaxInvocations`, and `purchaseEffectsInvocations`.
 * @author Art Blocks Inc.
 */

library MaxInvocationsLib {
    uint256 internal constant ONE_MILLION = 1_000_000;

    /**
     * @notice Data structure that holds max invocations project configuration.
     */
    struct MaxInvocationsProjectConfig {
        bool maxHasBeenInvoked;
        uint24 maxInvocations;
    }

    /**
     * @notice Syncs project's max invocations to core contract value.
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param projectConfigMapping The mapping that holds max invocations project configurations.
     * @return uint256 the updated max invocations.
     */
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

    /**
     * @notice Manually limits project's max invocations.
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocations The new max invocations limit.
     * @param projectConfigMapping The mapping that holds max invocations project configurations.
     */
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
        require(_maxInvocations <= maxInvocations, "Invalid max invocations");
        require(_maxInvocations >= invocations, "Invalid max invocations");

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

    /**
     * @notice Validate effects on invocations after purchase
     * @dev This function checks that the token invocation is less than or equal to
     * the local max invocations, and also updates the local maxHasBeenInvoked value.
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param _tokenId The id of the token.
     * @param projectConfigMapping The mapping that holds max invocations project configurations.
     */
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
                "Max invocations reached"
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
