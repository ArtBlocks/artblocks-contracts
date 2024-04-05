// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";

/**
 * @title This interface defines a project finance struct that is used in the
 * GenArt721CoreContractV3 flagship and derivative implementations beginning
 * with v3.2.0. This struct is intended to house all financial information
 * related to a project, including royalties, artist splits, and platform
 * provider splits.
 * @author Art Blocks Inc.
 */
interface IGenArt721CoreContractV3_ProjectFinance {
    /// packed struct containing project financial information
    struct ProjectFinance {
        address payable additionalPayeePrimarySales;
        // packed uint: max of 95, max uint8 = 255
        uint8 secondaryMarketRoyaltyPercentage;
        address payable additionalPayeeSecondarySales;
        // packed uint: max of 100, max uint8 = 255
        uint8 additionalPayeeSecondarySalesPercentage;
        address payable artistAddress;
        // packed uint: max of 100, max uint8 = 255
        uint8 additionalPayeePrimarySalesPercentage;
        address platformProviderSecondarySalesAddress;
        // packed uint: max of 10_000 max uint16 = 65_535
        uint16 platformProviderSecondarySalesBPS;
        address renderProviderSecondarySalesAddress;
        // packed uint: max of 10_000 max uint16 = 65_535
        uint16 renderProviderSecondarySalesBPS;
        // address to send ERC-2981 royalties to
        address royaltySplitter;
    }
}
