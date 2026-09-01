// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {AbstractTransferHook} from "./AbstractTransferHook.sol";

import {IOwnerHistoryTransferHook} from "../../../interfaces/v0.8.x/IOwnerHistoryTransferHook.sol";
import {ITransferHook} from "../../../interfaces/v0.8.x/ITransferHook.sol";
import {IGenArt721CoreContractV3_Engine} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

import {ABHelpers} from "../../../libs/v0.8.x/ABHelpers.sol";

/**
 * @title On-chain owner history transfer hook
 * @author Art Blocks Inc.
 * @notice Reference `ITransferHook` implementation. Records the full chain of
 * owners a token has had, on chain and readable by other contracts — including
 * by an artwork's own script through the on-chain generator.
 * ----------------------------------------------------------------------------
 * A single deployment serves every project, on every v3.3+ Engine core on the
 * network, that configures this address as its transfer hook. There is no
 * owner, no allowlist and nothing to configure: an artist points their project
 * at this address with `configureProjectTransferHook`, and may make that
 * permanent with `lockProjectTransferHook`.
 * ----------------------------------------------------------------------------
 * GAS. Recording ownership on chain is not free, and the artist is choosing
 * this cost on behalf of everyone who will ever transfer one of their tokens.
 * Measured against an otherwise identical project with no hook, on a v3.3
 * Engine core:
 *
 * - a transfer costs about 48,400 gas more — 62,748 becomes 111,181, so
 *   roughly a 77% increase. Most of it is unavoidable: ~22,000 for the new
 *   storage slot holding the owner, and ~17,000 for the core's own reentrancy
 *   flag, which any hook pays.
 * - a mint costs about 88,800 gas more, because the first ownership change a
 *   token sees writes both the anchor entry and the new owner.
 *
 * An owner is 20 bytes and a storage slot is 32, so ~22,000 gas per owner is
 * the floor for holding this on chain; the packed timestamp rides along free.
 * A project that only needs provenance for off-chain consumers should index
 * the core's own `Transfer` events instead and configure no hook at all — this
 * hook writes storage because it is meant to be read by other contracts,
 * including an artwork's own script through the on-chain generator.
 * ----------------------------------------------------------------------------
 * COMPLETENESS. The chain is only complete from mint if this hook was
 * configured before the token was minted. A hook configured mid-life starts at
 * the owner it first observes; `isTrackedFromMint` reports which case a token
 * is in. If a project's hook is later cleared, recording simply stops — the
 * records already written stay readable.
 * ----------------------------------------------------------------------------
 * SAFETY. A reverting hook aborts the transfer that invoked it, so a hook that
 * can revert can make a token permanently non-transferable. This one writes
 * storage and cannot revert on a transfer of a project that has it configured:
 * the only revert path is the configuration check below, which is true by
 * construction whenever the core actually dispatches to this address.
 */
contract OwnerHistoryTransferHook is
    AbstractTransferHook,
    IOwnerHistoryTransferHook
{
    /**
     * @notice Ownership chain per token, oldest first, keyed by core contract.
     * @dev Keying by `coreContract` is what makes a single shared deployment
     * safe: `AbstractTransferHook` guarantees `coreContract == msg.sender`, so
     * a contract impersonating a core can only ever write beneath its own
     * address, where nothing reads. The configuration check in
     * `_onTokenTransfer` is a second, independent guard.
     */
    mapping(address coreContract => mapping(uint256 tokenId => OwnerRecord[]))
        private _ownerHistory;

    /**
     * @notice Record an ownership change.
     * @dev Called by the core after the ERC-721 ownership write, and on mint
     * after the token hash seed is assigned, so a hook reading `tokenIdToHash`
     * sees the final value.
     * @param coreContract Core that performed the ownership update. Guaranteed
     * by `AbstractTransferHook` to equal `msg.sender`.
     * @param tokenId Token whose ownership changed.
     * @param from Previous owner; `address(0)` on mint.
     * @param to New owner.
     */
    function _onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address /* operator */
    ) internal override {
        _onlyConfiguredForProject({
            coreContract: coreContract,
            projectId: ABHelpers.tokenIdToProjectId(tokenId)
        });

        // @dev ERC-721 permits `transferFrom(a, a, id)`. Ownership did not
        // change, so recording it would put the same owner in the chain twice.
        if (from == to) {
            return;
        }

        OwnerRecord[] storage records = _ownerHistory[coreContract][tokenId];
        if (records.length == 0) {
            // Anchor the chain with the owner that preceded the first change
            // this hook saw. That is `address(0)` when the hook was configured
            // before the mint, which is what `isTrackedFromMint` reads.
            _push({
                records: records,
                coreContract: coreContract,
                tokenId: tokenId,
                owner: from
            });
        }
        _push({
            records: records,
            coreContract: coreContract,
            tokenId: tokenId,
            owner: to
        });
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function ownerHistory(
        address coreContract,
        uint256 tokenId
    ) external view returns (OwnerRecord[] memory records) {
        return _ownerHistory[coreContract][tokenId];
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function ownerHistorySlice(
        address coreContract,
        uint256 tokenId,
        uint256 start,
        uint256 count
    ) external view returns (OwnerRecord[] memory records) {
        OwnerRecord[] storage stored = _ownerHistory[coreContract][tokenId];
        uint256 length = stored.length;
        if (start >= length) {
            return new OwnerRecord[](0);
        }
        uint256 remaining = length - start;
        uint256 resultLength = count < remaining ? count : remaining;
        records = new OwnerRecord[](resultLength);
        for (uint256 i = 0; i < resultLength; ) {
            records[i] = stored[start + i];
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function ownerHistoryLength(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return _ownerHistory[coreContract][tokenId].length;
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function previousOwners(
        address coreContract,
        uint256 tokenId
    ) external view returns (address[] memory owners) {
        OwnerRecord[] storage stored = _ownerHistory[coreContract][tokenId];
        uint256 length = stored.length;
        // @dev the anchor is `address(0)` for a token tracked from its mint,
        // which is not an owner; for a token first seen mid-life it is the real
        // owner at that moment, and belongs in the result
        uint256 start = (length > 0 && stored[0].owner == address(0)) ? 1 : 0;
        // @dev the final record is the current owner, not a previous one
        if (length < start + 2) {
            return new address[](0);
        }
        uint256 resultLength = length - start - 1;
        owners = new address[](resultLength);
        for (uint256 i = 0; i < resultLength; ) {
            owners[i] = stored[start + i].owner;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function lastRecordedOwner(
        address coreContract,
        uint256 tokenId
    ) external view returns (address owner) {
        OwnerRecord[] storage stored = _ownerHistory[coreContract][tokenId];
        uint256 length = stored.length;
        if (length == 0) {
            return address(0);
        }
        return stored[length - 1].owner;
    }

    /**
     * @inheritdoc IOwnerHistoryTransferHook
     */
    function isTrackedFromMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (bool) {
        OwnerRecord[] storage stored = _ownerHistory[coreContract][tokenId];
        // @dev the anchor record holds the owner before the first observed
        // change, which is `address(0)` only for a mint
        return stored.length > 0 && stored[0].owner == address(0);
    }

    /**
     * @notice Append one record and emit it.
     */
    function _push(
        OwnerRecord[] storage records,
        address coreContract,
        uint256 tokenId,
        address owner
    ) private {
        // @dev uint96 seconds is not a practical bound; no cast check needed
        uint96 timestamp = uint96(block.timestamp);
        records.push(OwnerRecord({owner: owner, timestamp: timestamp}));
        emit OwnerRecorded({
            coreContract: coreContract,
            tokenId: tokenId,
            owner: owner,
            index: records.length - 1,
            timestamp: timestamp
        });
    }

    /**
     * @notice Revert unless `coreContract` has this hook configured for
     * `projectId`.
     * @dev This is the `ITransferHook` requirement that an implementation
     * verify which cores it serves, answered without any configuration of its
     * own: the set of cores this hook serves is exactly the set that points at
     * it. A contract impersonating a core could answer this call dishonestly,
     * which is why it is a second guard rather than the only one — the storage
     * keyed by `coreContract` already confines such a caller to its own
     * namespace.
     */
    function _onlyConfiguredForProject(
        address coreContract,
        uint256 projectId
    ) private view {
        (address configuredHook, ) = IGenArt721CoreContractV3_Engine(
            coreContract
        ).projectTransferHookConfig(projectId);
        if (configuredHook != address(this)) {
            revert HookNotConfiguredForProject({
                coreContract: coreContract,
                projectId: projectId,
                configuredHook: configuredHook
            });
        }
    }

    /**
     * @notice Indicates support for `ITransferHook`, which v3.3 cores require
     * before a hook may be configured.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AbstractTransferHook, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IOwnerHistoryTransferHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
