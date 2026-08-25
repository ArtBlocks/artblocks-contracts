// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "../../interfaces/v0.8.x/ITransferHook.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_Engine} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

/**
 * @title Shared transfer-hook helpers for V3 Engine and Engine Flex cores.
 * @author Art Blocks Inc.
 * @notice External library (DELEGATECALL) so Engine Flex stays under the 24KB
 * cap. Cores should SLOAD the hook address themselves and only call `callHook`
 * when it is non-zero, so unconfigured transfers do not pay a DELEGATECALL.
 * @dev Reverts use the core's `GenArt721Error` so callers see a single error
 * type. A reverting hook call is intentionally not caught — latent failure
 * would leave ownership updated while hook side effects did not run.
 */
library V3TransferHookLib {
    /**
     * @notice Per-project transfer hook configuration.
     * @dev Packed into one slot: 20-byte address + 1-byte locked flag.
     */
    struct ProjectTransferHookConfig {
        ITransferHook hook;
        bool locked;
    }

    /**
     * @notice Core-owned transfer hook storage.
     * @dev `executing` is a dedicated slot (not packed with other flags) so
     * setting it around a hook call does not dirty unrelated config storage.
     */
    struct Layout {
        mapping(uint256 projectId => ProjectTransferHookConfig) configs;
        bool executing;
    }

    /**
     * @notice Set or clear a project's transfer hook.
     * Reverts if the hook configuration is locked, or if a non-zero `hook`
     * does not ERC-165-advertise `ITransferHook`.
     * @param layout Core-owned transfer hook storage.
     * @param projectId Project ID.
     * @param hook New hook, or `address(0)` to clear.
     */
    function configure(
        Layout storage layout,
        uint256 projectId,
        ITransferHook hook
    ) external {
        _onlyNotExecuting(layout);
        ProjectTransferHookConfig storage config = layout.configs[projectId];
        if (config.locked) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.TransferHookLocked
            );
        }
        if (address(hook) != address(0)) {
            _requireSupportsTransferHook(address(hook));
        }
        config.hook = hook;
        emit IGenArt721CoreContractV3_Base.ProjectUpdated(
            projectId,
            bytes32(
                uint256(
                    IGenArt721CoreContractV3_Base
                        .ProjectUpdatedFields
                        .FIELD_PROJECT_TRANSFER_HOOK
                )
            )
        );
        emit IGenArt721CoreContractV3_Engine.ProjectTransferHookUpdated(
            projectId,
            address(hook)
        );
    }

    /**
     * @notice One-way lock of the current hook value, including `address(0)`.
     * Reverts if already locked.
     * @param layout Core-owned transfer hook storage.
     * @param projectId Project ID.
     */
    function lock(Layout storage layout, uint256 projectId) external {
        _onlyNotExecuting(layout);
        ProjectTransferHookConfig storage config = layout.configs[projectId];
        if (config.locked) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.TransferHookLocked
            );
        }
        config.locked = true;
        emit IGenArt721CoreContractV3_Base.ProjectUpdated(
            projectId,
            bytes32(
                uint256(
                    IGenArt721CoreContractV3_Base
                        .ProjectUpdatedFields
                        .FIELD_PROJECT_TRANSFER_HOOK_LOCKED
                )
            )
        );
        emit IGenArt721CoreContractV3_Engine.ProjectTransferHookLocked(
            projectId,
            address(config.hook)
        );
    }

    /**
     * @notice Call `hook.onTokenTransfer`, setting `layout.executing` around
     * the external call so `_update` and hook configuration cannot be
     * reentered from the hook.
     * @dev Caller MUST have already verified `hook` is non-zero. Reverts if
     * `layout.executing` is already true (nested mint/transfer dispatch).
     * @param layout Core-owned transfer hook storage.
     * @param hook Hook to call.
     * @param tokenId Token whose ownership just changed.
     * @param from Previous owner; `address(0)` on mint.
     * @param to New owner.
     * @param operator Transfer operator or mint `_by` address.
     */
    function callHook(
        Layout storage layout,
        ITransferHook hook,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) external {
        _onlyNotExecuting(layout);
        layout.executing = true;
        hook.onTokenTransfer({
            coreContract: address(this),
            tokenId: tokenId,
            from: from,
            to: to,
            operator: operator
        });
        layout.executing = false;
    }

    /**
     * @notice Revert if a transfer hook is currently executing.
     * @param layout Core-owned transfer hook storage.
     */
    function _onlyNotExecuting(Layout storage layout) private view {
        if (layout.executing) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.TransferHookReentrancy
            );
        }
    }

    /**
     * @notice Minimal ERC-165 check for `ITransferHook`. Intentionally not
     * OpenZeppelin's ERC165Checker, which is too large to inline into the
     * size-constrained Engine Flex core.
     */
    function _requireSupportsTransferHook(address hook) private view {
        (bool success, bytes memory result) = hook.staticcall(
            abi.encodeWithSelector(
                bytes4(0x01ffc9a7), // IERC165.supportsInterface.selector
                type(ITransferHook).interfaceId
            )
        );
        if (!success || result.length < 32 || !abi.decode(result, (bool))) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .TransferHookInvalidInterface
            );
        }
    }
}
