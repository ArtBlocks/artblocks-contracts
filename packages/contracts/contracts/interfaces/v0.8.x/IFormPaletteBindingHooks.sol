// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "./ITransferHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";
import {IPMPConfigureHook} from "./IPMPConfigureHook.sol";

/**
 * @title Interface for the form/palette binding combined hook.
 * @author Art Blocks Inc.
 * @notice Binds one token of a registered "palette" project to one token of a
 * "form" project, 1:1, while both are held by the same wallet. The binding is
 * driven by a PostParam on the form token, enforced by a configure hook,
 * surfaced by a read-augmentation hook, and broken by a transfer hook when
 * either side changes hands. The contract also stores each palette project's
 * entries and resolves which one a palette token receives.
 */
interface IFormPaletteBindingHooks is
    ITransferHook,
    IPMPAugmentHook,
    IPMPConfigureHook
{
    /**
     * @notice A registered palette project.
     * @param coreContract Core contract hosting the project.
     * @param projectId Project ID on that core.
     */
    struct PaletteProject {
        address coreContract;
        uint256 projectId;
    }

    /**
     * @notice Why a binding was cleared.
     * @param Configured The form token's binding param was set to
     * `UNBOUND_PARAM_VALUE` by an authorized party.
     * @param FormTransferred The form token changed owners.
     * @param PaletteTransferred The palette token changed owners.
     */
    enum UnbindReason {
        Configured,
        FormTransferred,
        PaletteTransferred
    }

    /**
     * @notice Why `previewBind` reports a prospective binding as disallowed.
     * @dev `None` is returned only when the binding would be accepted.
     */
    enum BindBlocker {
        None,
        FormTokenNotInFormProject,
        PaletteProjectNotRegistered,
        FormTokenDoesNotExist,
        PaletteTokenDoesNotExist,
        FormAlreadyBound,
        PaletteAlreadyBound,
        OwnerMismatch
    }

    /**
     * @notice Project `projectId` on `coreContract` was registered as a palette
     * project and assigned `slot`, with `paletteCount` immutable entries.
     */
    event PaletteProjectRegistered(
        address indexed coreContract,
        uint256 indexed projectId,
        uint256 paletteCount
    );

    /**
     * @notice A palette token is now bound to form token `formTokenId`.
     * `owner` held both at the moment of binding.
     */
    event Bound(
        uint256 indexed formTokenId,
        address indexed paletteCoreContract,
        uint256 indexed paletteTokenId,
        address owner
    );

    /**
     * @notice A palette token is no longer bound to form token `formTokenId`.
     */
    event Unbound(
        uint256 indexed formTokenId,
        address indexed paletteCoreContract,
        uint256 indexed paletteTokenId,
        UnbindReason reason
    );

    /**
     * @notice A transfer-driven write of form token `formTokenId`'s binding
     * param reverted inside the transfer hook and was swallowed.
     * @dev The on-chain binding is still cleared and reads are still correct;
     * only the stored off-chain render of the form token is left stale. Any
     * authorized party can repair it by writing the binding param.
     */
    event BindingParamSyncFailed(uint256 indexed formTokenId);

    /// @notice `onTokenPMPConfigure` was called by an address other than the
    /// bound PMP contract.
    error OnlyPMP(address caller);

    /// @notice This hook is configured as a configure hook on a project it
    /// does not serve as the form project.
    error ConfigureHookOnUnexpectedProject(
        address coreContract,
        uint256 tokenId
    );

    /// @notice The form token is already bound. Bindings are strict: set the
    /// binding param to `UNBOUND_PARAM_VALUE` before binding a new palette.
    error FormAlreadyBound(
        uint256 formTokenId,
        address paletteCoreContract,
        uint256 paletteTokenId
    );

    /// @notice The palette token is already bound to another form token. Unbind
    /// it from that form token first.
    error PaletteAlreadyBound(
        address paletteCoreContract,
        uint256 paletteTokenId,
        uint256 formTokenId
    );

    /// @notice The binding param value does not unpack to a token of a
    /// registered palette project. Build values with `bindingParamValueFor`.
    error UnknownBindingParamValue(uint256 bindingParamValue);

    /// @notice The form token and palette token are held by different wallets.
    error OwnerMismatch(address formOwner, address paletteOwner);

    /// @notice A constructor argument was invalid.
    error InvalidConstructorArgs();

    /// @notice Only the form project's artist may register a palette project.
    error OnlyFormProjectArtist(address caller, address artist);

    /// @notice The zero address, and the form project itself, can never be
    /// palette projects.
    error InvalidPaletteProject(address coreContract, uint256 projectId);

    /// @notice The palette project is already registered. Registration is
    /// append-only and idempotent registration is rejected to surface mistakes.
    error PaletteProjectAlreadyRegistered(
        address coreContract,
        uint256 projectId
    );

    /// @notice A palette project must be registered with at least one entry.
    error EmptyPaletteList();

    /// @notice `coreContract` does not have this hook configured as the
    /// transfer hook for `projectId`.
    error HookNotConfiguredForProject(
        address coreContract,
        uint256 projectId,
        address configuredHook
    );

    /**
     * @notice Register a palette project, whose tokens then become bindable to
     * form tokens, together with the palette entries its tokens resolve to.
     * @dev Callable only by the form project's artist, read live from the core.
     * Append-only: there is no deregistration, so a pairing already made can
     * never be invalidated by a later registration.
     * @dev Registering is not sufficient on its own. The project also needs this
     * contract as its read-augmentation hook on the PMP, or its own tokens
     * receive no palette data, and as its transfer hook on its core, or pairings
     * against it will not break when its tokens change hands. See REQUIRED
     * SETUP, PER PALETTE PROJECT in the implementation's natspec.
     * @dev `palettes` is written once via SSTORE2 and can never be changed,
     * grown, or removed. That is deliberate: a token's entry is selected as
     * `hash % palettes.length`, so a mutable list would silently repaint tokens
     * that had already minted.
     * @param coreContract Core contract hosting the project. Palette projects
     * may live on any number of cores, including the form project's own. Must
     * be an Art Blocks core: token hashes and owners are read from it, and it
     * must support transfer hooks for pairings to break on transfer.
     * @param projectId Project ID on that core. May be `0`; the form project
     * itself is excluded, as is a project ID so large that its token IDs would
     * not fit the binding param's low 96 bits, which no real project
     * approaches.
     * @param palettes The project's complete, ordered palette entries. Opaque
     * to this contract — whatever the art scripts agree to consume. At least
     * one entry is required. Repeat an entry to weight it.
     */
    function registerPaletteProject(
        address coreContract,
        uint256 projectId,
        string[] calldata palettes
    ) external;

    /**
     * @notice Whether a project's tokens may be bound to form tokens.
     * @param coreContract Core contract hosting the project.
     * @param projectId Project ID on that core.
     * @return registered True if the project has been registered.
     */
    function isPaletteProject(
        address coreContract,
        uint256 projectId
    ) external view returns (bool registered);

    /**
     * @notice The palette token currently bound to `formTokenId`.
     * @dev Raw canonical state, with no same-owner check. The augment hook
     * applies one before reporting a pairing on read, so in a deployment whose
     * transfer hook was never configured this getter can report a pairing that
     * `getTokenParams` reports as unbound. That divergence is intentional: the
     * artwork must not render a cross-wallet pairing, while a front end still
     * needs to see the mapping that is blocking a new binding.
     * @param formTokenId Token ID in the form project.
     * @return isBound True if a palette token is bound.
     * @return coreContract Core of the bound palette token; zero when unbound.
     * @return paletteTokenId The bound palette token; `0` when unbound.
     */
    function boundPaletteOf(
        uint256 formTokenId
    )
        external
        view
        returns (bool isBound, address coreContract, uint256 paletteTokenId);

    /**
     * @notice The form token that a palette token is currently bound to.
     * @dev Raw canonical state, with no same-owner check; see `boundPaletteOf`.
     * @param coreContract Core of the palette token.
     * @param paletteTokenId Token ID on that core.
     * @return isBound True if the palette token is bound to a form token.
     * @return formTokenId The bound form token; `0` when not bound.
     */
    function boundFormOf(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (bool isBound, uint256 formTokenId);

    /**
     * @notice The binding param value that names a palette token.
     * @dev The value a collector writes to bind it:
     * `(uint256(uint160(coreContract)) << 96) | paletteTokenId`. Derivable off
     * chain by arithmetic alone; this view additionally reports whether the
     * project is registered. It is not a token ID, and nothing else in this
     * interface speaks in it.
     * @param coreContract Core of the palette token.
     * @param paletteTokenId Token ID on that core.
     * @return registered False if the token's project is not registered, in
     * which case no value can name it.
     * @return paramValue The value to write; `0` when not registered.
     */
    function bindingParamValueFor(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (bool registered, uint256 paramValue);

    /**
     * @notice Whether binding a palette token to `formTokenId` would be
     * accepted right now, and what blocks it if not.
     * @dev Intended for front ends deciding between a single binding write and
     * an unbind-then-bind pair, and for warning before either. Never reverts.
     * @dev Same-owner is checked for the prospective pair. Existing pairings
     * are read from raw canonical state, without the augment hook's ownership
     * backstop, so a pairing that no longer renders can still be reported as
     * `FormAlreadyBound` or `PaletteAlreadyBound` — which is what tells the
     * front end an unbind is still required.
     * @dev Re-writing the pairing that already exists is a no-op that the write
     * path accepts, and is reported here as allowed.
     * @param formTokenId Token ID in the form project.
     * @param paletteCoreContract Core of the palette token.
     * @param paletteTokenId Token ID on that core.
     * @return allowed True if a binding write would succeed.
     * @return blocker The first condition that fails, or `None`.
     */
    function previewBind(
        uint256 formTokenId,
        address paletteCoreContract,
        uint256 paletteTokenId
    ) external view returns (bool allowed, BindBlocker blocker);

    /**
     * @notice How many palette projects have been registered.
     * @return count Registered palette project count.
     */
    function paletteProjectCount() external view returns (uint256 count);

    /**
     * @notice The palette project at an enumeration index.
     * @dev Zero-based, in registration order, over `paletteProjectCount`
     * entries. An index at or past the count returns zeros.
     * @param index Enumeration index.
     * @return coreContract Core contract, or zero if the index is unused.
     * @return projectId Project ID on that core.
     */
    function paletteProjectAt(
        uint256 index
    ) external view returns (address coreContract, uint256 projectId);

    /**
     * @notice Number of palette entries registered for a palette project.
     * @param coreContract Core contract hosting the project.
     * @param projectId Project ID on that core.
     * @return count Entry count; `0` if the project is not registered.
     */
    function paletteCount(
        address coreContract,
        uint256 projectId
    ) external view returns (uint256 count);

    /**
     * @notice One registered palette entry by index.
     * @param coreContract Core contract hosting the project.
     * @param projectId Project ID on that core.
     * @param index Index into the project's registered list.
     * @return palette The entry. Reverts if the index is out of bounds.
     */
    function paletteAt(
        address coreContract,
        uint256 projectId,
        uint256 index
    ) external view returns (string memory palette);

    /**
     * @notice The palette entry a palette token resolves to.
     * @dev The same value injected as `paletteData`, exposed for front ends and
     * for anyone verifying a render. Empty if the token's project is not
     * registered.
     * @param coreContract Core of the palette token.
     * @param paletteTokenId Token ID on that core.
     * @return palette The resolved entry, or the empty string.
     */
    function paletteDataFor(
        address coreContract,
        uint256 paletteTokenId
    ) external view returns (string memory palette);
}
