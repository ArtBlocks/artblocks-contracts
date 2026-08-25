// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_ProjectFinance} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_ProjectFinance.sol";
import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";

/**
 * @title Shared project-finance helpers for V3 Engine and Engine Flex cores.
 * @author Art Blocks Inc.
 * @notice External library (DELEGATECALL) used by both `GenArt721CoreV3_Engine`
 * and `GenArt721CoreV3_Engine_Flex`. Offloading this logic keeps the two cores
 * consistent while both remain under the 24KB bytecode size limit.
 * @dev Hosts ERC-2981 royalty info, primary revenue splits, and royalty
 * splitter assignment.
 */
library V3EngineLib {
    /**
     * @notice ERC-2981 royalty info for a project's finance struct.
     * @dev Shared by Engine and Engine Flex via DELEGATECALL so both cores
     * stay consistent while remaining under the 24KB bytecode size limit.
     */
    function royaltyInfo(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        receiver = projectFinance.royaltySplitter;
        uint256 totalRoyaltyBPS = (100 *
            uint256(projectFinance.secondaryMarketRoyaltyPercentage)) +
            projectFinance.platformProviderSecondarySalesBPS +
            projectFinance.renderProviderSecondarySalesBPS;
        if (totalRoyaltyBPS > 10_000) {
            revert IGenArt721CoreContractV3_Base.GenArt721Error(
                IGenArt721CoreContractV3_Base.ErrorCodes.OverMaxSumOfBPS
            );
        }
        royaltyAmount = (salePrice * totalRoyaltyBPS) / 10_000;
    }

    /**
     * @notice Primary revenue split view.
     * @dev Shared by Engine and Engine Flex via DELEGATECALL so both cores
     * stay consistent while remaining under the 24KB bytecode size limit.
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
            100;
        projectFunds -= renderProviderRevenue_;
        platformProviderRevenue_ =
            (price * platformProviderPrimarySalesPercentage) /
            100;
        projectFunds -= platformProviderRevenue_;
        additionalPayeePrimaryRevenue_ =
            (projectFunds *
                projectFinance.additionalPayeePrimarySalesPercentage) /
            100;
        artistRevenue_ = projectFunds - additionalPayeePrimaryRevenue_;
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
     * @dev Shared by Engine and Engine Flex via DELEGATECALL so both cores
     * stay consistent while remaining under the 24KB bytecode size limit.
     * Loads values from `projectFinance`, so storage must be updated before
     * calling. Includes a trusted splitter-provider interaction that is
     * entrusted not to reenter the core. Keep a thin core wrapper so call
     * sites stay JUMP.
     */
    function assignSplitter(
        IGenArt721CoreContractV3_ProjectFinance.ProjectFinance
            storage projectFinance,
        ISplitProviderV0 splitProvider,
        uint256 projectId
    ) external {
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
