// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {AbstractTransferHook} from "../../engine/V3/transfer-hooks/AbstractTransferHook.sol";
import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";

import {IMintTimeAndTransferCountHooks} from "../../interfaces/v0.8.x/IMintTimeAndTransferCountHooks.sol";
import {ITransferHook} from "../../interfaces/v0.8.x/ITransferHook.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {IGenArt721CoreContractV3_Engine} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Mint-time and transfer-count combined hook
 * @author Art Blocks Inc.
 * @notice Reference combined hook. Records each token's mint timestamp and
 * subsequent transfer count on chain, and injects those values — plus live
 * seconds since mint — into the token's PostParams when they are read.
 * Optionally writes `transferCount` as a real PMP so transfers emit
 * `TokenParamsConfigured` and can trigger off-chain re-renders.
 * ----------------------------------------------------------------------------
 * A single deployment serves every project on the bound PMP, on every v3.3+
 * Engine core on the network, that configures this address as its transfer
 * hook. There is no owner and no allowlist. Constructor takes the PMP
 * contract this hook is authorized to write to (`address(0)` to skip PMP
 * writes). An artist points their project at this address as follows:
 *
 * 1. Core transfer hook, via `configureProjectTransferHook` on a v3.3+ Engine
 *    or Engine Flex core. This is what records mint time (`from == address(0)`)
 *    and increments transfer count. May be made permanent with
 *    `lockProjectTransferHook`.
 * 2. PMP project param (optional, required for a populated `transferCount`
 *    PMP from mint and for transfer-triggered re-renders), via
 *    `configureProject` on the bound PMP. Configure a param with:
 *    - key: `transferCount`
 *    - `authOption`: `Address`
 *    - `authAddress`: this hook
 *    - `paramType`: `Uint256Range`
 *    - `minRange`: 0
 *    - `maxRange`: `type(uint256).max` (do not set a small max — a transfer
 *      that would exceed it will skip the PMP write rather than revert)
 *    - `pmpLockedAfterTimestamp`: 0 (do not lock this param). On PMPV1 a
 *      passed lock timestamp also freezes token values and later writes are
 *      skipped; PMPV0 only locks further project-config changes.
 *    Do **not** set this contract as `tokenPMPPostConfigHook`. An existing
 *    post-config hook on the project still runs on every `transferCount`
 *    write; if it reverts, the PMP write is skipped and the mint or transfer
 *    still succeeds.
 * 3. PMP read-augmentation hook, via `configureProjectHooks` on the same PMP,
 *    passing this address as `tokenPMPReadAugmentationHook`. This injects
 *    `mintTimestamp`, live `secondsSinceMint`, and `transferCount` on read.
 *
 * Transfer-hook-only still records state, which other contracts (including an
 * artwork script through the on-chain generator) can read via the view
 * functions. Augment-hook-only injects zeros, because nothing was recorded.
 * PMP Address-auth without the transfer hook never writes, because only this
 * contract is authorized.
 * ----------------------------------------------------------------------------
 * POSTPARAMS. On each read this hook copies the input params, drops any
 * existing entries whose keys collide with the keys below (this hook is the
 * source of truth for them), and appends:
 *
 * - `mintTimestamp`: unix seconds of the mint block, as a decimal string.
 *   `"0"` if this hook did not observe the mint.
 * - `secondsSinceMint`: `block.timestamp - mintTimestamp` at the time of the
 *   read, as a decimal string. `"0"` if the mint was not observed.
 * - `transferCount`: ownership-changing transfers after mint, as a decimal
 *   string. Does not include the mint itself. `"0"` until a post-mint transfer
 *   is recorded.
 *
 * `secondsSinceMint` is computed at read time, so two reads of the same token
 * in different blocks return different values. It is not stored as a PMP.
 *
 * `transferCount` is additionally written to the bound PMP at mint (`0`) and
 * on each counted transfer when the project has configured that key with
 * Address auth as described above. That write emits `TokenParamsConfigured`
 * from the PMP contract, so the param is populated from the first render and
 * later transfers can trigger off-chain re-renders. Do not also configure
 * `mintTimestamp` or `secondsSinceMint` as project PMPs — they are
 * inject-only.
 * ----------------------------------------------------------------------------
 * COMPLETENESS. Mint timestamp is only recorded if this hook was the project's
 * transfer hook at mint. A hook configured mid-life starts counting transfers
 * from the first ownership change it sees; `isTrackedFromMint` is false and
 * `mintTimestamp` / `secondsSinceMint` stay `0`. Historical transfers from
 * before configuration are not backfilled. If the project's transfer hook is
 * later cleared, recording stops — values already written stay readable and
 * the augment hook will keep injecting them.
 * ----------------------------------------------------------------------------
 * TRANSFER COUNT. Incremented for each ownership-changing transfer after mint.
 * Not incremented for:
 * - the mint itself (`from == address(0)`)
 * - ERC-721 self-transfers (`from == to`), which do not change ownership
 *
 * Cores do not currently burn; a burn (`to == address(0)`) would count.
 * ----------------------------------------------------------------------------
 * GAS. State is one packed storage slot per token (`uint64` mint timestamp +
 * `uint64` transfer count). Both sets of figures below are deltas against an
 * otherwise identical project with no hook, on the same `GenArt721CoreV3_Engine`
 * core, so they may be compared directly. Without a PMP write:
 *
 * - a mint costs about 40,500 gas more. Most of it is the new storage slot
 *   plus the core's reentrancy flag, which any hook pays.
 * - a transfer costs about 28,100 gas more — an SSTORE update of the packed
 *   count, plus the same reentrancy flag.
 *
 * A successful PMP `configureTokenParams` write on mint or transfer is extra
 * on top of that. With Address-auth `transferCount` writes enabled:
 *
 * - a mint costs about 92,700 gas more (about 52,200 for the PMP write)
 * - a transfer costs about 78,300 gas more (about 50,200 for the PMP write)
 *
 * See the gas tests in `mint-time-and-transfer-count-hooks.test.ts` for the
 * bounds that keep these figures honest.
 * ----------------------------------------------------------------------------
 * SAFETY. A reverting hook aborts the transfer that invoked it, so a hook that
 * can revert can make a token permanently non-transferable. Local recording
 * cannot revert on a transfer of a project that has this hook configured: the
 * only revert path is the configuration check below, which is true by
 * construction whenever the core actually dispatches to this address.
 * The PMP write is `try`/`catch`'d — a missing, locked, or out-of-range
 * `transferCount` param emits `TransferCountPMPSyncFailed` and does **not**
 * revert the transfer. The augment path is `view` and returns zeros rather
 * than reverting when a token has not been recorded.
 */
contract MintTimeAndTransferCountHooks is
    AbstractTransferHook,
    AbstractPMPAugmentHook,
    IMintTimeAndTransferCountHooks
{
    using Strings for uint256;

    /// @notice PostParam key for the unix seconds of the mint block.
    string public constant PARAM_KEY_MINT_TIMESTAMP = "mintTimestamp";
    /// @notice PostParam key for live seconds since the recorded mint.
    string public constant PARAM_KEY_SECONDS_SINCE_MINT = "secondsSinceMint";
    /// @notice PostParam key for post-mint ownership-changing transfer count.
    string public constant PARAM_KEY_TRANSFER_COUNT = "transferCount";

    /**
     * @notice PMP contract this hook writes `transferCount` to.
     * @dev `address(0)` skips PMP writes. One deployment per PMP instance.
     */
    IPMPV0 public immutable pmp;

    /**
     * @param pmp_ PMP contract this hook is authorized to write `transferCount`
     * on. Pass `address(0)` to disable PMP writes (transfer-hook-only).
     */
    constructor(address pmp_) {
        pmp = IPMPV0(pmp_);
    }

    /**
     * @notice Per-token state, keyed by core contract.
     * @dev Keying by `coreContract` is what makes a single shared deployment
     * safe: `AbstractTransferHook` guarantees `coreContract == msg.sender`, so
     * a contract impersonating a core can only ever write beneath its own
     * address, where nothing reads. The configuration check in
     * `_onTokenTransfer` is a second, independent guard.
     */
    mapping(address coreContract => mapping(uint256 tokenId => TokenTransferState))
        private _state;

    /**
     * @notice Record a mint timestamp or increment transfer count.
     * @dev Called by the core after the ERC-721 ownership write, and on mint
     * after the token hash seed is assigned.
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
        // change, so counting it would inflate `transferCount`.
        if (from == to) {
            return;
        }

        TokenTransferState storage state = _state[coreContract][tokenId];

        if (from == address(0)) {
            // mint: record timestamp once, do not count as a transfer, and
            // write transferCount=0 so the PMP is populated from first render
            if (state.mintTimestamp == 0) {
                // @dev uint64 seconds is not a practical bound; no cast check
                uint64 timestamp = uint64(block.timestamp);
                state.mintTimestamp = timestamp;
                emit MintTimestampRecorded({
                    coreContract: coreContract,
                    tokenId: tokenId,
                    timestamp: timestamp
                });
                _syncTransferCountToPMP({
                    coreContract: coreContract,
                    tokenId: tokenId,
                    newCount: 0
                });
            }
            return;
        }

        uint64 newCount = state.transferCount + 1;
        state.transferCount = newCount;
        emit TransferCounted({
            coreContract: coreContract,
            tokenId: tokenId,
            transferCount: newCount,
            from: from,
            to: to
        });
        _syncTransferCountToPMP({
            coreContract: coreContract,
            tokenId: tokenId,
            newCount: newCount
        });
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Copies the input params, drops any entries whose keys collide with this
     * hook's reserved keys, and appends `mintTimestamp`, `secondsSinceMint`,
     * and `transferCount` as decimal strings.
     * @dev This hook is called when a token's PostParams are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param coreContract The address of the core contract of the queried token.
     * @param tokenId The tokenId of the queried token.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address coreContract,
        uint256 tokenId,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override(AbstractPMPAugmentHook, IPMPAugmentHook)
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        uint256 originalLength = tokenParams.length;
        // at most originalLength kept entries + 3 injected keys
        uint256 augmentedMaxLength = originalLength + 3;
        augmentedTokenParams = new IWeb3Call.TokenParam[](augmentedMaxLength);

        bytes32 hashedMintTimestamp = keccak256(
            bytes(PARAM_KEY_MINT_TIMESTAMP)
        );
        bytes32 hashedSecondsSinceMint = keccak256(
            bytes(PARAM_KEY_SECONDS_SINCE_MINT)
        );
        bytes32 hashedTransferCount = keccak256(
            bytes(PARAM_KEY_TRANSFER_COUNT)
        );

        uint256 j;
        for (uint256 i; i < originalLength; ) {
            bytes32 hashedKey = keccak256(bytes(tokenParams[i].key));
            if (
                hashedKey != hashedMintTimestamp &&
                hashedKey != hashedSecondsSinceMint &&
                hashedKey != hashedTransferCount
            ) {
                augmentedTokenParams[j] = tokenParams[i];
                unchecked {
                    ++j;
                }
            }
            unchecked {
                ++i;
            }
        }

        TokenTransferState memory state = _state[coreContract][tokenId];
        uint256 recordedMintTimestamp = uint256(state.mintTimestamp);
        uint256 elapsed = _secondsSinceMint({
            recordedMintTimestamp: recordedMintTimestamp
        });

        augmentedTokenParams[j] = IWeb3Call.TokenParam({
            key: PARAM_KEY_MINT_TIMESTAMP,
            value: recordedMintTimestamp.toString()
        });
        unchecked {
            ++j;
        }
        augmentedTokenParams[j] = IWeb3Call.TokenParam({
            key: PARAM_KEY_SECONDS_SINCE_MINT,
            value: elapsed.toString()
        });
        unchecked {
            ++j;
        }
        augmentedTokenParams[j] = IWeb3Call.TokenParam({
            key: PARAM_KEY_TRANSFER_COUNT,
            value: uint256(state.transferCount).toString()
        });
        unchecked {
            ++j;
        }

        // shorten to the populated length (original minus stripped plus 3)
        assembly {
            mstore(augmentedTokenParams, j)
        }
        return augmentedTokenParams;
    }

    /**
     * @inheritdoc IMintTimeAndTransferCountHooks
     */
    function tokenTransferState(
        address coreContract,
        uint256 tokenId
    ) external view returns (TokenTransferState memory state) {
        return _state[coreContract][tokenId];
    }

    /**
     * @inheritdoc IMintTimeAndTransferCountHooks
     */
    function mintTimestamp(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return uint256(_state[coreContract][tokenId].mintTimestamp);
    }

    /**
     * @inheritdoc IMintTimeAndTransferCountHooks
     */
    function transferCount(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return uint256(_state[coreContract][tokenId].transferCount);
    }

    /**
     * @inheritdoc IMintTimeAndTransferCountHooks
     */
    function secondsSinceMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (uint256) {
        return
            _secondsSinceMint({
                recordedMintTimestamp: uint256(
                    _state[coreContract][tokenId].mintTimestamp
                )
            });
    }

    /**
     * @inheritdoc IMintTimeAndTransferCountHooks
     */
    function isTrackedFromMint(
        address coreContract,
        uint256 tokenId
    ) external view returns (bool) {
        return _state[coreContract][tokenId].mintTimestamp != 0;
    }

    /**
     * @notice Write `transferCount` to the bound PMP as the Address-auth
     * caller, including `0` at mint so the param exists before any transfer.
     * Failures are swallowed so a misconfigured PMP cannot brick mints or
     * transfers.
     */
    function _syncTransferCountToPMP(
        address coreContract,
        uint256 tokenId,
        uint64 newCount
    ) private {
        if (address(pmp) == address(0)) {
            return;
        }
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: PARAM_KEY_TRANSFER_COUNT,
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(uint256(newCount)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        try
            pmp.configureTokenParams(coreContract, tokenId, pmpInputs)
        {} catch {
            emit TransferCountPMPSyncFailed({
                coreContract: coreContract,
                tokenId: tokenId,
                transferCount: newCount
            });
        }
    }

    /**
     * @notice Live seconds since `recordedMintTimestamp`. `0` when the mint
     * was not observed or `block.timestamp` is not after it.
     */
    function _secondsSinceMint(
        uint256 recordedMintTimestamp
    ) private view returns (uint256) {
        if (
            recordedMintTimestamp == 0 ||
            block.timestamp < recordedMintTimestamp
        ) {
            return 0;
        }
        return block.timestamp - recordedMintTimestamp;
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
     * @notice Indicates support for `ITransferHook` (required by v3.3 cores)
     * and `IPMPAugmentHook` (required by PMP before a read-augmentation hook
     * may be configured).
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AbstractTransferHook, AbstractPMPAugmentHook, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IMintTimeAndTransferCountHooks).interfaceId ||
            interfaceId == type(ITransferHook).interfaceId ||
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
