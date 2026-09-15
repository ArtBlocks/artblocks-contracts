// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {AbstractTransferHook} from "../../engine/V3/transfer-hooks/AbstractTransferHook.sol";
import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";
import {AbstractPMPConfigureHook} from "../configure-hooks/AbstractPMPConfigureHook.sol";

import {IFormPaletteBindingHooks} from "../../interfaces/v0.8.x/IFormPaletteBindingHooks.sol";
import {ITransferHook} from "../../interfaces/v0.8.x/ITransferHook.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";
import {IPMPConfigureHook} from "../../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_Engine} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Form/palette binding combined hook
 * @author Art Blocks Inc.
 * @notice Binds one token of a "palette" project to one token of a "form"
 * project. The form project is the artwork whose image depends on the pairing;
 * the palette project supplies something the form's script consumes — in
 * practice, a second token's hash. Both projects are fixed at deployment and
 * this contract has no owner and no mutable configuration.
 * ----------------------------------------------------------------------------
 * The pairing is 1:1 and requires common ownership: a palette token may be
 * bound to at most one form token, a form token to at most one palette token,
 * and both must be held by the same wallet at the moment of binding. Either
 * token changing hands breaks the pairing.
 * ----------------------------------------------------------------------------
 * THREE HOOKS, ONE STATE MACHINE. Canonical state is this contract's pair of
 * mappings; everything else derives from them.
 *
 * - The **configure hook** is the only way a collector changes state. It runs
 *   on every write of the form project's binding param and either binds,
 *   unbinds, or reverts.
 * - The **transfer hook** runs on both projects. When a bound token moves, it
 *   clears the pairing directly, then writes the form token's binding param so
 *   the off-chain pipeline re-renders the form token.
 * - The **augment hook** runs on both projects. It reports canonical state on
 *   read, and strips the raw binding param so a stale value can never reach an
 *   artwork script.
 * ----------------------------------------------------------------------------
 * ONE WRITE, ONE RE-RENDER. `PMPV1.configureTokenParams` is `nonReentrant` and
 * invokes the configure hook inside that call, so a configure hook cannot write
 * any PostParam — not on the configured token, not on another one. A single
 * `configureTokenParams` call is also scoped to a single token. Since writing a
 * PostParam is the only thing that triggers an off-chain re-render, exactly one
 * token can re-render per write.
 *
 * That is why binding is strict: a write that binds a palette to a form token
 * is rejected unless **both** sides are currently unbound. Re-pointing either
 * side would silently change a third token's image without writing it, leaving
 * a stored render that no longer matches the chain. Every transition therefore
 * moves through the unbound state, and the token whose image changed is always
 * the token that was written.
 *
 * Strict does not mean two transactions. `configureTokenParams` applies its
 * `pmpInputs` in order and invokes the configure hook after each, so passing
 * `[unbound, newPalette]` for the binding key moves one form token from one
 * palette to another in a single atomic write: the pairing still passes through
 * the unbound state, and PMP emits one `TokenParamsConfigured` for that token,
 * so it re-renders once. Prefer that over two transactions.
 *
 * What the strict rule actually forbids is taking a palette that is bound to a
 * *different* form token. No input list on one token can do that, because the
 * other form token would not be written: `PaletteAlreadyBound` is raised no
 * matter how the inputs are ordered. That move needs a write on each form
 * token, which is two `configureTokenParams` calls — one user action, one
 * transaction on a wallet that batches, two otherwise. `previewBind` reports
 * which case a front end is in.
 * ----------------------------------------------------------------------------
 * REQUIRED SETUP. Four steps, in this order. Steps 2-4 are independent of each
 * other but all require the deployed hook address from step 1.
 *
 * 1. Deploy this contract with the PMP contract the projects use, and the
 *    (core, projectId) pair for each side. The palette project ID must not be
 *    `0`, because `UNBOUND_PARAM_VALUE` is `0` and no palette token ID may
 *    collide with it.
 *
 * 2. Configure the binding param on the **form** project, via `configureProject`
 *    on the bound PMP:
 *    - key: `boundPaletteTokenId` (`PARAM_KEY_BOUND_PALETTE_TOKEN_ID`)
 *    - `paramType`: `Uint256Range`
 *    - `authOption`: `TokenOwnerAndAddress`
 *    - `authAddress`: this hook. Required — without it the transfer hook cannot
 *      write the unbind that triggers the form token's re-render.
 *    - `minRange`: `0` (`UNBOUND_PARAM_VALUE`)
 *    - `maxRange`: `bindingParamMaxRange` — the highest token ID the palette
 *      project can ever encode (token number 999,999), not its last minted
 *      token. Minted-supply bounds are enforced by this hook's `ownerOf`
 *      check, not by the range.
 *    - `pmpLockedAfterTimestamp`: `0`. Do not lock. On PMPV1 a passed lock
 *      timestamp freezes the param's value for every party, which would make
 *      existing bindings permanent and unbreakable.
 *
 *    Verify these off chain after deployment by reading `getProjectPMPConfig`
 *    on the bound PMP — this contract deliberately does not re-check them, as
 *    nothing on chain branches on the answer.
 *
 * 3. Configure this address on the bound PMP via `configureProjectHooks`:
 *    - form project: as **both** `tokenPMPPostConfigHook` and
 *      `tokenPMPReadAugmentationHook`
 *    - palette project: as `tokenPMPReadAugmentationHook` only. The palette
 *      project has no binding param, so it needs no configure hook.
 *
 * 4. Configure this address as the transfer hook on **both** projects, via
 *    `configureProjectTransferHook` on each core. Required on both: a pairing
 *    must break when either side moves. A project that skips this keeps stale
 *    pairings in storage until the next binding param write.
 *
 * The artist must not configure `boundPaletteTokenHash` or `boundFormTokenId`
 * as project params — they are inject-only and are stripped on read.
 * ----------------------------------------------------------------------------
 * POSTPARAMS. On every read this hook copies the input params, drops any entry
 * whose key collides with the three keys below, and appends the ones for that
 * token's side. Values are canonical state, never the raw stored param.
 *
 * On a **form** token:
 * - `boundPaletteTokenId`: decimal token ID of the bound palette token, or the
 *   empty string when unbound.
 * - `boundPaletteTokenHash`: that palette token's `tokenIdToHash`, always
 *   `0x` + 64 lowercase hex characters, zero-padded. Empty string when unbound.
 *   This matches the conventional padded `tokenData.hash`. Note that the
 *   on-chain `GenArt721GeneratorV0` stringifies hashes with the unpadded
 *   `Strings.toHexString(uint256)`, which drops leading zero bytes on roughly
 *   one hash in 256. A script sharing one derivation between its own
 *   `tokenData.hash` and this key must zero-pad to 32 bytes before deriving, or
 *   those tokens will disagree.
 *
 * On a **palette** token:
 * - `boundFormTokenId`: decimal token ID of the form token it is bound to, or
 *   the empty string when unbound.
 *
 * Injecting the palette token's hash, rather than derived palette data, is
 * deliberate. The palette project's script already turns that hash into a
 * palette; the form project's script can call the identical function on the
 * identical input. Nothing about the palette needs to be stored on chain,
 * re-implemented in Solidity, or kept in sync across two languages.
 * ----------------------------------------------------------------------------
 * ART SCRIPT. Both keys arrive as strings on the web3call flex dependency:
 *
 *   const params = tokenData.externalAssetDependencies
 *     .find((d) => d.dependency_type === "ONCHAIN")?.data;
 *   const paletteHash = params?.["boundPaletteTokenHash"]; // "" when unbound
 *   const palette = paletteHash
 *     ? paletteFromHash(paletteHash)   // the palette project's own function
 *     : defaultPalette;
 *
 * The form project's script must render something meaningful when unbound:
 * that is the state every form token is in at mint, and the state it returns to
 * on every transfer.
 * ----------------------------------------------------------------------------
 * READ-TIME OWNERSHIP BACKSTOP. The augment hook re-checks that both tokens
 * still share an owner before reporting a pairing. In a correctly configured
 * deployment the transfer hook has already cleared it and the check never
 * fires. It exists because a project that never configured the transfer hook,
 * or cleared it later, would otherwise render a pairing across two wallets —
 * violating the piece's core rule.
 *
 * That degraded mode is the most likely operator-facing failure, so be precise
 * about what it costs. The mappings still occupy both slots, so: the artwork
 * renders unbound while `boundPaletteOf` and `previewBind` still report the
 * pairing; the palette cannot be bound to any other form token
 * (`PaletteAlreadyBound`); the palette's new holder has no way to clear it,
 * because only the form token's owner or this hook may write the binding param;
 * and returning the token to its former owner makes the pairing render again,
 * because nothing cleared the mapping. The single repair is the form token's
 * owner writing `UNBOUND_PARAM_VALUE`. Configuring the transfer hook on both
 * projects is what prevents all of it.
 * ----------------------------------------------------------------------------
 * SCALING. Every operation is O(1). State is two `uint256` mappings keyed by
 * token ID; no list of tokens, projects, or palettes is ever built or walked,
 * so cost is independent of project size.
 *
 * The mappings are not keyed by core contract. They do not need to be: both
 * cores and both project IDs are immutable, and each mapping is only ever keyed
 * by token IDs of its own side. Two separate cores can host projects with the
 * same ID and therefore numerically identical token IDs; the two mappings still
 * keep them apart, because a form token ID is only ever written to
 * `_formToPalette` and a palette token ID only to `_paletteToForm`.
 * ----------------------------------------------------------------------------
 * GAS. Transfer figures are deltas against an identical project with no hook,
 * on `GenArt721CoreV3_Engine_Flex` with PMPV1, so they may be compared
 * directly. Whoever moves the token pays them, on every transfer, forever.
 *
 * - transferring an **unbound** token costs about 20,700 gas more. That is the
 *   core's reentrancy flag, the configuration check, and one cold mapping read
 *   that comes back empty. Any hook pays most of it.
 * - transferring a **bound** token costs about 46,200 gas more — the above plus
 *   clearing two slots and the PMP write that re-renders the form token. The
 *   figure is the same whichever side moves, because either way exactly one
 *   param is written, on the form token.
 *
 * Binding is about 159,500 gas and unbinding about 67,200, both absolute and
 * both paid by the collector. Binding is the expensive direction because it
 * writes three cold slots: the PMP's stored value plus both mappings.
 *
 * See the gas tests in `form-palette-binding-hooks.test.ts` for the bounds that
 * keep these figures honest.
 * ----------------------------------------------------------------------------
 * SAFETY. A reverting transfer hook makes a token permanently non-transferable,
 * so `_onTokenTransfer` cannot revert on any path that a configured project can
 * reach: state clearing is pure storage, and the PMP write is `try`/`catch`'d.
 * A swallowed write emits `BindingParamSyncFailed`; the pairing is still broken
 * on chain and reads are still correct, and any authorized party repairs the
 * stored render by writing the binding param.
 *
 * The configure hook is the opposite: it reverts loudly, because a rejected
 * write costs a collector a transaction rather than a collection. It also
 * accepts calls only from the bound PMP — it mutates state, and PMP hooks are
 * otherwise callable by anyone.
 */
contract FormPaletteBindingHooks is
    AbstractTransferHook,
    AbstractPMPAugmentHook,
    AbstractPMPConfigureHook,
    IFormPaletteBindingHooks
{
    using Strings for uint256;

    /// @notice Binding param on the form project, written by collectors to
    /// bind and unbind, and by this hook to unbind on transfer.
    string public constant PARAM_KEY_BOUND_PALETTE_TOKEN_ID =
        "boundPaletteTokenId";
    /// @notice Inject-only key on form tokens carrying the bound palette
    /// token's hash. Must not be configured as a project param.
    string public constant PARAM_KEY_BOUND_PALETTE_TOKEN_HASH =
        "boundPaletteTokenHash";
    /// @notice Inject-only key on palette tokens carrying the form token they
    /// are bound to. Must not be configured as a project param.
    string public constant PARAM_KEY_BOUND_FORM_TOKEN_ID = "boundFormTokenId";

    /**
     * @notice Binding param value meaning "not bound".
     * @dev `0` is unambiguous because the constructor rejects a palette project
     * ID of `0`, so no palette token ID can equal it.
     */
    uint256 public constant UNBOUND_PARAM_VALUE = 0;

    // @dev derived from the constants above rather than restated as literals,
    // so a key and its hash cannot drift apart
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_ID =
        keccak256(bytes(PARAM_KEY_BOUND_PALETTE_TOKEN_ID));
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_HASH =
        keccak256(bytes(PARAM_KEY_BOUND_PALETTE_TOKEN_HASH));
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_FORM_TOKEN_ID =
        keccak256(bytes(PARAM_KEY_BOUND_FORM_TOKEN_ID));

    /// @notice PMP contract this hook reads config from and writes unbinds to.
    IPMPV0 public immutable pmp;
    /// @notice Core contract hosting the form project.
    address public immutable formCore;
    /// @notice Project ID of the form project on `formCore`.
    uint256 public immutable formProjectId;
    /// @notice Core contract hosting the palette project.
    address public immutable paletteCore;
    /// @notice Project ID of the palette project on `paletteCore`.
    uint256 public immutable paletteProjectId;
    /// @notice Required `maxRange` of the binding param: the last token ID of
    /// the palette project.
    uint256 public immutable bindingParamMaxRange;

    /**
     * @notice Canonical state, stored as `tokenId + 1` so that `0` reads as
     * unbound without reserving a real token ID.
     * @dev `+ 1` rather than a sentinel token ID keeps token `0` of either
     * project representable, which matters for the form side: only the palette
     * project ID is constrained to be non-zero.
     */
    mapping(uint256 formTokenId => uint256 paletteTokenIdPlusOne)
        private _formToPalette;
    mapping(uint256 paletteTokenId => uint256 formTokenIdPlusOne)
        private _paletteToForm;

    /**
     * @param pmp_ PMP contract both projects use. Must be non-zero: this hook
     * reads project config from it and writes transfer-driven unbinds to it.
     * @param formCore_ Core contract hosting the form project.
     * @param formProjectId_ Project ID of the form project. `0` is allowed —
     * only the palette side carries the sentinel constraint, because a form
     * token ID is never a binding param *value*, and the mappings store
     * `tokenId + 1` so form token `0` stays distinguishable from unbound.
     * @param paletteCore_ Core contract hosting the palette project. May equal
     * `formCore_`.
     * @param paletteProjectId_ Project ID of the palette project. Must not be
     * `0`; see `UNBOUND_PARAM_VALUE`.
     */
    constructor(
        address pmp_,
        address formCore_,
        uint256 formProjectId_,
        address paletteCore_,
        uint256 paletteProjectId_
    ) {
        bool sameProject = formCore_ == paletteCore_ &&
            formProjectId_ == paletteProjectId_;
        if (
            pmp_ == address(0) ||
            formCore_ == address(0) ||
            paletteCore_ == address(0) ||
            paletteProjectId_ == 0 ||
            sameProject
        ) {
            revert InvalidConstructorArgs();
        }
        pmp = IPMPV0(pmp_);
        formCore = formCore_;
        formProjectId = formProjectId_;
        paletteCore = paletteCore_;
        paletteProjectId = paletteProjectId_;
        bindingParamMaxRange = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: paletteProjectId_,
            tokenNumber: 999_999
        });
    }

    // ---- configure hook ----

    /**
     * @notice Apply a write of the form project's binding param.
     * @dev Called by the PMP inside `configureTokenParams`, after the value has
     * been stored and authorized. Reverting here reverts the collector's whole
     * transaction, including the stored value.
     * @dev Writes of any other key are ignored, so the form project may carry
     * unrelated params freely.
     * @param coreContract Core contract whose token was configured.
     * @param tokenId Token that was configured.
     * @param pmpInput The param input that was stored.
     */
    function onTokenPMPConfigure(
        address coreContract,
        uint256 tokenId,
        IPMPV0.PMPInput calldata pmpInput
    ) external override(AbstractPMPConfigureHook, IPMPConfigureHook) {
        // @dev this hook mutates state; PMP hook entry points are otherwise
        // callable by anyone, which would let a caller forge bindings
        if (msg.sender != address(pmp)) {
            revert OnlyPMP({caller: msg.sender});
        }
        if (
            keccak256(bytes(pmpInput.key)) !=
            _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_ID
        ) {
            return;
        }
        // @dev the binding param belongs to the form project only; reaching
        // here from anywhere else means this hook is misconfigured
        if (
            coreContract != formCore ||
            ABHelpers.tokenIdToProjectId(tokenId) != formProjectId
        ) {
            revert ConfigureHookOnUnexpectedProject({
                coreContract: coreContract,
                tokenId: tokenId
            });
        }
        _applyBindingParam({
            formTokenId: tokenId,
            newPaletteTokenId: uint256(pmpInput.configuredValue)
        });
    }

    // ---- transfer hook ----

    /**
     * @notice Break the pairing of a token that changed hands, and re-render
     * the form token.
     * @dev Called by the core after the ERC-721 ownership write. Must not
     * revert on any reachable path: a reverting transfer hook makes the token
     * permanently non-transferable.
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
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        _onlyConfiguredForProject({
            coreContract: coreContract,
            projectId: projectId
        });

        // @dev ERC-721 permits `transferFrom(a, a, id)`; ownership did not
        // change, so the pairing is still valid
        if (from == to) {
            return;
        }
        // @dev mint: a token cannot be bound before it exists
        if (from == address(0)) {
            return;
        }

        if (coreContract == formCore && projectId == formProjectId) {
            (bool isBound, uint256 paletteTokenId) = _boundPaletteOf(tokenId);
            if (!isBound) {
                return;
            }
            _clearBinding({
                formTokenId: tokenId,
                paletteTokenId: paletteTokenId,
                reason: UnbindReason.FormTransferred
            });
            _syncBindingParam({formTokenId: tokenId});
        } else if (
            coreContract == paletteCore && projectId == paletteProjectId
        ) {
            (bool isBound, uint256 formTokenId) = _boundFormOf(tokenId);
            if (!isBound) {
                return;
            }
            _clearBinding({
                formTokenId: formTokenId,
                paletteTokenId: tokenId,
                reason: UnbindReason.PaletteTransferred
            });
            _syncBindingParam({formTokenId: formTokenId});
        }
        // @dev configured on a project this hook does not serve: do nothing.
        // Reverting would brick that project's transfers for no benefit.
    }

    // ---- augment hook ----

    /**
     * @notice Replace this hook's keys with canonical binding state.
     * @dev Copies the input params, drops any entry whose key collides with one
     * of this hook's three keys — including the collector's own raw binding
     * param, so a value that disagrees with canonical state can never reach an
     * artwork script — then appends the keys for the token's side.
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
        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        bool isFormToken = coreContract == formCore &&
            projectId == formProjectId;
        bool isPaletteToken = coreContract == paletteCore &&
            projectId == paletteProjectId;
        // @dev configured on a project this hook does not serve: pass through
        // untouched rather than stripping keys that belong to someone else
        if (!isFormToken && !isPaletteToken) {
            return tokenParams;
        }

        uint256 originalLength = tokenParams.length;
        // at most originalLength kept entries + 2 injected keys
        augmentedTokenParams = new IWeb3Call.TokenParam[](originalLength + 2);

        uint256 j;
        for (uint256 i; i < originalLength; ) {
            bytes32 hashedKey = keccak256(bytes(tokenParams[i].key));
            if (
                hashedKey != _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_ID &&
                hashedKey != _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_HASH &&
                hashedKey != _HASHED_PARAM_KEY_BOUND_FORM_TOKEN_ID
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

        if (isFormToken) {
            (bool isBound, uint256 paletteTokenId) = _resolveBoundPalette({
                formTokenId: tokenId
            });
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
                value: isBound ? paletteTokenId.toString() : ""
            });
            unchecked {
                ++j;
            }
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_PALETTE_TOKEN_HASH,
                value: isBound
                    ? uint256(
                        IGenArt721CoreContractV3_Base(paletteCore)
                            .tokenIdToHash(paletteTokenId)
                    ).toHexString(32)
                    : ""
            });
            unchecked {
                ++j;
            }
        } else {
            (bool isBound, uint256 formTokenId) = _resolveBoundForm({
                paletteTokenId: tokenId
            });
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_FORM_TOKEN_ID,
                value: isBound ? formTokenId.toString() : ""
            });
            unchecked {
                ++j;
            }
        }

        // shorten to the populated length (original minus stripped plus injected)
        assembly {
            mstore(augmentedTokenParams, j)
        }
        return augmentedTokenParams;
    }

    // ---- views ----

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function boundPaletteOf(
        uint256 formTokenId
    ) external view returns (bool isBound, uint256 paletteTokenId) {
        return _boundPaletteOf({formTokenId: formTokenId});
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function boundFormOf(
        uint256 paletteTokenId
    ) external view returns (bool isBound, uint256 formTokenId) {
        return _boundFormOf({paletteTokenId: paletteTokenId});
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function previewBind(
        uint256 formTokenId,
        uint256 paletteTokenId
    ) external view returns (bool allowed, BindBlocker blocker) {
        // @dev checks follow the order `_applyBindingParam` applies them, so the
        // reported blocker is the condition that would actually fail first.
        // Conditions rejected before this hook runs at all — a non-form project,
        // or a value outside the param's range — surface as PMP reverts rather
        // than as blockers.
        if (ABHelpers.tokenIdToProjectId(formTokenId) != formProjectId) {
            return (false, BindBlocker.FormTokenNotInFormProject);
        }
        (bool formBound, uint256 currentPaletteTokenId) = _boundPaletteOf({
            formTokenId: formTokenId
        });
        // @dev re-writing the pairing that already exists is accepted as a
        // no-op, so report it as allowed; a front end that unbound first here
        // would flicker the form token through the unbound state for nothing
        if (formBound && currentPaletteTokenId == paletteTokenId) {
            return (true, BindBlocker.None);
        }
        if (formBound) {
            return (false, BindBlocker.FormAlreadyBound);
        }
        if (ABHelpers.tokenIdToProjectId(paletteTokenId) != paletteProjectId) {
            return (false, BindBlocker.PaletteTokenNotInPaletteProject);
        }
        (bool paletteBound, ) = _boundFormOf({paletteTokenId: paletteTokenId});
        if (paletteBound) {
            return (false, BindBlocker.PaletteAlreadyBound);
        }
        address formOwner;
        try IERC721(formCore).ownerOf(formTokenId) returns (address owner_) {
            formOwner = owner_;
        } catch {
            return (false, BindBlocker.FormTokenDoesNotExist);
        }
        address paletteOwner;
        try IERC721(paletteCore).ownerOf(paletteTokenId) returns (
            address owner_
        ) {
            paletteOwner = owner_;
        } catch {
            return (false, BindBlocker.PaletteTokenDoesNotExist);
        }
        if (formOwner != paletteOwner) {
            return (false, BindBlocker.OwnerMismatch);
        }
        return (true, BindBlocker.None);
    }

    /**
     * @notice Indicates support for `ITransferHook` (required by v3.3 cores),
     * `IPMPAugmentHook` and `IPMPConfigureHook` (required by the PMP before
     * either hook may be configured).
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(
            AbstractTransferHook,
            AbstractPMPAugmentHook,
            AbstractPMPConfigureHook,
            IERC165
        )
        returns (bool)
    {
        return
            interfaceId == type(IFormPaletteBindingHooks).interfaceId ||
            interfaceId == type(ITransferHook).interfaceId ||
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ---- internals ----

    /**
     * @notice Apply a binding param value to canonical state.
     * @dev The strict state machine lives here. A write that would change an
     * existing pairing is rejected rather than applied, because the other token
     * involved would not be written and so would not re-render.
     * @param formTokenId Form token whose param was written.
     * @param newPaletteTokenId Written value; `UNBOUND_PARAM_VALUE` to unbind.
     */
    function _applyBindingParam(
        uint256 formTokenId,
        uint256 newPaletteTokenId
    ) private {
        (bool currentlyBound, uint256 currentPaletteTokenId) = _boundPaletteOf({
            formTokenId: formTokenId
        });

        if (newPaletteTokenId == UNBOUND_PARAM_VALUE) {
            // @dev idempotent: unbinding an unbound token is a no-op, which is
            // what makes the transfer hook's own write safe to replay
            if (!currentlyBound) {
                return;
            }
            _clearBinding({
                formTokenId: formTokenId,
                paletteTokenId: currentPaletteTokenId,
                reason: UnbindReason.Configured
            });
            return;
        }

        // @dev idempotent: re-writing the current pairing changes nothing
        if (currentlyBound && currentPaletteTokenId == newPaletteTokenId) {
            return;
        }
        if (currentlyBound) {
            revert FormAlreadyBound({
                formTokenId: formTokenId,
                paletteTokenId: currentPaletteTokenId
            });
        }
        if (
            ABHelpers.tokenIdToProjectId(newPaletteTokenId) != paletteProjectId
        ) {
            revert PaletteTokenNotInPaletteProject({
                paletteTokenId: newPaletteTokenId
            });
        }
        (bool paletteBound, uint256 boundFormTokenId) = _boundFormOf({
            paletteTokenId: newPaletteTokenId
        });
        if (paletteBound) {
            revert PaletteAlreadyBound({
                paletteTokenId: newPaletteTokenId,
                formTokenId: boundFormTokenId
            });
        }
        // @dev `ownerOf` reverts for a token that does not exist, so this also
        // rejects binding to an unminted palette token
        address formOwner = IERC721(formCore).ownerOf(formTokenId);
        address paletteOwner = IERC721(paletteCore).ownerOf(newPaletteTokenId);
        if (formOwner != paletteOwner) {
            revert OwnerMismatch({
                formOwner: formOwner,
                paletteOwner: paletteOwner
            });
        }

        unchecked {
            // @dev `+ 1` cannot overflow: both values are bounded token IDs
            _formToPalette[formTokenId] = newPaletteTokenId + 1;
            _paletteToForm[newPaletteTokenId] = formTokenId + 1;
        }
        emit Bound({
            formTokenId: formTokenId,
            paletteTokenId: newPaletteTokenId,
            owner: formOwner
        });
    }

    /**
     * @notice Clear both directions of a pairing.
     */
    function _clearBinding(
        uint256 formTokenId,
        uint256 paletteTokenId,
        UnbindReason reason
    ) private {
        delete _formToPalette[formTokenId];
        delete _paletteToForm[paletteTokenId];
        emit Unbound({
            formTokenId: formTokenId,
            paletteTokenId: paletteTokenId,
            reason: reason
        });
    }

    /**
     * @notice Write `UNBOUND_PARAM_VALUE` to a form token's binding param so
     * the off-chain pipeline re-renders it.
     * @dev Called only after canonical state is already cleared, so the
     * re-entrant `onTokenPMPConfigure` this triggers is a no-op. Failures are
     * swallowed: this runs inside a transfer, and a revert would make the token
     * non-transferable.
     */
    function _syncBindingParam(uint256 formTokenId) private {
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(UNBOUND_PARAM_VALUE),
            configuringArtistString: false,
            configuredValueString: ""
        });
        try
            pmp.configureTokenParams(formCore, formTokenId, pmpInputs)
        {} catch {
            emit BindingParamSyncFailed({formTokenId: formTokenId});
        }
    }

    /**
     * @notice Canonical pairing for a form token.
     */
    function _boundPaletteOf(
        uint256 formTokenId
    ) private view returns (bool isBound, uint256 paletteTokenId) {
        uint256 stored = _formToPalette[formTokenId];
        if (stored == 0) {
            return (false, 0);
        }
        unchecked {
            return (true, stored - 1);
        }
    }

    /**
     * @notice Canonical pairing for a palette token.
     */
    function _boundFormOf(
        uint256 paletteTokenId
    ) private view returns (bool isBound, uint256 formTokenId) {
        uint256 stored = _paletteToForm[paletteTokenId];
        if (stored == 0) {
            return (false, 0);
        }
        unchecked {
            return (true, stored - 1);
        }
    }

    /**
     * @notice Canonical pairing for a form token, reported only while both
     * tokens still share an owner.
     * @dev See the read-time ownership backstop note in the contract natspec.
     */
    function _resolveBoundPalette(
        uint256 formTokenId
    ) private view returns (bool isBound, uint256 paletteTokenId) {
        (isBound, paletteTokenId) = _boundPaletteOf({formTokenId: formTokenId});
        if (!isBound) {
            return (false, 0);
        }
        if (
            IERC721(formCore).ownerOf(formTokenId) !=
            IERC721(paletteCore).ownerOf(paletteTokenId)
        ) {
            return (false, 0);
        }
    }

    /**
     * @notice Canonical pairing for a palette token, reported only while both
     * tokens still share an owner.
     */
    function _resolveBoundForm(
        uint256 paletteTokenId
    ) private view returns (bool isBound, uint256 formTokenId) {
        (isBound, formTokenId) = _boundFormOf({paletteTokenId: paletteTokenId});
        if (!isBound) {
            return (false, 0);
        }
        if (
            IERC721(formCore).ownerOf(formTokenId) !=
            IERC721(paletteCore).ownerOf(paletteTokenId)
        ) {
            return (false, 0);
        }
    }

    /**
     * @notice Revert unless `coreContract` has this hook configured as the
     * transfer hook for `projectId`.
     * @dev This is the `ITransferHook` requirement that an implementation
     * verify which cores it serves. A contract impersonating a core could
     * answer dishonestly, but the immutable core and project IDs checked in
     * `_onTokenTransfer` confine it to doing nothing.
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
}
