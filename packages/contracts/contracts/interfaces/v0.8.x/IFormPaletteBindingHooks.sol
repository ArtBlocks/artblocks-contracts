// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ITransferHook} from "./ITransferHook.sol";
import {IPMPAugmentHook} from "./IPMPAugmentHook.sol";
import {IPMPConfigureHook} from "./IPMPConfigureHook.sol";

/**
 * @title Interface for the form/palette binding combined hook.
 * @author Art Blocks Inc.
 * @notice Binds one token of a "palette" project to one token of a "form"
 * project, 1:1, while both are held by the same wallet. The binding is driven
 * by a PostParam on the form token, enforced by a configure hook, surfaced by
 * a read-augmentation hook, and broken by a transfer hook when either side
 * changes hands.
 */
interface IFormPaletteBindingHooks is
    ITransferHook,
    IPMPAugmentHook,
    IPMPConfigureHook
{
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
        PaletteTokenNotInPaletteProject,
        FormTokenDoesNotExist,
        PaletteTokenDoesNotExist,
        FormAlreadyBound,
        PaletteAlreadyBound,
        OwnerMismatch
    }

    /**
     * @notice Palette token `paletteTokenId` is now bound to form token
     * `formTokenId`. `owner` held both at the moment of binding.
     */
    event Bound(
        uint256 indexed formTokenId,
        uint256 indexed paletteTokenId,
        address indexed owner
    );

    /**
     * @notice Palette token `paletteTokenId` is no longer bound to form token
     * `formTokenId`.
     */
    event Unbound(
        uint256 indexed formTokenId,
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
    error FormAlreadyBound(uint256 formTokenId, uint256 paletteTokenId);

    /// @notice The palette token is already bound to another form token. Unbind
    /// it from that form token first.
    error PaletteAlreadyBound(uint256 paletteTokenId, uint256 formTokenId);

    /// @notice The requested palette token is not part of the palette project.
    error PaletteTokenNotInPaletteProject(uint256 paletteTokenId);

    /// @notice The form token and palette token are held by different wallets.
    error OwnerMismatch(address formOwner, address paletteOwner);

    /// @notice A constructor argument was invalid.
    error InvalidConstructorArgs();

    /// @notice `coreContract` does not have this hook configured as the
    /// transfer hook for `projectId`.
    error HookNotConfiguredForProject(
        address coreContract,
        uint256 projectId,
        address configuredHook
    );

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
     * @return paletteTokenId The bound palette token; `0` when not bound.
     */
    function boundPaletteOf(
        uint256 formTokenId
    ) external view returns (bool isBound, uint256 paletteTokenId);

    /**
     * @notice The form token that `paletteTokenId` is currently bound to.
     * @dev Raw canonical state, with no same-owner check; see `boundPaletteOf`.
     * @param paletteTokenId Token ID in the palette project.
     * @return isBound True if the palette token is bound to a form token.
     * @return formTokenId The bound form token; `0` when not bound.
     */
    function boundFormOf(
        uint256 paletteTokenId
    ) external view returns (bool isBound, uint256 formTokenId);

    /**
     * @notice Whether binding `paletteTokenId` to `formTokenId` would be
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
     * @param paletteTokenId Token ID in the palette project.
     * @return allowed True if a binding write would succeed.
     * @return blocker The first condition that fails, or `None`.
     */
    function previewBind(
        uint256 formTokenId,
        uint256 paletteTokenId
    ) external view returns (bool allowed, BindBlocker blocker);
}
