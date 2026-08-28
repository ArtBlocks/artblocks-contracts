// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_ProjectFinance} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_ProjectFinance.sol";
import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {Bytes32Strings} from "./Bytes32Strings.sol";

/**
 * @title Shared helper library for V3 Engine and Engine Flex cores.
 * @author Art Blocks Inc.
 * @notice External library (DELEGATECALL) used by both `GenArt721CoreV3_Engine`
 * and `GenArt721CoreV3_Engine_Flex`. Offloading this logic keeps both cores
 * under the 24KB bytecode size limit while guaranteeing there is exactly one
 * implementation of it, rather than one copy per core.
 * @dev Hosts project-finance logic (ERC-2981 royalty info, primary revenue
 * splits, royalty splitter assignment, artist payment proposals), input
 * validation shared by both cores, and default base URI construction.
 * @dev Events are emitted under the calling core's address because all
 * functions here are reached via DELEGATECALL. Event ordering within each
 * function intentionally matches the ordering of the pre-offload core
 * implementations, so off-chain indexing is unaffected by the refactor.
 */
library V3EngineLib {
    using Strings for address;
    using Bytes32Strings for bytes32;

    /// @dev max percentage value for artist/additional payee splits
    uint256 private constant ONE_HUNDRED = 100;

    /**
     * @notice Payee fields for an artist split proposal or admin acceptance.
     * @dev Grouped into a struct to avoid stack-too-deep in the cores.
     */
    struct ArtistSplitProposal {
        uint256 projectId;
        address payable artistAddress;
        address payable additionalPayeePrimarySales;
        uint256 additionalPayeePrimarySalesPercentage;
        address payable additionalPayeeSecondarySales;
        uint256 additionalPayeeSecondarySalesPercentage;
    }

    /**
     * @notice ERC-2981 royalty info for a project's finance struct.
     * @param projectFinance Project finance storage for the queried project.
     * @param salePrice Sale price to calculate the royalty amount from.
     * @return receiver Address that should be sent the royalty payment.
     * @return royaltyAmount Royalty payment amount for `salePrice`.
     */
    function royaltyInfo(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        // @dev royalty splitter created upon project creation, so will always
        // exist for a valid token ID
        receiver = projectFinance.royaltySplitter;
        // @dev important to cast to uint256 before multiplying to avoid overflow
        uint256 totalRoyaltyBPS = (100 *
            uint256(projectFinance.secondaryMarketRoyaltyPercentage)) +
            projectFinance.platformProviderSecondarySalesBPS +
            projectFinance.renderProviderSecondarySalesBPS;
        // @dev totalRoyaltyBPS guaranteed to be <= 10,000
        if (totalRoyaltyBPS > 10_000) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.OverMaxSumOfBPS
            );
        }
        // @dev overflow automatically checked in solidity 0.8
        // @dev totalRoyaltyBPS guaranteed to be <= 10_000, so overflow only
        // possible with unreasonably high salePrice values near uint256 max
        royaltyAmount = (salePrice * totalRoyaltyBPS) / 10_000;
    }

    /**
     * @notice Primary revenue split view.
     * @dev Three-way split between the render provider, the platform provider,
     * and the artist. Safe to perform given that in the case of loss of
     * precision Solidity will round down.
     */
    function getPrimaryRevenueSplits(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        uint256 price,
        uint256 renderProviderPrimarySalesPercentage,
        uint256 platformProviderPrimarySalesPercentage,
        address payable renderProviderPrimarySalesAddress,
        address payable platformProviderPrimarySalesAddress
    )
        external
        view
        returns (
            uint256 renderProviderRevenue_,
            address payable renderProviderAddress_,
            uint256 platformProviderRevenue_,
            address payable platformProviderAddress_,
            uint256 artistRevenue_,
            address payable artistAddress_,
            uint256 additionalPayeePrimaryRevenue_,
            address payable additionalPayeePrimaryAddress_
        )
    {
        uint256 projectFunds = price;
        renderProviderRevenue_ =
            (price * renderProviderPrimarySalesPercentage) /
            ONE_HUNDRED;
        // renderProviderRevenue_ percentage is always <=100, so guaranteed to never underflow
        projectFunds -= renderProviderRevenue_;
        platformProviderRevenue_ =
            (price * platformProviderPrimarySalesPercentage) /
            ONE_HUNDRED;
        // platformProviderRevenue_ percentage is always <=100, so guaranteed to never underflow
        projectFunds -= platformProviderRevenue_;
        additionalPayeePrimaryRevenue_ =
            (projectFunds *
                projectFinance.additionalPayeePrimarySalesPercentage) /
            ONE_HUNDRED;
        // additionalPayeePrimarySalesPercentage is always <=100, so guaranteed
        // to never underflow
        artistRevenue_ = projectFunds - additionalPayeePrimaryRevenue_;
        // set addresses from storage
        renderProviderAddress_ = renderProviderPrimarySalesAddress;
        platformProviderAddress_ = platformProviderPrimarySalesAddress;
        if (artistRevenue_ > 0) {
            artistAddress_ = projectFinance.artistAddress;
        }
        if (additionalPayeePrimaryRevenue_ > 0) {
            additionalPayeePrimaryAddress_ = projectFinance
                .additionalPayeePrimarySales;
        }
    }

    /**
     * @notice Assign a project's royalty splitter.
     * @dev Loads values from `projectFinance`, so storage must be updated
     * before calling. Includes a trusted splitter-provider interaction that is
     * entrusted not to reenter the core.
     */
    function assignSplitter(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        ISplitProviderV0 splitProvider,
        uint256 projectId
    ) external {
        _assignSplitter({
            projectFinance: projectFinance,
            splitProvider: splitProvider,
            projectId: projectId
        });
    }

    /**
     * @notice Artist proposal of updated payment addresses and splits.
     * Automatically accepts the proposal if no payee addresses are being
     * modified, if the proposal only removes payee addresses, or if
     * `autoApprove` is true.
     * @dev Emits, in order, `ProposedArtistAddressesAndSplits` and — only on
     * automatic acceptance — `ProjectRoyaltySplitterUpdated` followed by
     * `AcceptedArtistAddressesAndSplits`. This ordering matches the
     * pre-offload core implementation and must be preserved.
     * @param proposal Proposed payee addresses and percentages.
     * @param projectFinance Project finance storage for the project.
     * @param proposedHashes Core's `proposedArtistAddressesAndSplitsHash`.
     * @param autoApprove Core's `autoApproveArtistSplitProposals`.
     * @param splitProvider Core's split provider, used on automatic accept.
     */
    function proposeArtistPaymentAddressesAndSplits(
        ArtistSplitProposal memory proposal,
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        mapping(uint256 => bytes32) storage proposedHashes,
        bool autoApprove,
        ISplitProviderV0 splitProvider
    ) external {
        // checks
        if (
            proposal.additionalPayeePrimarySalesPercentage > ONE_HUNDRED ||
            proposal.additionalPayeeSecondarySalesPercentage > ONE_HUNDRED
        ) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.MaxOf100Percent
            );
        }
        if (
            proposal.additionalPayeePrimarySalesPercentage > 0 &&
            proposal.additionalPayeePrimarySales == address(0)
        ) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .PrimaryPayeeIsZeroAddress
            );
        }
        if (
            proposal.additionalPayeeSecondarySalesPercentage > 0 &&
            proposal.additionalPayeeSecondarySales == address(0)
        ) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .SecondaryPayeeIsZeroAddress
            );
        }
        // effects
        // emit event for off-chain indexing
        // note: always emit a proposal event, even in the pathway of
        // automatic approval, to simplify indexing expectations
        emit IGenArt721CoreContractV3_Base.ProposedArtistAddressesAndSplits(
            proposal.projectId,
            proposal.artistAddress,
            proposal.additionalPayeePrimarySales,
            proposal.additionalPayeePrimarySalesPercentage,
            proposal.additionalPayeeSecondarySales,
            proposal.additionalPayeeSecondarySalesPercentage
        );
        // automatically accept if no proposed addresses modifications, or if
        // the proposal only removes payee addresses, or if contract is set to
        // always auto-approve.
        // store proposal hash on-chain, only if not automatic accept
        bool automaticAccept = autoApprove;
        if (!automaticAccept) {
            // block scope to avoid stack too deep error
            bool artistUnchanged = proposal.artistAddress ==
                projectFinance.artistAddress;
            bool additionalPrimaryUnchangedOrRemoved = (proposal
                .additionalPayeePrimarySales ==
                projectFinance.additionalPayeePrimarySales) ||
                (proposal.additionalPayeePrimarySales == address(0));
            bool additionalSecondaryUnchangedOrRemoved = (proposal
                .additionalPayeeSecondarySales ==
                projectFinance.additionalPayeeSecondarySales) ||
                (proposal.additionalPayeeSecondarySales == address(0));
            automaticAccept =
                artistUnchanged &&
                additionalPrimaryUnchangedOrRemoved &&
                additionalSecondaryUnchangedOrRemoved;
        }
        if (automaticAccept) {
            // clear any previously proposed values
            proposedHashes[proposal.projectId] = bytes32(0);

            // update storage
            // artist address can change during automatic accept if
            // autoApproveArtistSplitProposals is true
            _updateProjectFinancePayees({
                projectFinance: projectFinance,
                proposal: proposal
            });

            // assign project's splitter
            // @dev only call after all previous storage updates
            _assignSplitter({
                projectFinance: projectFinance,
                splitProvider: splitProvider,
                projectId: proposal.projectId
            });

            // emit event for off-chain indexing
            emit IGenArt721CoreContractV3_Base.AcceptedArtistAddressesAndSplits(
                proposal.projectId
            );
        } else {
            proposedHashes[proposal.projectId] = _hashProposal(proposal);
        }
    }

    /**
     * @notice Admin acceptance of a proposed set of payment addresses and
     * splits. Reverts unless `proposal` matches the stored proposal hash.
     * @dev Emits, in order, `ProjectRoyaltySplitterUpdated` followed by
     * `AcceptedArtistAddressesAndSplits`. This ordering matches the
     * pre-offload core implementation and must be preserved.
     * @param proposal Payee addresses and percentages being accepted.
     * @param projectFinance Project finance storage for the project.
     * @param proposedHashes Core's `proposedArtistAddressesAndSplitsHash`.
     * @param splitProvider Core's split provider.
     */
    function adminAcceptArtistAddressesAndSplits(
        ArtistSplitProposal memory proposal,
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        mapping(uint256 => bytes32) storage proposedHashes,
        ISplitProviderV0 splitProvider
    ) external {
        // checks
        if (proposedHashes[proposal.projectId] != _hashProposal(proposal)) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.MustMatchArtistProposal
            );
        }
        // effects
        _updateProjectFinancePayees({
            projectFinance: projectFinance,
            proposal: proposal
        });
        // clear proposed values
        proposedHashes[proposal.projectId] = bytes32(0);

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter({
            projectFinance: projectFinance,
            splitProvider: splitProvider,
            projectId: proposal.projectId
        });

        // emit event for off-chain indexing
        emit IGenArt721CoreContractV3_Base.AcceptedArtistAddressesAndSplits(
            proposal.projectId
        );
    }

    /**
     * @notice Detailed input validation for a project's aspect ratio string.
     * Reverts unless `aspectRatio` is at most 11 characters, contains at least
     * one digit, and contains no characters other than digits and at most one
     * decimal separator.
     */
    function validateAspectRatio(string memory aspectRatio) external pure {
        bytes memory aspectRatioBytes = bytes(aspectRatio);
        uint256 bytesLength = aspectRatioBytes.length;
        if (bytesLength > 11) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.AspectRatioTooLong
            );
        }
        bool hasSeenDecimalSeparator = false;
        bool hasSeenNumber = false;
        for (uint256 i; i < bytesLength; i++) {
            bytes1 character = aspectRatioBytes[i];
            // Allow as many #s as desired.
            if (character >= 0x30 && character <= 0x39) {
                // 9-0
                // We need to ensure there is at least 1 `9-0` occurrence.
                hasSeenNumber = true;
                continue;
            }
            if (character == 0x2E) {
                // .
                // Allow no more than 1 `.` occurrence.
                if (!hasSeenDecimalSeparator) {
                    hasSeenDecimalSeparator = true;
                    continue;
                }
            }
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .AspectRatioImproperFormat
            );
        }
        if (!hasSeenNumber) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.AspectRatioNoNumbers
            );
        }
    }

    /**
     * @notice Script type/version format check. Reverts unless
     * `scriptTypeAndVersion` contains exactly one at-sign (0x40) character.
     */
    function validateScriptTypeAndVersion(
        bytes32 scriptTypeAndVersion
    ) external pure {
        if (
            !scriptTypeAndVersion.containsExactCharacterQty({
                utf8CharCode: uint8(bytes1("@")), // 0x40
                targetQty: uint8(1)
            })
        ) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base
                    .ErrorCodes
                    .ScriptTypeAndVersionFormat
            );
        }
    }

    /**
     * @notice Build a core's initial default base URI, of the form
     * `{host}{coreContract}/`.
     * @dev Offloaded from the cores because `Strings.toHexString` is otherwise
     * only reachable from contract initialization, and is a meaningful share
     * of the size-constrained Engine Flex core's bytecode.
     * @param host Base URI prefix, e.g. "https://token.artblocks.io/".
     * @param coreContract Core contract address to embed in the URI.
     */
    function buildDefaultBaseURI(
        string memory host,
        address coreContract
    ) external pure returns (string memory) {
        return string.concat(host, coreContract.toHexString(), "/");
    }

    /**
     * @notice Write a proposal's payee addresses and percentages to a
     * project's finance storage.
     * @dev Percentages are validated to be <= 100 by the calling function, or
     * by the proposal hash matching a previously validated proposal, so the
     * uint8 casts below cannot truncate.
     */
    function _updateProjectFinancePayees(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        ArtistSplitProposal memory proposal
    ) private {
        projectFinance.artistAddress = proposal.artistAddress;
        projectFinance.additionalPayeePrimarySales = proposal
            .additionalPayeePrimarySales;
        // safe to cast as uint8 as max is 100%, max uint8 is 255
        projectFinance.additionalPayeePrimarySalesPercentage = uint8(
            proposal.additionalPayeePrimarySalesPercentage
        );
        projectFinance.additionalPayeeSecondarySales = proposal
            .additionalPayeeSecondarySales;
        // safe to cast as uint8 as max is 100%, max uint8 is 255
        projectFinance.additionalPayeeSecondarySalesPercentage = uint8(
            proposal.additionalPayeeSecondarySalesPercentage
        );
    }

    /**
     * @notice Hash of a proposal's payee fields, as stored in the core's
     * `proposedArtistAddressesAndSplitsHash` mapping.
     * @dev Encoding must exactly match the pre-offload core implementation, so
     * that proposals made against prior core versions hash identically.
     * `projectId` is intentionally excluded, matching prior behavior.
     */
    function _hashProposal(
        ArtistSplitProposal memory proposal
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    proposal.artistAddress,
                    proposal.additionalPayeePrimarySales,
                    proposal.additionalPayeePrimarySalesPercentage,
                    proposal.additionalPayeeSecondarySales,
                    proposal.additionalPayeeSecondarySalesPercentage
                )
            );
    }

    /**
     * @notice Assign a project's royalty splitter and emit
     * `ProjectRoyaltySplitterUpdated`.
     * @dev Private so that this library's external entry points share a single
     * copy, rather than the logic being inlined into each calling core.
     */
    function _assignSplitter(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        ISplitProviderV0 splitProvider,
        uint256 projectId
    ) private {
        // assign project's royalty splitter
        // @dev loads values from storage, so need to ensure storage has been updated
        address royaltySplitter = splitProvider.getOrCreateSplitter(
            ISplitProviderV0.SplitInputs({
                platformProviderSecondarySalesAddress: projectFinance
                    .platformProviderSecondarySalesAddress,
                platformProviderSecondarySalesBPS: projectFinance
                    .platformProviderSecondarySalesBPS,
                renderProviderSecondarySalesAddress: projectFinance
                    .renderProviderSecondarySalesAddress,
                renderProviderSecondarySalesBPS: projectFinance
                    .renderProviderSecondarySalesBPS,
                artistTotalRoyaltyPercentage: projectFinance
                    .secondaryMarketRoyaltyPercentage,
                artist: projectFinance.artistAddress,
                additionalPayee: projectFinance.additionalPayeeSecondarySales,
                additionalPayeePercentage: projectFinance
                    .additionalPayeeSecondarySalesPercentage
            })
        );

        projectFinance.royaltySplitter = royaltySplitter;

        emit IGenArt721CoreContractV3_Base.ProjectRoyaltySplitterUpdated({
            projectId: projectId,
            royaltySplitter: royaltySplitter
        });
    }
}
