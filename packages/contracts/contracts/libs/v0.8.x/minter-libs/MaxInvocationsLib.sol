// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "./MerkleLib.sol";

import "@openzeppelin-4.7/contracts/utils/math/Math.sol";

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
     * @param maxInvocationsProjectConfig Data structure that holds max invocations project configuration.
     * @return uint256 the updated max invocations.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract,
        MaxInvocationsProjectConfig storage maxInvocationsProjectConfig
    ) internal returns (uint256) {
        uint256 maxInvocations;
        uint256 invocations;
        (invocations, maxInvocations, , , , ) = IGenArt721CoreContractV3_Base(
            _coreContract
        ).projectStateData(_projectId);
        // update storage with results
        maxInvocationsProjectConfig.maxInvocations = uint24(maxInvocations);

        // We need to ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        // This synced value of maxInvocations from the core contract will always be greater
        // than or equal to the previous value of maxInvocations stored locally.
        maxInvocationsProjectConfig.maxHasBeenInvoked =
            invocations == maxInvocations;
        return maxInvocations;
    }

    /**
     * @notice Manually limits project's max invocations.
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocations The new max invocations limit.
     * @param maxInvocationsProjectConfig Data structure that holds max invocations project configuration.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocations,
        MaxInvocationsProjectConfig storage maxInvocationsProjectConfig
    ) internal {
        // CHECKS
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations
        ) = coreContractInvocationData(_projectId, _coreContract);
        require(
            _maxInvocations <= coreMaxInvocations,
            "Invalid max invocations"
        );
        require(_maxInvocations >= coreInvocations, "Invalid max invocations");

        // EFFECTS
        // update storage with results
        maxInvocationsProjectConfig.maxInvocations = uint24(_maxInvocations);
        // We need to ensure maxHasBeenInvoked is correctly set after manually setting the
        // local maxInvocations value.
        maxInvocationsProjectConfig.maxHasBeenInvoked =
            coreInvocations == _maxInvocations;
    }

    /**
     * @notice Validate effects on invocations after purchase. This ensures
     * that the token invocation is less than or equal to the local max
     * invocations, and also updates the local maxHasBeenInvoked value.
     * @dev This function checks that the token invocation is less than or
     * equal to the local max invocations, and also updates the local
     * maxHasBeenInvoked value.
     * @param _tokenId The id of the token.
     * @param maxInvocationsProjectConfig Data structure that holds max
     * invocations project configuration.
     */
    function validatePurchaseEffectsInvocations(
        uint256 _tokenId,
        MaxInvocationsProjectConfig storage maxInvocationsProjectConfig
    ) internal {
        // invocation is token number plus one, and will never overflow due to
        // limit of 1e6 invocations per project. block scope for gas efficiency
        // (i.e. avoid an unnecessary var initialization to 0).
        unchecked {
            uint256 tokenInvocation = (_tokenId % ONE_MILLION) + 1;
            uint256 localMaxInvocations = maxInvocationsProjectConfig
                .maxInvocations;
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
                maxInvocationsProjectConfig.maxHasBeenInvoked = true;
            }
        }
    }

    /**
     * Helper function to check if max invocations has not been initialized.
     * Returns true if not initialized, false if initialized.
     * @param _maxInvocationsProjectConfig Struct that holds max invocations
     * project configuration.
     * @return bool
     * @dev We know a project's max invocations have never been initialized if
     * both max invocations and maxHasBeenInvoked are still initial values.
     * This is because if maxInvocations were ever set to zero,
     * maxHasBeenInvoked would be set to true.
     */
    function maxInvocationsIsUnconfigured(
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) internal view returns (bool) {
        return
            _maxInvocationsProjectConfig.maxInvocations == 0 &&
            !_maxInvocationsProjectConfig.maxHasBeenInvoked;
    }

    /**
     * Returns if invocations remain available for a given project.
     * This function calls the core contract to get the most up-to-date
     * invocation data (which may be useful to avoid reverts during mint).
     * This function considers core contract max invocations, and minter local
     * max invocations, and returns a response based on the most limiting
     * max invocations value.
     * @param _maxInvocationsProjectConfig Struct that holds minter-level max
     * invocations
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     */
    function invocationsRemain(
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig,
        uint256 _projectId,
        address _coreContract
    ) internal view returns (bool) {
        // get up-to-data invocation data from core contract
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations
        ) = MaxInvocationsLib.coreContractInvocationData(
                _projectId,
                _coreContract
            );
        // load minter-local max invocations into memory
        uint256 localMaxInvocations = _maxInvocationsProjectConfig
            .maxInvocations;
        // invocations remain available if the core contract has not reached
        // the most limiting max invocations, either on minter or core contract
        uint256 limitingMaxInvocations = Math.min(
            coreMaxInvocations,
            localMaxInvocations
        );
        return coreInvocations < limitingMaxInvocations;
    }

    /**
     * Pulls core contract invocation data for a given project.
     * @dev This function calls the core contract to get the invocation data
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @return coreInvocations The number of invocations for the project.
     * @return coreMaxInvocations The max invocations for the project, as
     * defined on the core contract.
     */
    function coreContractInvocationData(
        uint256 _projectId,
        address _coreContract
    )
        internal
        view
        returns (uint256 coreInvocations, uint256 coreMaxInvocations)
    {
        (
            coreInvocations,
            coreMaxInvocations,
            ,
            ,
            ,

        ) = IGenArt721CoreContractV3_Base(_coreContract).projectStateData(
            _projectId
        );
    }

    /**
     * Returns the max invocations for a given MaxInvocationsProjectConfig.
     * @param _maxInvocationsProjectConfig MaxInvocationsProjectConfig struct
     * to be queried.
     */
    function getMaxInvocations(
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) internal view returns (uint256) {
        return _maxInvocationsProjectConfig.maxInvocations;
    }

    /**
     * Returns if max has been invoked for a given MaxInvocationsProjectConfig.
     * @param _maxInvocationsProjectConfig MaxInvocationsProjectConfig struct
     * to be queried.
     */
    function getMaxHasBeenInvoked(
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) internal view returns (bool) {
        return _maxInvocationsProjectConfig.maxHasBeenInvoked;
    }

    /**
     * Get if a project has reached its max invocations.
     * Function is labaled as "safe" because it checks the core contract's
     * invocations and max invocations. If the local max invocations is greater
     * than the core contract's max invocations, it will defer to the core
     * contract's max invocations (since those are the limiting factor).
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocationsProjectConfig MaxInvocationsProjectConfig struct
     */
    function projectMaxHasBeenInvokedSafe(
        uint256 _projectId,
        address _coreContract,
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) internal view returns (bool) {
        // get max invocations from core contract
        uint256 coreInvocations;
        uint256 coreMaxInvocations;
        (coreInvocations, coreMaxInvocations) = MaxInvocationsLib
            .coreContractInvocationData(_projectId, _coreContract);
        uint256 localMaxInvocations = _maxInvocationsProjectConfig
            .maxInvocations;
        // value is locally defined, and could be out of date.
        // only possible illogical state is if local max invocations is
        // greater than core contract's max invocations, in which case
        // we should use the core contract's max invocations
        if (localMaxInvocations > coreMaxInvocations) {
            // local max invocations is stale and illogical, defer to core
            // contract's max invocations since it is the limiting factor
            return (coreMaxInvocations == coreInvocations);
        }
        // local max invocations is limiting, so check core invocations against
        // local max invocations
        return (coreInvocations >= localMaxInvocations);
    }

    /**
     * @notice Verifies the cached values of a project's maxInvocation state
     * are logically consistent with the core contract's maxInvocation state,
     * or populates them to equal the core contract's maxInvocation state if
     * they have never been populated or are illogical (e.g. minter max
     * invocations are greater than core contract max invocations).
     * @dev intended for use with settlement lib
     * @dev assumes core contract's max invocations may only be reduced, which
     * is the case for V3 core contracts
     */
    function refreshMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) internal {
        // project's max invocations and has max been invoked can only be
        // initial values if never populated, because setting a maxInvocations
        // of zero means maxHasBeenInvoked would be set to true
        bool notPopulated = (_maxInvocationsProjectConfig.maxInvocations == 0 &&
            _maxInvocationsProjectConfig.maxHasBeenInvoked == false);
        if (notPopulated) {
            // sync the minter max invocation state to equal the values on the
            // core contract (least restrictive state)
            MaxInvocationsLib.syncProjectMaxInvocationsToCore(
                _projectId,
                _coreContract,
                _maxInvocationsProjectConfig
            );
        } else {
            // if using local max invocations, validate the local state
            // (i.e. ensure local max invocations not greater than core max
            // invocations)
            _validateProjectMaxInvocations(
                _projectId,
                _coreContract,
                _maxInvocationsProjectConfig
            );
        }
    }

    /**
     * Helper function for refreshMaxInvocations, that handles the case where
     * max invocations have been set on the minter. This function ensures the
     * minter's max invocations are not illogical relative to the core
     * contract's max invocations, and updates the minter's max invocations and
     * maxHasBeenInvoked state to be consistent with the core contract's max
     * invocations.
     * @dev intended for use with settlement lib
     * @dev assumes core contract's max invocations may only be reduced, which
     * is the case for V3 core contracts
     * @param _projectId The id of the project.
     * @param _coreContract The address of the core contract.
     * @param _maxInvocationsProjectConfig MaxInvocationsProjectConfig struct
     */
    // @dev intended for use with settlement lib
    function _validateProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        MaxInvocationsProjectConfig storage _maxInvocationsProjectConfig
    ) private {
        uint256 coreMaxInvocations;
        uint256 coreInvocations;
        (coreInvocations, coreMaxInvocations) = MaxInvocationsLib
            .coreContractInvocationData(_projectId, _coreContract);

        uint256 localMaxInvocations = _maxInvocationsProjectConfig
            .maxInvocations;
        // check if local max invocations is illogical relative to core
        // contract's max invocations
        if (localMaxInvocations > coreMaxInvocations) {
            // set local max invocations to core contract's max invocations
            _maxInvocationsProjectConfig.maxInvocations = uint24(
                coreMaxInvocations
            );
            // update the project's `maxHasBeenInvoked` state
            // @dev core values are equivalent to local values, use for gas
            // efficiency
            _maxInvocationsProjectConfig
                .maxHasBeenInvoked = (coreMaxInvocations == coreInvocations);
        } else if (coreInvocations >= localMaxInvocations) {
            // ensure the local `maxHasBeenInvoked` state is accurate to
            // prevent any false negatives due to minting on other minters
            _maxInvocationsProjectConfig.maxHasBeenInvoked = true;
        }
    }
}
