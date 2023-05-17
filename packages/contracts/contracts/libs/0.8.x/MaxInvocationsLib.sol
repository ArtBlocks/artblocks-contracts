// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";

pragma solidity ^0.8.0;

/**
 * @title Art Blocks Max Invocations Library
 * @notice [TO FILL OUT]
 * @author Art Blocks Inc.
 */

library MaxInvocationsLib {
    struct MaxInvocationsProjectConfig {
        bool maxHasBeenInvoked;
        uint24 maxInvocations;
    }

    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract,
        mapping(address => mapping(uint256 => MaxInvocationsProjectConfig))
            storage projectConfigMapping
    ) internal {
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
}
