// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "../../interfaces/v0.8.x/ITransferHook.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_Engine} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

/**
 * @title Shared transfer-hook helpers for V3 Engine and Engine Flex cores.
 * @author Art Blocks Inc.
 * @notice External library (DELEGATECALL) used by both `GenArt721CoreV3_Engine`
 * and `GenArt721CoreV3_Engine_Flex`. Offloading this logic keeps the two cores
 * consistent while both remain under the 24KB bytecode size limit.
 * Cores should SLOAD the hook address themselves and only call `callHook`
 * when it is non-zero, so unconfigured transfers do not pay a DELEGATECALL.
 * @dev Storage is reached through a `Layout` storage pointer supplied by the
 * calling core, rather than through the diamond storage pattern used by
 * `V3FlexLib`. This is intentional: the layout appears in the core's own
 * storage layout, which keeps it auditable with standard tooling.
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
     * Once the project is locked (four-week project metadata lock), a hook may
     * only be changed if one is already set. If the hook is `address(0)` when
     * that auto-lock happens, it can never be assigned.
     * @param layout Core-owned transfer hook storage.
     * @param projectId Project ID.
     * @param hook New hook, or `address(0)` to clear.
     * @param projectUnlocked Core's `_projectUnlocked(projectId)`. Passed in
     * so the four-week auto-lock-at-zero rule is evaluated by exactly the same
     * logic as every other lock on the core.
     */
    function configure(
        Layout storage layout,
        uint256 projectId,
        ITransferHook hook,
        bool projectUnlocked
    ) external {
        _onlyNotExecuting(layout);
        ProjectTransferHookConfig storage config = layout.configs[projectId];
        if (_isLocked({config: config, projectUnlocked: projectUnlocked})) {
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
     * Reverts if already locked, including when the four-week project metadata
     * lock has already frozen an unset hook.
     * @dev `expectedHook` makes the caller's intent explicit and is checked
     * before locking, because locking is permanent and the hook may be changed
     * by either the artist or the Admin ACL. Without it, a `configure` call
     * landing first would cause this call to permanently freeze a hook the
     * caller never intended to lock.
     * @param layout Core-owned transfer hook storage.
     * @param projectId Project ID.
     * @dev Locking freezes the hook address, not the hook's behavior — locking
     * at an upgradeable proxy is not a behavioral guarantee.
     * @param expectedHook Hook the caller expects to be locking in. Must equal
     * the project's currently configured hook, which may be `address(0)`.
     * @param projectUnlocked Core's `_projectUnlocked(projectId)`.
     */
    function lock(
        Layout storage layout,
        uint256 projectId,
        address expectedHook,
        bool projectUnlocked
    ) external {
        _onlyNotExecuting(layout);
        ProjectTransferHookConfig storage config = layout.configs[projectId];
        if (_isLocked({config: config, projectUnlocked: projectUnlocked})) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.TransferHookLocked
            );
        }
        address currentHook = address(config.hook);
        if (currentHook != expectedHook) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .TransferHookUnexpectedHook
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
            currentHook
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
     * @notice Effective lock state of a project's transfer hook config.
     * True if the artist called `lockProjectTransferHook`, or if the project's
     * four-week metadata lock has elapsed while the hook is `address(0)`.
     * @dev Shared by `configure`, `lock`, and the cores' public view, so all
     * three can never disagree.
     * @param config Project's transfer hook config.
     * @param projectUnlocked Core's `_projectUnlocked(projectId)`.
     */
    function isLocked(
        ProjectTransferHookConfig storage config,
        bool projectUnlocked
    ) external view returns (bool) {
        return _isLocked({config: config, projectUnlocked: projectUnlocked});
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
     * @notice Effective lock: explicit `lockProjectTransferHook`, or the
     * four-week project metadata auto-lock while the hook is unset.
     * @dev A hook that is already set at auto-lock intentionally remains
     * configurable, so that auto-lock can never permanently freeze a hook that
     * later breaks. Freezing a set hook requires an explicit artist call.
     */
    function _isLocked(
        ProjectTransferHookConfig storage config,
        bool projectUnlocked
    ) private view returns (bool) {
        if (config.locked) {
            return true;
        }
        if (address(config.hook) != address(0)) {
            return false;
        }
        return !projectUnlocked;
    }

    /**
     * @notice Minimal ERC-165 check for `ITransferHook`. Intentionally not
     * OpenZeppelin's ERC165Checker, which is too large to inline into the
     * size-constrained Engine Flex core.
     * @dev A codeless address (EOA) returns success with zero-length
     * returndata, which the length check below rejects.
     */
    function _requireSupportsTransferHook(address hook) private view {
        (bool success, bytes memory result) = hook.staticcall(
            abi.encodeWithSelector(
                bytes4(0x01ffc9a7), // IERC165.supportsInterface.selector
                type(ITransferHook).interfaceId // 0x6344b0e2
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
