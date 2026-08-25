// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";
import "./IGenArt721CoreContractV3_Base.sol";
import "./ISplitProviderV0.sol";

/**
 * @notice Struct representing Engine contract configuration.
 * @param tokenName Name of token.
 * @param tokenSymbol Token symbol.
 * @param renderProviderAddress address to send render provider revenue to
 * @param randomizerContract Randomizer contract.
 * @param splitProviderAddress Address to use as royalty splitter provider for the contract.
 * @param minterFilterAddress Address of the Minter Filter to set as the Minter
 * on the contract.
 * @param startingProjectId The initial next project ID.
 * @param autoApproveArtistSplitProposals Whether or not to always
 * auto-approve proposed artist split updates.
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
    address newSuperAdminAddress;
    address randomizerContract;
    address splitProviderAddress;
    address minterFilterAddress;
    uint248 startingProjectId;
    bool autoApproveArtistSplitProposals;
    bool nullPlatformProvider;
    bool allowArtistProjectActivation;
}

interface IGenArt721CoreContractV3_Engine is IGenArt721CoreContractV3_Base {
    // @dev new function in V3.2
    /**
     * @notice Initializes the contract with the provided `engineConfiguration`.
     * This function should be called atomically, immediately after deployment.
     * Only callable once. Validation on `engineConfiguration` is performed by caller.
     * @param engineConfiguration EngineConfiguration to configure the contract with.
     * @param adminACLContract_ Address of admin access control contract, to be
     * set as contract owner.
     * @param defaultBaseURIHost Base URI prefix to initialize default base URI with.
     * @param bytecodeStorageReaderContract_ Address of the bytecode storage reader contract.
     */
    function initialize(
        EngineConfiguration calldata engineConfiguration,
        address adminACLContract_,
        string memory defaultBaseURIHost,
        address bytecodeStorageReaderContract_
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

    /** @notice The default render provider payment address for all secondary sales royalty
     * revenues, for all new projects. Individual project payment info is defined
     * in each project's ProjectFinance struct.
     * @return The default render provider payment address for secondary sales royalties.
     */
    function defaultRenderProviderSecondarySalesAddress()
        external
        view
        returns (address payable);

    /** @notice The default platform provider payment address for all secondary sales royalty
     * revenues, for all new projects. Individual project payment info is defined
     * in each project's ProjectFinance struct.
     * @return The default platform provider payment address for secondary sales royalties.
     */
    function defaultPlatformProviderSecondarySalesAddress()
        external
        view
        returns (address payable);

    /** @notice The default render provider payment basis points for all secondary sales royalty
     * revenues, for all new projects. Individual project payment info is defined
     * in each project's ProjectFinance struct.
     * @return The default render provider payment basis points for secondary sales royalties.
     */
    function defaultRenderProviderSecondarySalesBPS()
        external
        view
        returns (uint256);

    /** @notice The default platform provider payment basis points for all secondary sales royalty
     * revenues, for all new projects. Individual project payment info is defined
     * in each project's ProjectFinance struct.
     * @return The default platform provider payment basis points for secondary sales royalties.
     */
    function defaultPlatformProviderSecondarySalesBPS()
        external
        view
        returns (uint256);

    /**
     * @notice The address of the current split provider being used by the contract.
     * @return The address of the current split provider.
     */
    function splitProvider() external view returns (ISplitProviderV0);

    /**
     * @notice Project `_projectId` transfer hook updated to `_hook`.
     * @dev New event in v3.3. `_hook` of `address(0)` means no hook is
     * configured (today's transfer security profile).
     */
    event ProjectTransferHookUpdated(
        uint256 indexed _projectId,
        address indexed _hook
    );

    /**
     * @notice Project `_projectId` transfer hook configuration has been
     * permanently locked at `_hook` (which may be `address(0)`).
     * @dev New event in v3.3. One-way; independent of the four-week project
     * metadata lock.
     */
    event ProjectTransferHookLocked(
        uint256 indexed _projectId,
        address indexed _hook
    );

    /**
     * @notice Set or clear the transfer hook for project `_projectId`.
     * @dev New function in v3.3. Artist or Admin ACL. Reverts if the project's
     * transfer hook configuration is locked. A non-zero hook must ERC-165-
     * advertise `ITransferHook`. `address(0)` clears the hook.
     * @param _projectId Project ID.
     * @param _hook Hook contract, or `address(0)` to clear.
     */
    function configureProjectTransferHook(
        uint256 _projectId,
        address _hook
    ) external;

    /**
     * @notice Permanently lock the current transfer hook for project
     * `_projectId`, including `address(0)`.
     * @dev New function in v3.3. Artist only. Independent of the four-week
     * project metadata lock. If locked at `address(0)`, a hook can never be
     * assigned — restoring today's transfer security profile.
     * @param _projectId Project ID.
     */
    function lockProjectTransferHook(uint256 _projectId) external;

    /**
     * @notice Transfer hook configuration for project `_projectId`.
     * @return hook Hook address, or `address(0)` if none is configured.
     * @return locked True if the configuration is permanently locked.
     */
    function projectTransferHookConfig(
        uint256 _projectId
    ) external view returns (address hook, bool locked);
}
