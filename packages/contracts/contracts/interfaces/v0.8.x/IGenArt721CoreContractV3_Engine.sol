// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";
import "./IGenArt721CoreContractV3_Base.sol";

/**
 * @notice Struct representing Engine contract configuration.
 * @param tokenName Name of token.
 * @param tokenSymbol Token symbol.
 * @param randomizerContract Randomizer contract.
 * @param startingProjectId The initial next project ID.
 * @param autoApproveArtistSplitProposals Whether or not to always
 * auto-approve proposed artist split updates.
 * @param splitProviderAddress Address to use as royalty splitter provider for the contract.
 * @param nullPlatformProvider Enforce always setting zero platform provider fees and addresses.
 * @param allowArtistProjectActivation Allow artist to activate their own projects.
 * @dev _startingProjectId should be set to a value much, much less than
 * max(uint248), but an explicit input type of `uint248` is used as it is
 * safer to cast up to `uint256` than it is to cast down for the purposes
 * of setting `_nextProjectId`.
 */
struct EngineConfiguration {
    string tokenName;
    string tokenSymbol;
    address renderProviderAddress;
    address platformProviderAddress;
    address randomizerContract;
    uint248 startingProjectId;
    bool autoApproveArtistSplitProposals;
    address splitProviderAddress;
    bool nullPlatformProvider;
    bool allowArtistProjectActivation;
}

interface IGenArt721CoreContractV3_Engine is IGenArt721CoreContractV3_Base {
    // @dev new function in V3.2
    /**
     * @notice Initializes the contract with the provided `engineConfiguration`.
     * This function should be called atomically, immediately after deployment.
     * Only callable once.
     * @param engineConfiguration EngineConfiguration data to configure the contract
     * with.
     * @param adminACLContract_ Address of admin access control contract, to be
     * set as contract owner.
     */
    function initialize(
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract_
    ) external;

    // @dev new function in V3
    function getPrimaryRevenueSplits(
        uint256 _projectId,
        uint256 _price
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
        );

    // @dev The core type
    function CORE_TYPE() external view returns (bytes32);

    // @dev The core version
    function CORE_VERSION() external view returns (bytes32);

    // @dev The render provider primary sales payment address
    function renderProviderPrimarySalesAddress()
        external
        view
        returns (address payable);

    // @dev The platform provider primary sales payment address
    function platformProviderPrimarySalesAddress()
        external
        view
        returns (address payable);

    // @dev Percentage of primary sales allocated to the render provider
    function renderProviderPrimarySalesPercentage()
        external
        view
        returns (uint256);

    // @dev Percentage of primary sales allocated to the platform provider
    function platformProviderPrimarySalesPercentage()
        external
        view
        returns (uint256);

    // @dev The render provider secondary sales royalties payment address
    function renderProviderSecondarySalesAddress()
        external
        view
        returns (address payable);

    // @dev The platform provider secondary sales royalties payment address
    function platformProviderSecondarySalesAddress()
        external
        view
        returns (address payable);

    // @dev Basis points of secondary sales allocated to the render provider
    function renderProviderSecondarySalesBPS() external view returns (uint256);

    // @dev Basis points of secondary sales allocated to the platform provider
    function platformProviderSecondarySalesBPS()
        external
        view
        returns (uint256);
}
