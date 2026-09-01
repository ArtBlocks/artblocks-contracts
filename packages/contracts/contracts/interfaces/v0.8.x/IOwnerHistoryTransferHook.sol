// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "./ITransferHook.sol";

/**
 * @title Interface for the on-chain owner history transfer hook.
 * @author Art Blocks Inc.
 * @notice Reference `ITransferHook` implementation that records every owner a
 * token has had, on chain, for projects that opt in.
 */
interface IOwnerHistoryTransferHook is ITransferHook {
    /**
     * @notice One entry in a token's ownership chain.
     * @dev Packed into a single storage slot: 20-byte address + 12-byte
     * timestamp. `uint96` seconds is not a real bound.
     */
    struct OwnerRecord {
        address owner;
        uint96 timestamp;
    }

    /**
     * @notice Token `tokenId` on `coreContract` recorded `owner` at
     * `index` in its ownership chain.
     * @dev Index 0 is the owner that preceded the first change this hook saw:
     * `address(0)` when the hook was configured before the token was minted,
     * and otherwise the owner at the moment the hook started tracking.
     */
    event OwnerRecorded(
        address indexed coreContract,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 index,
        uint256 timestamp
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
     * @notice Full ownership chain recorded for a token, oldest first.
     * @dev Unbounded; use `ownerHistorySlice` for tokens with long histories.
     * @param coreContract Core contract the token belongs to.
     * @param tokenId Token ID.
     */
    function ownerHistory(
        address coreContract,
        uint256 tokenId
    ) external view returns (OwnerRecord[] memory records);

    /**
     * @notice A page of a token's ownership chain, oldest first.
     * @param coreContract Core contract the token belongs to.
     * @param tokenId Token ID.
     * @param start Index to start at.
     * @param count Maximum number of records to return. The returned array is
     * shorter than `count` when fewer records remain.
     */
    function ownerHistorySlice(
        address coreContract,
        uint256 tokenId,
        uint256 start,
        uint256 count
    ) external view returns (OwnerRecord[] memory records);

    /**
     * @notice Number of records in a token's ownership chain.
     */
    function ownerHistoryLength(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256);

    /**
     * @notice Owners a token has had, excluding the most recently recorded one.
     * @dev Excludes the `address(0)` anchor of a token tracked from its mint,
     * which is not an owner; for a token first seen mid-life, the anchor is the
     * real owner at that moment and is included. Empty until a token has
     * changed hands at least once while tracked.
     */
    function previousOwners(
        address coreContract,
        uint256 tokenId
    ) external view returns (address[] memory owners);

    /**
     * @notice Most recently recorded owner of a token.
     * @dev This is the token's current owner while the hook stays configured
     * for its project. If the project's hook is cleared, transfers stop being
     * recorded and this becomes the owner as of the last recorded transfer, so
     * consumers that need the live owner should call `ownerOf` on the core.
     * @return owner Most recent recorded owner, or `address(0)` if the token
     * has never been recorded.
     */
    function lastRecordedOwner(
        address coreContract,
        uint256 tokenId
    ) external view returns (address owner);

    /**
     * @notice Whether a token's recorded chain begins at its mint, which is the
     * case only if this hook was configured for the project before the token
     * was minted.
     */
    function isTrackedFromMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (bool);
}
