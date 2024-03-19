// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Base} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";

import {ABHelpers} from "../ABHelpers.sol";

import {Math} from "@openzeppelin-4.7/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

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
    using SafeCast for uint256;

    /**
     * @notice Local max invocations for project `projectId`, tied to core contract `coreContractAddress`,
     * updated to `maxInvocations`.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * @param maxInvocations The new max invocations limit.
     */
    event ProjectMaxInvocationsLimitUpdated(
        uint256 indexed projectId,
        address indexed coreContract,
        uint256 maxInvocations
    );

    // position of Max Invocations Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant MAX_INVOCATIONS_LIB_STORAGE_POSITION =
        keccak256("maxinvocationslib.storage");

    uint256 internal constant ONE_MILLION = 1_000_000;

    /**
     * @notice Data structure that holds max invocations project configuration.
     */
    struct MaxInvocationsProjectConfig {
        bool maxHasBeenInvoked;
        uint24 maxInvocations;
    }

    // Diamond storage pattern is used in this library
    struct MaxInvocationsLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => MaxInvocationsProjectConfig)) maxInvocationsProjectConfigs;
    }

    /**
     * @notice Syncs project's max invocations to core contract value.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) internal {
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations
        ) = coreContractInvocationData({
                projectId: projectId,
                coreContract: coreContract
            });
        // update storage with results
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // @dev only bugged core would return > 1e6 invocations, but safe-cast
        // for additional overflow safety
        maxInvocationsProjectConfig.maxInvocations = coreMaxInvocations
            .toUint24();

        // We need to ensure maxHasBeenInvoked is correctly set after manually syncing the
        // local maxInvocations value with the core contract's maxInvocations value.
        maxInvocationsProjectConfig.maxHasBeenInvoked =
            coreInvocations == coreMaxInvocations;

        emit ProjectMaxInvocationsLimitUpdated({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: coreMaxInvocations
        });
    }

    /**
     * @notice Manually limits project's max invocations.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * @param maxInvocations The new max invocations limit.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocations
    ) internal {
        // CHECKS
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations
        ) = coreContractInvocationData({
                projectId: projectId,
                coreContract: coreContract
            });
        require(
            maxInvocations <= coreMaxInvocations,
            "Invalid max invocations"
        );
        require(maxInvocations >= coreInvocations, "Invalid max invocations");

        // EFFECTS
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // update storage with results
        maxInvocationsProjectConfig.maxInvocations = uint24(maxInvocations);
        // We need to ensure maxHasBeenInvoked is correctly set after manually setting the
        // local maxInvocations value.
        maxInvocationsProjectConfig.maxHasBeenInvoked =
            coreInvocations == maxInvocations;

        emit ProjectMaxInvocationsLimitUpdated({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: maxInvocations
        });
    }

    /**
     * @notice Validate effects on invocations after purchase. This ensures
     * that the token invocation is less than or equal to the local max
     * invocations, and also updates the local maxHasBeenInvoked value.
     * @dev This function checks that the token invocation is less than or
     * equal to the local max invocations, and also updates the local
     * maxHasBeenInvoked value.
     * @param tokenId The id of the token.
     * @param coreContract The address of the core contract.
     */
    function validateMintEffectsInvocations(
        uint256 tokenId,
        address coreContract
    ) internal {
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        // invocation is token number plus one, and will never overflow due to
        // limit of 1e6 invocations per project.
        uint256 tokenInvocation = ABHelpers.tokenIdToTokenInvocation(tokenId);
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

    /**
     * @notice Checks that the max invocations have not been reached for a
     * given project. This only checks the minter's local max invocations, and
     * does not consider the core contract's max invocations.
     * The function reverts if the max invocations have been reached.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     */
    function preMintChecks(
        uint256 projectId,
        address coreContract
    ) internal view {
        // check that max invocations have not been reached
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        require(
            !maxInvocationsProjectConfig.maxHasBeenInvoked,
            "Max invocations reached"
        );
    }

    /**
     * @notice Helper function to check if max invocations has not been initialized.
     * Returns true if not initialized, false if initialized.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * @dev We know a project's max invocations have never been initialized if
     * both max invocations and maxHasBeenInvoked are still initial values.
     * This is because if maxInvocations were ever set to zero,
     * maxHasBeenInvoked would be set to true.
     */
    function maxInvocationsIsUnconfigured(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        return
            maxInvocationsProjectConfig.maxInvocations == 0 &&
            !maxInvocationsProjectConfig.maxHasBeenInvoked;
    }

    /**
     * @notice Function returns if invocations remain available for a given project.
     * This function calls the core contract to get the most up-to-date
     * invocation data (which may be useful to avoid reverts during mint).
     * This function considers core contract max invocations, and minter local
     * max invocations, and returns a response based on the most limiting
     * max invocations value.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     */
    function invocationsRemain(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        return
            getInvocationsAvailable({
                projectId: projectId,
                coreContract: coreContract
            }) != 0;
    }

    /**
     * @notice Pulls core contract invocation data for a given project.
     * @dev This function calls the core contract to get the invocation data
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * @return coreInvocations The number of invocations for the project.
     * @return coreMaxInvocations The max invocations for the project, as
     * defined on the core contract.
     */
    function coreContractInvocationData(
        uint256 projectId,
        address coreContract
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

        ) = IGenArt721CoreContractV3_Base(coreContract).projectStateData(
            projectId
        );
    }

    /**
     * @notice Function returns the max invocations for a given project.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * to be queried.
     */
    function getMaxInvocations(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        return maxInvocationsProjectConfig.maxInvocations;
    }

    /**
     * @notice Function returns if max has been invoked for a given project.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * to be queried.
     */
    function getMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        return maxInvocationsProjectConfig.maxHasBeenInvoked;
    }

    /**
     * @notice Function returns if a project has reached its max invocations.
     * Function is labelled as "safe" because it checks the core contract's
     * invocations and max invocations. If the local max invocations is greater
     * than the core contract's max invocations, it will defer to the core
     * contract's max invocations (since those are the limiting factor).
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     */
    function projectMaxHasBeenInvokedSafe(
        uint256 projectId,
        address coreContract
    ) internal view returns (bool) {
        return
            getInvocationsAvailable({
                projectId: projectId,
                coreContract: coreContract
            }) == 0;
    }

    /**
     * @notice Function returns the number of invocations available for a given
     * project. Function checks the core contract's invocations and minter's max
     * invocations, ensuring that the most limiting value is used, even if the
     * local minter max invocations is stale.
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     * @return Number of invocations available for the project.
     */
    function getInvocationsAvailable(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        // get max invocations from core contract
        (
            uint256 coreInvocations,
            uint256 coreMaxInvocations
        ) = coreContractInvocationData({
                projectId: projectId,
                coreContract: coreContract
            });
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 limitingMaxInvocations = Math.min(
            coreMaxInvocations,
            maxInvocationsProjectConfig.maxInvocations // local max invocations
        );
        // if core invocations are greater than the limiting max invocations,
        // return 0 since no invocations remain
        if (coreInvocations >= limitingMaxInvocations) {
            return 0;
        }
        // otherwise, return the number of invocations remaining
        // @dev will not undeflow due to previous check
        return limitingMaxInvocations - coreInvocations;
    }

    /**
     * @notice Refreshes max invocations to account for core contract max
     * invocations state, without imposing any additional restrictions on the
     * minter's max invocations state.
     * If minter max invocations have never been populated, this function will
     * populate them to equal the core contract's max invocations state (which
     * is the least restrictive state).
     * If minter max invocations have been populated, this function will ensure
     * the minter's max invocations are not greater than the core contract's
     * max invocations (which would be stale and illogical), and update the
     * minter's max invocations and maxHasBeenInvoked state to be consistent
     * with the core contract's max invocations.
     * If the minter max invocations have been populated and are not greater
     * than the core contract's max invocations, this function will do nothing,
     * since that is a valid state in which the minter has been configured to
     * be more restrictive than the core contract.
     * @dev assumes core contract's max invocations may only be reduced, which
     * is the case for all V3 core contracts
     * @param projectId The id of the project.
     * @param coreContract The address of the core contract.
     */
    function refreshMaxInvocations(
        uint256 projectId,
        address coreContract
    ) internal {
        MaxInvocationsProjectConfig
            storage maxInvocationsProjectConfig = getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        if (maxInvocationsIsUnconfigured(projectId, coreContract)) {
            // populate the minter max invocation state to equal the values on
            // the core contract (least restrictive state)
            syncProjectMaxInvocationsToCore({
                projectId: projectId,
                coreContract: coreContract
            });
        } else {
            // if local max invocations were already populated, validate the local state
            (
                uint256 coreInvocations,
                uint256 coreMaxInvocations
            ) = coreContractInvocationData({
                    projectId: projectId,
                    coreContract: coreContract
                });

            uint256 localMaxInvocations = maxInvocationsProjectConfig
                .maxInvocations;
            if (localMaxInvocations > coreMaxInvocations) {
                // if local max invocations are greater than core max invocations, make
                // them equal since that is the least restrictive logical state
                // @dev this is only possible if the core contract's max invocations
                // have been reduced since the minter's max invocations were last
                // updated
                // set local max invocations to core contract's max invocations
                maxInvocationsProjectConfig.maxInvocations = uint24(
                    coreMaxInvocations
                );
                // update the minter's `maxHasBeenInvoked` state
                maxInvocationsProjectConfig
                    .maxHasBeenInvoked = (coreMaxInvocations ==
                    coreInvocations);
                emit ProjectMaxInvocationsLimitUpdated({
                    projectId: projectId,
                    coreContract: coreContract,
                    maxInvocations: coreMaxInvocations
                });
            } else if (coreInvocations >= localMaxInvocations) {
                // core invocations are greater than this minter's max
                // invocations, indicating that minting must have occurred on
                // another minter. update the minter's `maxHasBeenInvoked` to
                // true to prevent any false negatives on
                // `getMaxHasBeenInvoked'
                maxInvocationsProjectConfig.maxHasBeenInvoked = true;
                // @dev do not emit event, because we did not change the value
                // of minter-local max invocations
            }
        }
    }

    /**
     * @notice Loads the MaxInvocationsProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getMaxInvocationsProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (MaxInvocationsProjectConfig storage) {
        return s().maxInvocationsProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The MaxInvocationsLibStorage struct.
     */
    function s()
        internal
        pure
        returns (MaxInvocationsLibStorage storage storageStruct)
    {
        bytes32 position = MAX_INVOCATIONS_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
