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
import {ImmutableStringArray} from "../../libs/v0.8.x/ImmutableStringArray.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IERC165} from "@openzeppelin-5.0/contracts/interfaces/IERC165.sol";

/**
 * @title Form/palette binding combined hook
 * @author Art Blocks Inc.
 * @notice Binds one token of a "palette" project to one token of a "form"
 * project. The form project is the artwork whose image depends on the pairing;
 * a palette project supplies the palette its script paints with.
 *
 * This contract is also the registry and the resolver for that palette data. A
 * palette project is registered together with its complete, ordered list of
 * palette entries, and the contract decides which entry each palette token
 * resolves to. Both projects' scripts read that answer rather than computing
 * it, so there is exactly one implementation of the mapping and nothing to keep
 * in sync across two languages.
 *
 * Only the form project is fixed at deployment. Palette projects are
 * registered afterwards, on any core contract — the form project's own or any
 * other — so collections released long after the form project can still be
 * bound and painted. Registering one is the contract's only administrative
 * operation, it is append-only, and a project's entries are immutable once
 * written. There is no owner, no removal, and nothing else to configure. Every
 * other state change is a collector binding or unbinding.
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
 * - The **transfer hook** runs on the form project and on every palette
 *   project. When a bound token moves, it clears the pairing directly, then
 *   writes the form token's binding param so the off-chain pipeline re-renders
 *   the form token.
 * - The **augment hook** runs on the form project and on every palette project.
 *   It reports canonical state on read, resolves palette data, and strips the
 *   raw binding param so a stale value can never reach an artwork script.
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
 * PALETTE PROJECTS GROW. A form project is expected to outlive its first
 * palette collection. `registerPaletteProject` adds another, callable only by
 * the form project's artist, read live from the core so no owner is stored.
 *
 * Registration is append-only. Deregistration is not offered because it would
 * strand every pairing already made against that project: the palette holder
 * has no write path, and only the form token's owner can express an unbind.
 * Growing the set can never invalidate an existing pairing, which is what makes
 * appending safe to do at any time.
 *
 * Because the palette entries live here and both scripts read `paletteData`,
 * **neither art script changes when a palette project is added.** The form
 * project's script can be locked on day one and still paint collections that do
 * not exist yet. That is the whole reason palette data is on chain rather than
 * in the script.
 *
 * One thing does not happen automatically on registration: **configure this
 * contract as the new project's transfer hook** on its core. Without it,
 * binding works but a transfer of one of its tokens does not break the pairing
 * — the degraded mode described below.
 *
 * A palette project may be on any core, including the form project's own. That
 * is what the packed binding param below buys: nothing here assumes the artist
 * will still be minting on the same Art Blocks contract in five years.
 * ----------------------------------------------------------------------------
 * THE BINDING PARAM VALUE IS A PACKED TOKEN. A PostParam is a `uint256`, so the
 * value a collector writes has to name a `(coreContract, tokenId)` pair in one
 * number. It does so by packing them:
 *
 *     value = (uint256(uint160(coreContract)) << 96) | paletteTokenId
 *
 * An address is 160 bits and an Art Blocks token ID needs at most 96, so the
 * two fit a `uint256` exactly. Registration rejects a project ID whose tokens
 * could not fit, which makes the packing lossless rather than merely unlikely
 * to collide.
 *
 * Three properties follow, and each of them is the reason for the choice:
 *
 * - The value is derivable and decodable off chain by arithmetic alone. No
 *   contract call and no contract state are needed to compute what to write,
 *   though `bindingParamValueFor(coreContract, paletteTokenId)` is provided and
 *   also answers whether the project is registered.
 * - A mistyped value fails loudly. A collector who enters a bare token ID
 *   writes a number far below the core contract's bits, so it unpacks to the
 *   zero address, which is never a registered project. An encoding whose values
 *   resembled token IDs could instead have bound a different real token.
 * - `0` is free to mean unbound, because a registered core is never the zero
 *   address. Project `0` of any core is registrable, unlike under a bare
 *   token-ID scheme.
 *
 * Everything else in the interface — `boundPaletteOf`, `isPaletteProject`,
 * `previewBind`, `paletteDataFor`, every event and every error — speaks in
 * plain `(coreContract, tokenId)` terms. The packed value appears in one other
 * place, the stored PMP param, and the augment hook strips that before any art
 * script sees it.
 * ----------------------------------------------------------------------------
 * REQUIRED SETUP, ONE TIME. All of it concerns the form project, and steps 2-4
 * need the address deployed in step 1.
 *
 * 1. Deploy with the PMP contract every project here uses and the form
 *    project's `(core, projectId)`.
 *
 * 2. Configure the binding param on the **form** project, via `configureProject`
 *    on the bound PMP:
 *    - key: `boundPaletteTokenId` (`PARAM_KEY_BOUND_PALETTE_TOKEN_ID`)
 *    - `paramType`: `Uint256Range`
 *    - `authOption`: `TokenOwnerAndAddress`
 *    - `authAddress`: this hook. Required — without it the transfer hook cannot
 *      write the unbind that triggers the form token's re-render.
 *    - `minRange`: `0` (`UNBOUND_PARAM_VALUE`)
 *    - `maxRange`: `BINDING_PARAM_MAX_RANGE` (`type(uint256).max`). Deliberately
 *      unbounded: the palette project set grows, so any fixed range would need
 *      widening on every palette drop, and forgetting would surface as an
 *      opaque PMP range error instead of this hook's own. Which token IDs
 *      actually bind is decided here, against the registry and `ownerOf`.
 *    - `pmpLockedAfterTimestamp`: `0`. Do not lock. On PMPV1 a passed lock
 *      timestamp freezes the param's value for every party, which would make
 *      existing pairings permanent and unbreakable.
 *
 *    Verify these off chain after deployment by reading `getProjectPMPConfig`
 *    on the bound PMP — this contract deliberately does not re-check them, as
 *    nothing on chain branches on the answer.
 *
 * 3. `configureProjectHooks(formCore, formProjectId, thisHook, thisHook)` on the
 *    bound PMP — the form project needs this address as **both** the
 *    post-config hook and the read-augmentation hook.
 *
 * 4. `configureProjectTransferHook(formProjectId, thisHook)` on `formCore`.
 * ----------------------------------------------------------------------------
 * REQUIRED SETUP, PER PALETTE PROJECT. Repeat all three for every palette
 * collection, the first one included. Each omission breaks the collection in a
 * different and silent way, named below.
 *
 * A. `registerPaletteProject(coreContract, projectId, palettes)` on this
 *    contract, as the form project's artist. The entries are written once and
 *    can never be changed, replaced, or grown. Any core and any project ID are
 *    accepted except the form project itself.
 *    *Omitted:* `isPaletteProject` stays false, nothing in the collection can
 *    be bound, and its tokens resolve no palette.
 *
 * B. `configureProjectHooks(coreContract, projectId, address(0), thisHook)` on
 *    the bound PMP — read-augmentation hook only. A palette project carries no
 *    binding param, so it needs no configure hook.
 *    *Omitted:* binding still works and form tokens still paint correctly, but
 *    the collection's own tokens receive no `paletteData` and render whatever
 *    their script does with nothing.
 *
 * C. `configureProjectTransferHook(projectId, thisHook)` on that same core.
 *    *Omitted:* binding still works, but moving one of its tokens does not
 *    break the pairing. This is the only one of the three that leaves wrong
 *    state behind rather than absent state — see the degraded mode below.
 *
 * Each palette project also needs the PMP contract registered as an on-chain
 * flex asset dependency (`addProjectAssetDependencyOnChainAtAddress`), the same
 * as any project that uses PostParams, or nothing injected here reaches its
 * script.
 *
 * On neither side may the artist configure `boundPaletteCoreContract`,
 * `boundPaletteTokenHash`, `boundFormTokenId` or `paletteData` as project
 * params — they are inject-only and are stripped on read.
 * ----------------------------------------------------------------------------
 * POSTPARAMS. On every read this hook copies the input params, drops any entry
 * whose key collides with the five keys below, and appends the ones for that
 * token's side. Values are canonical state, never the raw stored param.
 *
 * On a **form** token:
 * - `boundPaletteTokenId`: decimal token ID of the bound palette token, or the
 *   empty string when unbound.
 * - `boundPaletteCoreContract`: the core contract that token lives on, as a
 *   `0x`-prefixed lowercase hex address; empty when unbound. Paired with
 *   `boundPaletteTokenId` it is the token's full identity, which a token ID
 *   alone is not once palette projects may live on several contracts. Its
 *   project ID is `boundPaletteTokenId / 1_000_000` if a script wants to label
 *   or vary by collection.
 * - `boundPaletteTokenHash`: that palette token's `tokenIdToHash`, always
 *   `0x` + 64 lowercase hex characters, zero-padded. Empty string when unbound.
 *   Provenance and a seed for any extra variation the form script wants to draw
 *   from the specific palette token it holds. **Do not derive the palette from
 *   it** — that is what `paletteData` is for, and re-deriving in JavaScript
 *   reintroduces exactly the second implementation this design removes.
 *   (For the record, the on-chain `GenArt721GeneratorV0` stringifies hashes
 *   with the unpadded `Strings.toHexString(uint256)`, dropping leading zero
 *   bytes on roughly one hash in 256; this key is always padded, so the two
 *   spellings differ for those tokens.)
 * - `paletteData`: the registered palette entry the bound palette token
 *   resolves to. Empty string when unbound.
 *
 * On a **palette** token:
 * - `boundFormTokenId`: decimal token ID of the form token it is bound to, or
 *   the empty string when unbound.
 * - `paletteData`: the entry that token resolves to, always — a palette token
 *   carries its own palette whether or not anything is bound to it.
 *
 * `paletteData` is the same key on both sides, and that is the point. The form
 * script and the palette script read one key and receive one answer, produced
 * once, here. Neither derives a palette, so there is no second implementation
 * to drift from and no bit-exactness contract between Solidity and JavaScript.
 *
 * Selection is `uint256(tokenIdToHash(paletteToken)) % paletteCount`. Because
 * this contract is the only thing that computes it, the rule is chosen to be
 * trivially auditable rather than to reproduce any existing script. Weighted
 * rarity is expressed by repeating an entry in the registered list.
 *
 * The entries themselves are opaque to this contract — JSON, packed hex, a
 * name, whatever the two scripts agree on. It stores and returns strings.
 * ----------------------------------------------------------------------------
 * ART SCRIPT. Every injected key arrives as a string on the web3call flex
 * dependency, and a palette costs one of them:
 *
 *   const params = tokenData.externalAssetDependencies
 *     .find((d) => d.dependency_type === "ONCHAIN")?.data;
 *   const paletteData = params?.["paletteData"]; // "" when none is in effect
 *   const palette = paletteData ? JSON.parse(paletteData) : defaultPalette;
 *
 * Identical in both projects. The palette project's script reads its own
 * entry; the form project's script reads the bound token's. Neither holds a
 * palette list, and neither needs updating when a collection is added, so both
 * may be locked.
 *
 * A form token is unbound at mint and returns to unbound on every transfer, so
 * the form script must render something meaningful for the empty case. A
 * palette token's own `paletteData` is never empty once its project is
 * registered.
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
 * because nothing cleared the mapping. The palette token keeps rendering its
 * own `paletteData` throughout — only the pairing is hidden. The single repair
 * is the form token's owner writing `UNBOUND_PARAM_VALUE`. Configuring the
 * transfer hook on the form project and on every palette project is what
 * prevents all of it.
 * ----------------------------------------------------------------------------
 * SCALING. Every operation on the binding path is O(1). Deciding whether a
 * token is bindable is one `SLOAD` of `_isPaletteProject[core][projectId]`,
 * however many palette projects exist, and the pairing itself is two mappings
 * keyed by the packed value. Converting between a token and its packed value is
 * arithmetic, not storage. No list of tokens, projects, or palettes is ever
 * walked on the binding, transfer, or read path; palette projects are
 * enumerated through `paletteProjectCount` and `paletteProjectAt`, which a
 * caller pages at its own pace.
 *
 * Palette entries are held in SSTORE2 bytecode, one contract per registered
 * project, written once at registration. Resolving a token reads that blob and
 * indexes into it — no unbounded storage array, and registering a collection
 * costs a fraction of what a Solidity `string[]` would.
 *
 * The pairing mappings are not keyed by core contract and do not need to be.
 * `_formToPalette` is keyed by form token ID, and the form project is a single
 * immutable `(core, projectId)`. `_paletteToForm` is keyed by the packed value,
 * which carries the core contract, so two contracts hosting projects with the
 * same ID cannot collide.
 * ----------------------------------------------------------------------------
 * GAS. Transfer figures are deltas against an identical project with no hook,
 * on `GenArt721CoreV3_Engine_Flex` with PMPV1, so they may be compared
 * directly. Whoever moves the token pays them, on every transfer, forever.
 *
 * - transferring an **unbound** token costs about 20,600 gas more. That is the
 *   core's reentrancy flag, the configuration check, and one cold mapping read
 *   that comes back empty. Any hook pays most of it.
 * - transferring a **bound form** token costs about 50,300 gas more — the above
 *   plus clearing two slots and the PMP write that re-renders the form token.
 * - transferring a **bound palette** token costs about 52,300 gas more: the
 *   same work plus the registry lookup that identifies it as a palette token.
 *
 * Binding is about 164,500 gas and unbinding about 72,000, both absolute and
 * both paid by the collector. Binding is the expensive direction because it
 * writes three cold slots: the PMP's stored value plus both mappings.
 *
 * `registerPaletteProject` is paid once per collection by the artist and is
 * dominated by the SSTORE2 write of the entries, so it scales with the total
 * byte length of the palette list: about 198,000 gas for three short entries,
 * rising roughly 200 gas per additional byte. Reads load that blob, which is
 * why entries should be as compact as the art scripts can tolerate.
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
 *
 * `registerPaletteProject` is the only other state-changing entry point, and it
 * is restricted to the form project's artist, read live from `formCore` on each
 * call. Nothing here stores an owner, so the right follows the project: if the
 * artist address is updated on the core, the new address holds it.
 */
contract FormPaletteBindingHooks is
    AbstractTransferHook,
    AbstractPMPAugmentHook,
    AbstractPMPConfigureHook,
    IFormPaletteBindingHooks
{
    using Strings for uint256;
    using ImmutableStringArray for ImmutableStringArray.StringArray;

    /// @notice Binding param on the form project, written by collectors to
    /// bind and unbind, and by this hook to unbind on transfer.
    string public constant PARAM_KEY_BOUND_PALETTE_TOKEN_ID =
        "boundPaletteTokenId";
    /// @notice Inject-only key on form tokens carrying the core contract of the
    /// bound palette token. Must not be configured as a project param.
    string public constant PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT =
        "boundPaletteCoreContract";
    /// @notice Inject-only key on form tokens carrying the bound palette
    /// token's hash. Must not be configured as a project param.
    string public constant PARAM_KEY_BOUND_PALETTE_TOKEN_HASH =
        "boundPaletteTokenHash";
    /// @notice Inject-only key on palette tokens carrying the form token they
    /// are bound to. Must not be configured as a project param.
    string public constant PARAM_KEY_BOUND_FORM_TOKEN_ID = "boundFormTokenId";
    /// @notice Inject-only key carrying the palette entry in effect for the
    /// token: on a form token the bound palette's, on a palette token its own.
    /// Must not be configured as a project param.
    string public constant PARAM_KEY_PALETTE_DATA = "paletteData";

    /**
     * @notice Binding param value meaning "not bound".
     * @dev Unambiguous by construction: a bindable value carries a non-zero
     * core contract in its high bits, so it can never be `0`.
     */
    uint256 public constant UNBOUND_PARAM_VALUE = 0;

    /**
     * @notice Required `maxRange` of the binding param.
     * @dev Unbounded on purpose. The set of palette projects grows over the
     * life of the form project, so no fixed range could stay correct without
     * the artist re-running `configureProject` on every palette drop — a step
     * that is easy to forget and whose omission surfaces as an opaque PMP
     * range error. This hook is the sole authority on which values bind.
     */
    uint256 public constant BINDING_PARAM_MAX_RANGE = type(uint256).max;

    /// @dev Low bits of the binding param value that hold the token ID. The
    /// remaining 160 are the core contract, so the two pack exactly.
    uint256 private constant _TOKEN_ID_BITS = 96;
    uint256 private constant _TOKEN_ID_MASK = (1 << _TOKEN_ID_BITS) - 1;

    // @dev derived from the constants above rather than restated as literals,
    // so a key and its hash cannot drift apart
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_ID =
        keccak256(bytes(PARAM_KEY_BOUND_PALETTE_TOKEN_ID));
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT =
        keccak256(bytes(PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT));
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_HASH =
        keccak256(bytes(PARAM_KEY_BOUND_PALETTE_TOKEN_HASH));
    bytes32 private constant _HASHED_PARAM_KEY_BOUND_FORM_TOKEN_ID =
        keccak256(bytes(PARAM_KEY_BOUND_FORM_TOKEN_ID));
    bytes32 private constant _HASHED_PARAM_KEY_PALETTE_DATA =
        keccak256(bytes(PARAM_KEY_PALETTE_DATA));

    /// @notice PMP contract this hook writes transfer-driven unbinds to.
    IPMPV0 public immutable pmp;
    /// @notice Core contract hosting the form project.
    address public immutable formCore;
    /// @notice Project ID of the form project on `formCore`.
    uint256 public immutable formProjectId;

    /// @dev Whether a project's tokens may be bound. The only registration
    /// check any path needs.
    mapping(address coreContract => mapping(uint256 projectId => bool))
        private _isPaletteProject;

    /// @dev Registration order, for enumeration only. Bounded by the number of
    /// palette drops the artist makes, not by any token count.
    PaletteProject[] private _paletteProjects;

    /**
     * @dev Each project's palette entries, written once via SSTORE2 and never
     * mutable afterwards. Immutability is load-bearing: the entry a token
     * resolves to is `hash % length`, so a list that could grow would silently
     * repaint tokens that had already minted.
     */
    mapping(address coreContract => mapping(uint256 projectId => ImmutableStringArray.StringArray))
        private _palettes;

    /**
     * @notice Canonical state. Keyed and valued by binding param values, which
     * are globally unique across cores, so no core needs to appear in the key.
     * @dev `_formToPalette` needs no offset because a bindable value is never
     * `0`. `_paletteToForm` stores `formTokenId + 1` because form token `0` is
     * a real token.
     */
    mapping(uint256 formTokenId => uint256 bindingParamValue)
        private _formToPalette;
    mapping(uint256 bindingParamValue => uint256 formTokenIdPlusOne)
        private _paletteToForm;

    /**
     * @param pmp_ PMP contract every project here uses. Must be non-zero: this
     * hook writes transfer-driven unbinds to it.
     * @param formCore_ Core contract hosting the form project.
     * @param formProjectId_ Project ID of the form project. `0` is allowed.
     * @dev No palette projects are registered here. Every registration goes
     * through `registerPaletteProject`, so there is exactly one code path and
     * one authorization rule for it. Until the artist registers the first one,
     * nothing can bind.
     */
    constructor(address pmp_, address formCore_, uint256 formProjectId_) {
        if (pmp_ == address(0) || formCore_ == address(0)) {
            revert InvalidConstructorArgs();
        }
        pmp = IPMPV0(pmp_);
        formCore = formCore_;
        formProjectId = formProjectId_;
    }

    // ---- palette project registry ----

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function registerPaletteProject(
        address coreContract,
        uint256 projectId,
        string[] calldata palettes
    ) external {
        // @dev the form project's artist owns this decision: it changes what
        // their form tokens may bind to. Read live from the core, so no owner
        // is stored here and a transferred project carries the right with it.
        address artist = IGenArt721CoreContractV3_Base(formCore)
            .projectIdToArtistAddress(formProjectId);
        if (msg.sender != artist) {
            revert OnlyFormProjectArtist({caller: msg.sender, artist: artist});
        }
        bool isFormProject = coreContract == formCore &&
            projectId == formProjectId;
        if (coreContract == address(0) || isFormProject) {
            revert InvalidPaletteProject({
                coreContract: coreContract,
                projectId: projectId
            });
        }
        // @dev the packing below is lossless only while a token ID fits the low
        // bits; no Art Blocks project comes close, but the encoding depends on
        // it, so it is enforced rather than assumed
        bool projectIdFits = projectId <=
            (_TOKEN_ID_MASK - (ABHelpers.ONE_MILLION - 1)) /
                ABHelpers.ONE_MILLION;
        if (!projectIdFits) {
            revert InvalidPaletteProject({
                coreContract: coreContract,
                projectId: projectId
            });
        }
        if (_isPaletteProject[coreContract][projectId]) {
            revert PaletteProjectAlreadyRegistered({
                coreContract: coreContract,
                projectId: projectId
            });
        }
        if (palettes.length == 0) {
            revert EmptyPaletteList();
        }
        _isPaletteProject[coreContract][projectId] = true;
        _paletteProjects.push(
            PaletteProject({coreContract: coreContract, projectId: projectId})
        );
        _palettes[coreContract][projectId].store(palettes);
        emit PaletteProjectRegistered({
            coreContract: coreContract,
            projectId: projectId,
            paletteCount: palettes.length
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
            newValue: uint256(pmpInput.configuredValue)
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
            uint256 boundValue = _formToPalette[tokenId];
            if (boundValue == UNBOUND_PARAM_VALUE) {
                return;
            }
            _clearBinding({
                formTokenId: tokenId,
                paramValue: boundValue,
                reason: UnbindReason.FormTransferred
            });
            _syncBindingParam({formTokenId: tokenId});
            return;
        }

        if (_isPaletteProject[coreContract][projectId]) {
            uint256 paramValue = _encode({
                coreContract: coreContract,
                paletteTokenId: tokenId
            });
            (bool isBound, uint256 formTokenId) = _boundFormOf({
                paramValue: paramValue
            });
            if (!isBound) {
                return;
            }
            _clearBinding({
                formTokenId: formTokenId,
                paramValue: paramValue,
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
     * of this hook's five keys — including the collector's own raw binding
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
        bool isPaletteToken = _isPaletteProject[coreContract][projectId];
        // @dev configured on a project this hook does not serve: pass through
        // untouched rather than stripping keys that belong to someone else
        if (!isFormToken && !isPaletteToken) {
            return tokenParams;
        }

        uint256 originalLength = tokenParams.length;
        // at most originalLength kept entries + 4 injected keys
        augmentedTokenParams = new IWeb3Call.TokenParam[](originalLength + 4);

        uint256 j;
        for (uint256 i; i < originalLength; ) {
            bytes32 hashedKey = keccak256(bytes(tokenParams[i].key));
            if (
                hashedKey != _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_ID &&
                hashedKey != _HASHED_PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT &&
                hashedKey != _HASHED_PARAM_KEY_BOUND_PALETTE_TOKEN_HASH &&
                hashedKey != _HASHED_PARAM_KEY_BOUND_FORM_TOKEN_ID &&
                hashedKey != _HASHED_PARAM_KEY_PALETTE_DATA
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
            // @dev resolved in one call so the four injected strings are the
            // only form-side locals this frame has to hold
            (
                string memory coreValue,
                string memory tokenIdValue,
                string memory hashValue,
                string memory paletteDataValue
            ) = _formInjectedValues({formTokenId: tokenId});
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_PALETTE_CORE_CONTRACT,
                value: coreValue
            });
            unchecked {
                ++j;
            }
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_PALETTE_TOKEN_ID,
                value: tokenIdValue
            });
            unchecked {
                ++j;
            }
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_PALETTE_TOKEN_HASH,
                value: hashValue
            });
            unchecked {
                ++j;
            }
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_PALETTE_DATA,
                value: paletteDataValue
            });
            unchecked {
                ++j;
            }
        } else {
            // @dev extracted for the same reason as the form side: keeps this
            // frame down to the injected strings
            (
                string memory boundFormValue,
                string memory paletteDataValue
            ) = _paletteInjectedValues({
                    coreContract: coreContract,
                    paletteTokenId: tokenId
                });
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_BOUND_FORM_TOKEN_ID,
                value: boundFormValue
            });
            unchecked {
                ++j;
            }
            augmentedTokenParams[j] = IWeb3Call.TokenParam({
                key: PARAM_KEY_PALETTE_DATA,
                value: paletteDataValue
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
    )
        external
        view
        returns (bool isBound, address coreContract, uint256 paletteTokenId)
    {
        uint256 paramValue = _formToPalette[formTokenId];
        if (paramValue == UNBOUND_PARAM_VALUE) {
            return (false, address(0), 0);
        }
        (coreContract, paletteTokenId) = _paletteTokenOf({
            paramValue: paramValue
        });
        isBound = true;
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function boundFormOf(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (bool isBound, uint256 formTokenId) {
        (bool registered, uint256 paramValue) = _bindingParamValue({
            coreContract: coreContract,
            paletteTokenId: paletteTokenId
        });
        if (!registered) {
            return (false, 0);
        }
        return _boundFormOf({paramValue: paramValue});
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function bindingParamValueFor(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (bool registered, uint256 paramValue) {
        return
            _bindingParamValue({
                coreContract: coreContract,
                paletteTokenId: paletteTokenId
            });
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function previewBind(
        uint256 formTokenId,
        address paletteCoreContract,
        uint256 paletteTokenId
    ) external view returns (bool allowed, BindBlocker blocker) {
        // @dev checks follow the order `_applyBindingParam` applies them, so the
        // reported blocker is the condition that would actually fail first
        if (ABHelpers.tokenIdToProjectId(formTokenId) != formProjectId) {
            return (false, BindBlocker.FormTokenNotInFormProject);
        }
        (bool registered, uint256 paramValue) = _bindingParamValue({
            coreContract: paletteCoreContract,
            paletteTokenId: paletteTokenId
        });
        uint256 currentValue = _formToPalette[formTokenId];
        // @dev re-writing the pairing that already exists is accepted as a
        // no-op, so report it as allowed; a front end that unbound first here
        // would flicker the form token through the unbound state for nothing
        if (
            registered &&
            currentValue != UNBOUND_PARAM_VALUE &&
            currentValue == paramValue
        ) {
            return (true, BindBlocker.None);
        }
        if (currentValue != UNBOUND_PARAM_VALUE) {
            return (false, BindBlocker.FormAlreadyBound);
        }
        if (!registered) {
            return (false, BindBlocker.PaletteProjectNotRegistered);
        }
        (bool paletteBound, ) = _boundFormOf({paramValue: paramValue});
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
        try IERC721(paletteCoreContract).ownerOf(paletteTokenId) returns (
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
     * @inheritdoc IFormPaletteBindingHooks
     */
    function isPaletteProject(
        address coreContract,
        uint256 projectId
    ) external view returns (bool registered) {
        return _isPaletteProject[coreContract][projectId];
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function paletteProjectCount() external view returns (uint256 count) {
        return _paletteProjects.length;
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function paletteProjectAt(
        uint256 index
    ) external view returns (address coreContract, uint256 projectId) {
        if (index >= _paletteProjects.length) {
            return (address(0), 0);
        }
        PaletteProject memory project = _paletteProjects[index];
        return (project.coreContract, project.projectId);
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function paletteCount(
        address coreContract,
        uint256 projectId
    ) external view returns (uint256 count) {
        return _palettes[coreContract][projectId].length();
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function paletteAt(
        address coreContract,
        uint256 projectId,
        uint256 index
    ) external view returns (string memory palette) {
        return _palettes[coreContract][projectId].get(index);
    }

    /**
     * @inheritdoc IFormPaletteBindingHooks
     */
    function paletteDataFor(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (string memory palette) {
        if (
            !_isPaletteProject[coreContract][
                ABHelpers.tokenIdToProjectId(paletteTokenId)
            ]
        ) {
            return "";
        }
        return
            _resolvePaletteData({
                coreContract: coreContract,
                paletteTokenId: paletteTokenId
            });
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
     * @param newValue Written value; `UNBOUND_PARAM_VALUE` to unbind.
     */
    function _applyBindingParam(uint256 formTokenId, uint256 newValue) private {
        uint256 currentValue = _formToPalette[formTokenId];

        if (newValue == UNBOUND_PARAM_VALUE) {
            // @dev idempotent: unbinding an unbound token is a no-op, which is
            // what makes the transfer hook's own write safe to replay
            if (currentValue == UNBOUND_PARAM_VALUE) {
                return;
            }
            _clearBinding({
                formTokenId: formTokenId,
                paramValue: currentValue,
                reason: UnbindReason.Configured
            });
            return;
        }

        // @dev idempotent: re-writing the current pairing changes nothing
        if (currentValue == newValue) {
            return;
        }
        if (currentValue != UNBOUND_PARAM_VALUE) {
            (address boundCore, uint256 boundTokenId) = _paletteTokenOf({
                paramValue: currentValue
            });
            revert FormAlreadyBound({
                formTokenId: formTokenId,
                paletteCoreContract: boundCore,
                paletteTokenId: boundTokenId
            });
        }
        (
            address paletteCoreContract,
            uint256 paletteTokenId
        ) = _paletteTokenOf({paramValue: newValue});
        // @dev a value that does not unpack to a registered project fails here,
        // including a bare token ID mistyped into the field: it is far below
        // the core contract's bits, so it unpacks to the zero address
        if (
            !_isPaletteProject[paletteCoreContract][
                ABHelpers.tokenIdToProjectId(paletteTokenId)
            ]
        ) {
            revert UnknownBindingParamValue({bindingParamValue: newValue});
        }
        (bool paletteBound, uint256 boundFormTokenId) = _boundFormOf({
            paramValue: newValue
        });
        if (paletteBound) {
            revert PaletteAlreadyBound({
                paletteCoreContract: paletteCoreContract,
                paletteTokenId: paletteTokenId,
                formTokenId: boundFormTokenId
            });
        }
        // @dev `ownerOf` reverts for a token that does not exist, so this also
        // rejects binding to an unminted palette token
        address formOwner = IERC721(formCore).ownerOf(formTokenId);
        address paletteOwner = IERC721(paletteCoreContract).ownerOf(
            paletteTokenId
        );
        if (formOwner != paletteOwner) {
            revert OwnerMismatch({
                formOwner: formOwner,
                paletteOwner: paletteOwner
            });
        }

        _formToPalette[formTokenId] = newValue;
        unchecked {
            // @dev cannot overflow: the `ownerOf` above established that
            // `formTokenId` is a minted Art Blocks token, so it is nowhere near
            // `type(uint256).max`
            _paletteToForm[newValue] = formTokenId + 1;
        }
        emit Bound({
            formTokenId: formTokenId,
            paletteCoreContract: paletteCoreContract,
            paletteTokenId: paletteTokenId,
            owner: formOwner
        });
    }

    /**
     * @notice Clear both directions of a pairing.
     */
    function _clearBinding(
        uint256 formTokenId,
        uint256 paramValue,
        UnbindReason reason
    ) private {
        delete _formToPalette[formTokenId];
        delete _paletteToForm[paramValue];
        (
            address paletteCoreContract,
            uint256 paletteTokenId
        ) = _paletteTokenOf({paramValue: paramValue});
        emit Unbound({
            formTokenId: formTokenId,
            paletteCoreContract: paletteCoreContract,
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
     * @notice The binding param value naming a palette token, if its project is
     * registered.
     */
    function _bindingParamValue(
        address coreContract,
        uint256 paletteTokenId
    ) private view returns (bool registered, uint256 paramValue) {
        if (
            !_isPaletteProject[coreContract][
                ABHelpers.tokenIdToProjectId(paletteTokenId)
            ]
        ) {
            return (false, UNBOUND_PARAM_VALUE);
        }
        return (
            true,
            _encode({
                coreContract: coreContract,
                paletteTokenId: paletteTokenId
            })
        );
    }

    /**
     * @notice The palette token a binding param value names.
     * @dev Pure unpacking. A value whose project is not registered still
     * decodes; callers check `_isPaletteProject` on the result.
     */
    function _paletteTokenOf(
        uint256 paramValue
    ) private pure returns (address coreContract, uint256 paletteTokenId) {
        return (
            address(uint160(paramValue >> _TOKEN_ID_BITS)),
            paramValue & _TOKEN_ID_MASK
        );
    }

    /**
     * @notice Binding param value naming a palette token.
     * @dev The core contract in the high 160 bits, the token ID in the low 96.
     * Lossless because registration rejects a project ID whose tokens could not
     * fit, and never `0` because a registered core is never the zero address.
     */
    function _encode(
        address coreContract,
        uint256 paletteTokenId
    ) private pure returns (uint256) {
        return
            (uint256(uint160(coreContract)) << _TOKEN_ID_BITS) | paletteTokenId;
    }

    /**
     * @notice Canonical pairing for a binding param value.
     */
    function _boundFormOf(
        uint256 paramValue
    ) private view returns (bool isBound, uint256 formTokenId) {
        uint256 stored = _paletteToForm[paramValue];
        if (stored == 0) {
            return (false, 0);
        }
        unchecked {
            return (true, stored - 1);
        }
    }

    /**
     * @notice The palette entry a palette token resolves to.
     * @dev Caller must have established that the project is registered.
     */
    function _resolvePaletteData(
        address coreContract,
        uint256 paletteTokenId
    ) private view returns (string memory) {
        ImmutableStringArray.StringArray storage palettes = _palettes[
            coreContract
        ][ABHelpers.tokenIdToProjectId(paletteTokenId)];
        // @dev non-zero for any registered project: registration rejects an
        // empty list and the entries can never be replaced, so there is no
        // path to a registered project with nothing to select from
        uint256 paletteCount_ = palettes.length();
        bytes32 tokenHash = IGenArt721CoreContractV3_Base(coreContract)
            .tokenIdToHash(paletteTokenId);
        return palettes.get(_paletteIndex(tokenHash, paletteCount_));
    }

    /**
     * @notice The four values a form token injects, resolved together.
     * @dev Every one is the empty string when the token is unbound, so an art
     * script has a single "no palette" case.
     */
    function _formInjectedValues(
        uint256 formTokenId
    )
        private
        view
        returns (
            string memory coreValue,
            string memory tokenIdValue,
            string memory hashValue,
            string memory paletteDataValue
        )
    {
        (bool isBound, uint256 paramValue) = _resolveBoundPalette({
            formTokenId: formTokenId
        });
        if (!isBound) {
            return ("", "", "", "");
        }
        (address coreContract, uint256 paletteTokenId) = _paletteTokenOf({
            paramValue: paramValue
        });
        coreValue = uint256(uint160(coreContract)).toHexString(20);
        tokenIdValue = paletteTokenId.toString();
        hashValue = uint256(
            IGenArt721CoreContractV3_Base(coreContract).tokenIdToHash(
                paletteTokenId
            )
        ).toHexString(32);
        paletteDataValue = _resolvePaletteData({
            coreContract: coreContract,
            paletteTokenId: paletteTokenId
        });
    }

    /**
     * @notice The two values a palette token injects, resolved together.
     * @dev `paletteDataValue` is never empty for a registered project: a palette
     * token carries its own entry whether or not anything is bound to it. Only
     * the pairing is subject to the ownership backstop.
     */
    function _paletteInjectedValues(
        address coreContract,
        uint256 paletteTokenId
    )
        private
        view
        returns (string memory boundFormValue, string memory paletteDataValue)
    {
        (bool isBound, uint256 formTokenId) = _resolveBoundForm({
            paramValue: _encode({
                coreContract: coreContract,
                paletteTokenId: paletteTokenId
            })
        });
        boundFormValue = isBound ? formTokenId.toString() : "";
        paletteDataValue = _resolvePaletteData({
            coreContract: coreContract,
            paletteTokenId: paletteTokenId
        });
    }

    /**
     * @notice Which entry of a `paletteCount_`-long list a hash selects.
     * @dev This contract is the single definition of that mapping — both the
     * form and the palette projects read the injected result rather than
     * deriving it — so the rule is chosen to be trivially auditable rather than
     * to match any particular script. Modulo bias across a 256-bit hash and a
     * list of realistic length is not measurable. Weighted rarity is expressed
     * by repeating an entry in the registered list.
     */
    function _paletteIndex(
        bytes32 tokenHash,
        uint256 paletteCount_
    ) private pure returns (uint256) {
        return uint256(tokenHash) % paletteCount_;
    }

    /**
     * @notice Canonical pairing for a form token, reported only while both
     * tokens still share an owner.
     * @dev See the read-time ownership backstop note in the contract natspec.
     */
    function _resolveBoundPalette(
        uint256 formTokenId
    ) private view returns (bool isBound, uint256 paramValue) {
        paramValue = _formToPalette[formTokenId];
        if (paramValue == UNBOUND_PARAM_VALUE) {
            return (false, UNBOUND_PARAM_VALUE);
        }
        if (!_sharesOwner({formTokenId: formTokenId, paramValue: paramValue})) {
            return (false, UNBOUND_PARAM_VALUE);
        }
        isBound = true;
    }

    /**
     * @notice Canonical pairing for a palette token, reported only while both
     * tokens still share an owner.
     */
    function _resolveBoundForm(
        uint256 paramValue
    ) private view returns (bool isBound, uint256 formTokenId) {
        (isBound, formTokenId) = _boundFormOf({paramValue: paramValue});
        if (!isBound) {
            return (false, 0);
        }
        if (!_sharesOwner({formTokenId: formTokenId, paramValue: paramValue})) {
            return (false, 0);
        }
    }

    /// @notice Whether a form token and the palette token a value names are
    /// still held by one wallet.
    function _sharesOwner(
        uint256 formTokenId,
        uint256 paramValue
    ) private view returns (bool) {
        (
            address paletteCoreContract,
            uint256 paletteTokenId
        ) = _paletteTokenOf({paramValue: paramValue});
        return
            IERC721(formCore).ownerOf(formTokenId) ==
            IERC721(paletteCoreContract).ownerOf(paletteTokenId);
    }

    /**
     * @notice Revert unless `coreContract` has this hook configured as the
     * transfer hook for `projectId`.
     * @dev This is the `ITransferHook` requirement that an implementation
     * verify which cores it serves. A contract impersonating a core could
     * answer dishonestly, but the immutable form project and the registry
     * checked in `_onTokenTransfer` confine it to doing nothing.
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
