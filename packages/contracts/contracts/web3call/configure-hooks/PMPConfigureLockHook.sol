// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPConfigureHook} from "./AbstractPMPConfigureHook.sol";

import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";

/**
 * @title PMPConfigureLockHook
 * @author Art Blocks Inc.
 * @notice A generic post-configuration hook that enforces per-parameter value locks on a
 * PMPV0 project. For each configured key, an artist-chosen lock timestamp may be set; once
 * that timestamp has passed, any attempt to configure that parameter's value on any token
 * reverts, rolling back the collector's (or artist's) entire configureTokenParams()
 * transaction.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * PMPV0 interprets `pmpLockedAfterTimestamp` only as a *configuration* lock (it prevents
 * the artist from re-configuring the parameter definition after the timestamp). It does NOT
 * prevent token owners from continuing to write *values* after the timestamp. The Art Blocks
 * Creator Dashboard advertises the Lock Date as cementing values permanently, so this hook
 * patches the gap for existing PMPV0 projects by reverting value writes after the lock date.
 * PMPV1 enforces this natively; this hook is intended for projects already deployed on PMPV0.
 *
 * ── Scope ────────────────────────────────────────────────────────────────────
 * This hook is stateless after construction and has no side effects — it only reverts. It is
 * intended to be registered for a single project via PMPV0.configureProjectHooks(). Keys not
 * present in the lock table are always allowed (the hook is a no-op for them). A lock
 * timestamp is matched to the same instant PMPV0 uses for its config lock: a value write is
 * allowed while `block.timestamp < lockedAfter`, and reverts once `block.timestamp >=
 * lockedAfter`. The lock timestamps supplied at construction should exactly match each key's
 * `pmpLockedAfterTimestamp` in the project's PMPV0 configuration.
 *
 * ── Residual trust ───────────────────────────────────────────────────────────
 * A hook-based lock only holds while this hook remains registered. PMPV0.configureProjectHooks()
 * is not itself gated by `pmpLockedAfterTimestamp`, so the project artist could later unregister
 * this hook and re-enable value writes. This is acceptable for the artist's own project but is
 * a weaker guarantee than PMPV1's native value lock.
 */
contract PMPConfigureLockHook is AbstractPMPConfigureHook {
    /// @notice Per-key lock timestamp. keccak256(bytes(key)) => unix timestamp after which
    /// (inclusive) the key's value is locked. A value of 0 means the key is not locked by
    /// this hook.
    mapping(bytes32 keyHash => uint256 lockedAfterTimestamp) public lockedAfter;

    /// @notice The keys locked by this hook, in construction order (for introspection).
    string[] public lockedKeys;

    error ParamLocked(string key, uint256 lockedAfterTimestamp);
    error EmptyConfig();
    error LengthMismatch();
    error ZeroTimestamp(string key);
    error DuplicateKey(string key);

    /**
     * @notice Constructor.
     * @param keys The parameter keys to lock. Should match the project's PMPV0 param keys.
     * @param timestamps The unix timestamp for each key, aligned by index, after which
     * (inclusive) the key's value is locked. Each must be non-zero and should match the
     * corresponding key's `pmpLockedAfterTimestamp` in the project's PMPV0 configuration.
     */
    constructor(string[] memory keys, uint256[] memory timestamps) {
        uint256 keysLength = keys.length;
        if (keysLength == 0) revert EmptyConfig();
        if (keysLength != timestamps.length) revert LengthMismatch();
        for (uint256 i = 0; i < keysLength; i++) {
            if (timestamps[i] == 0) revert ZeroTimestamp(keys[i]);
            bytes32 keyHash = keccak256(bytes(keys[i]));
            // @dev reject duplicate keys to avoid silent override of a lock timestamp
            if (lockedAfter[keyHash] != 0) revert DuplicateKey(keys[i]);
            lockedAfter[keyHash] = timestamps[i];
            lockedKeys.push(keys[i]);
        }
    }

    /**
     * @notice Post-configuration hook executed by PMPV0 after a token's PMP is configured.
     * Reverts if the configured key is locked and its lock timestamp has passed, which rolls
     * back the entire configureTokenParams() transaction.
     * @dev Stateless and side-effect free; safe to be called by any address.
     * @param pmpInput The PMP input that was used to configure the token.
     */
    function onTokenPMPConfigure(
        address /* coreContract */,
        uint256 /* tokenId */,
        IPMPV0.PMPInput calldata pmpInput
    ) external view override {
        uint256 lockedAfterTimestamp = lockedAfter[
            keccak256(bytes(pmpInput.key))
        ];
        // @dev keys not in the lock table (lockedAfterTimestamp == 0) are always allowed
        if (
            lockedAfterTimestamp != 0 &&
            block.timestamp >= lockedAfterTimestamp
        ) {
            revert ParamLocked(pmpInput.key, lockedAfterTimestamp);
        }
    }

    /**
     * @notice Returns the number of keys locked by this hook.
     */
    function lockedKeysLength() external view returns (uint256) {
        return lockedKeys.length;
    }
}
