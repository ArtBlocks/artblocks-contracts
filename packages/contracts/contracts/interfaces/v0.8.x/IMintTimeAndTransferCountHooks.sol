// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "./ITransferHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";

/**
 * @title Interface for the mint-time and transfer-count combined hook.
 * @author Art Blocks Inc.
 * @notice Reference implementation that records each token's mint timestamp
 * and subsequent transfer count, and injects those values (plus live seconds
 * since mint) into the token's PostParams.
 */
interface IMintTimeAndTransferCountHooks is ITransferHook, IPMPAugmentHook {
    /**
     * @notice Packed per-token state written by the transfer hook.
     * @dev Fits in a single storage slot. `mintTimestamp == 0` means this hook
     * has not observed the token's mint.
     * @param mintTimestamp Unix seconds of the mint block; `0` if the mint
     * was not observed.
     * @param transferCount Ownership-changing transfers after mint. Does not
     * include the mint itself.
     */
    struct TokenTransferState {
        uint64 mintTimestamp;
        uint64 transferCount;
    }

    /**
     * @notice Token `tokenId` on `coreContract` recorded its mint at
     * `timestamp`.
     */
    event MintTimestampRecorded(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint64 timestamp
    );

    /**
     * @notice Token `tokenId` on `coreContract` recorded an ownership-changing
     * transfer. `transferCount` is the new count after this transfer.
     */
    event TransferCounted(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint64 transferCount,
        address from,
        address to
    );

    /**
     * @notice PMP write of `transferCount` failed. Local hook state was still
     * updated; the transfer that invoked this hook was not reverted.
     * @dev Typical causes: the project has not configured a `transferCount`
     * PMP with `AuthOption.Address` and `authAddress == this`, the param is
     * locked, or the value is out of the configured range.
     */
    event TransferCountPMPSyncFailed(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint64 transferCount
    );

    /**
     * @notice Thrown when the calling core does not have this hook configured
     * for the token's project.
     */
    error HookNotConfiguredForProject(
        address coreContract,
        uint256 projectId,
        address configuredHook
    );

    /**
     * @notice Packed mint timestamp and transfer count for a token.
     * @param coreContract Core contract the token belongs to.
     * @param tokenId Token ID.
     * @return state Packed state. Both fields are `0` if the token has never
     * been recorded.
     */
    function tokenTransferState(
        address coreContract,
        uint256 tokenId
    ) external view returns (TokenTransferState memory state);

    /**
     * @notice Unix seconds of the mint block, or `0` if this hook did not
     * observe the mint.
     */
    function mintTimestamp(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256);

    /**
     * @notice Ownership-changing transfers after mint. Does not include the
     * mint itself. `0` until a post-mint transfer is recorded.
     */
    function transferCount(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256);

    /**
     * @notice Seconds between the recorded mint timestamp and `block.timestamp`
     * at the time of the call. `0` if the mint was not observed, or if
     * `block.timestamp` is not after the mint timestamp.
     */
    function secondsSinceMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256);

    /**
     * @notice Whether this hook observed the token's mint, which is the case
     * only if it was configured as the project's transfer hook before the
     * token was minted.
     */
    function isTrackedFromMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (bool);
}
