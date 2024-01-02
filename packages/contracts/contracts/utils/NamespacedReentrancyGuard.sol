// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8;

/**
 * @title NamespacedReentrancyGuard
 * @notice This abstract contract defines a reentrancy guard that uses
 * namespaced storage such that contracts that use delegatecall patterns can
 * safely not be concerned with ordering of state variable definitions.
 * It uses a diamond storage pattern.
 * @author Art Blocks Inc.
 */

abstract contract NamespacedReentrancyGuard {
    bytes32 private constant NAMESPACED_REENTRANCY_GUARD_STORAGE_POSITION =
        keccak256("namespacedreentrancyguard.storage");

    // status states
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    /**
     * @notice Struct used to define the storage layout for the DependencyRegistry contract.
     * It includes mappings for dependencies, licenses, supported core contracts, and project dependency overrides.
     */
    struct NamespacedReentrancyGuardStorage {
        uint256 status;
    }

    /**
     * @dev Prevents contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @notice Initialize the reentrancy guard.
     */
    function _initialize() internal {
        // set status to not entered
        NamespacedReentrancyGuardStorage storage $ = _s();
        $.status = _NOT_ENTERED;
    }

    /**
     * @notice Sets the reentrancy guard status to `_ENTERED`.
     * Reverts if the guard is already entered.
     */
    function _nonReentrantBefore() private {
        NamespacedReentrancyGuardStorage storage $ = _s();
        require($.status != _ENTERED, "ReentrancyGuard: reentrant call");
        // Any calls to nonReentrant after this point will fail
        $.status = _ENTERED;
    }

    /**
     * @notice Sets the reentrancy guard status to `_NOT_ENTERED`, allowing
     * calls to `nonReentrant` functions again.
     */
    function _nonReentrantAfter() private {
        NamespacedReentrancyGuardStorage storage $ = _s();
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        $.status = _NOT_ENTERED;
    }

    /**
     * @notice Returns the storage struct for reading and writing.
     * This library uses a diamond storage pattern when managing storage.
     * @return $ The NamespacedReentrancyGuardStorage struct.
     */
    function _s()
        private
        pure
        returns (NamespacedReentrancyGuardStorage storage $)
    {
        bytes32 position = NAMESPACED_REENTRANCY_GUARD_STORAGE_POSITION;
        assembly ("memory-safe") {
            $.slot := position
        }
    }
}
