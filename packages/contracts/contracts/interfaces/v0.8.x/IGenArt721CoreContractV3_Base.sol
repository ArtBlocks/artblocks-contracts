// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";

/**
 * @title This interface is intended to house interface items that are common
 * across all GenArt721CoreContractV3 flagship and derivative implementations.
 * This interface extends the IManifold royalty interface in order to
 * add support the Royalty Registry by default.
 * @author Art Blocks Inc.
 */
interface IGenArt721CoreContractV3_Base {
    // This interface emits generic events that contain fields that indicate
    // which parameter has been updated. This is sufficient for application
    // state management, while also simplifying the contract and indexing code.
    // This was done as an alternative to having custom events that emit what
    // field-values have changed for each event, given that changed values can
    // be introspected by indexers due to the design of this smart contract
    // exposing these state changes via publicly viewable fields.

    // The following fields are used to indicate which contract-level parameter
    // has been updated in the `PlatformUpdated` event:
    // @dev only append to the end of this enum in the case of future updates
    enum PlatformUpdatedFields {
        FIELD_NEXT_PROJECT_ID, // 0
        FIELD_NEW_PROJECTS_FORBIDDEN, // 1
        FIELD_DEFAULT_BASE_URI, // 2
        FIELD_RANDOMIZER_ADDRESS, // 3
        FIELD_NEXT_CORE_CONTRACT, // 4
        FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS, // 5
        FIELD_ARTBLOCKS_ON_CHAIN_GENERATOR_ADDRESS, // 6
        FIELD_PROVIDER_SALES_ADDRESSES, // 7
        FIELD_PROVIDER_PRIMARY_SALES_PERCENTAGES, // 8
        FIELD_PROVIDER_SECONDARY_SALES_BPS, // 9
        FIELD_SPLIT_PROVIDER // 10
    }

    // The following fields are used to indicate which project-level parameter
    // has been updated in the `ProjectUpdated` event:
    // @dev only append to the end of this enum in the case of future updates
    enum ProjectUpdatedFields {
        FIELD_PROJECT_COMPLETED, // 0
        FIELD_PROJECT_ACTIVE, // 1
        FIELD_PROJECT_ARTIST_ADDRESS, // 2
        FIELD_PROJECT_PAUSED, // 3
        FIELD_PROJECT_CREATED, // 4
        FIELD_PROJECT_NAME, // 5
        FIELD_PROJECT_ARTIST_NAME, // 6
        FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE, // 7
        FIELD_PROJECT_DESCRIPTION, // 8
        FIELD_PROJECT_WEBSITE, // 9
        FIELD_PROJECT_LICENSE, // 10
        FIELD_PROJECT_MAX_INVOCATIONS, // 11
        FIELD_PROJECT_SCRIPT, // 12
        FIELD_PROJECT_SCRIPT_TYPE, // 13
        FIELD_PROJECT_ASPECT_RATIO, // 14
        FIELD_PROJECT_BASE_URI // 15
    }

    /**
     * @notice Error codes for the GenArt721 contract. Used by the GenArt721Error
     * custom error.
     * @dev only append to the end of this enum in the case of future updates
     */
    enum ErrorCodes {
        OnlyNonZeroAddress, // 0
        OnlyNonEmptyString, // 1
        OnlyNonEmptyBytes, // 2
        TokenDoesNotExist, // 3
        ProjectDoesNotExist, // 4
        OnlyUnlockedProjects, // 5
        OnlyAdminACL, // 6
        OnlyArtist, // 7
        OnlyArtistOrAdminACL, // 8
        OnlyAdminACLOrRenouncedArtist, // 9
        OnlyMinterContract, // 10
        MaxInvocationsReached, // 11
        ProjectMustExistAndBeActive, // 12
        PurchasesPaused, // 13
        OnlyRandomizer, // 14
        TokenHashAlreadySet, // 15
        NoZeroHashSeed, // 16
        OverMaxSumOfPercentages, // 17
        IndexOutOfBounds, // 18
        OverMaxSumOfBPS, // 19
        MaxOf100Percent, // 20
        PrimaryPayeeIsZeroAddress, // 21
        SecondaryPayeeIsZeroAddress, // 22
        MustMatchArtistProposal, // 23
        NewProjectsForbidden, // 24
        NewProjectsAlreadyForbidden, // 25
        OnlyArtistOrAdminIfLocked, // 26
        OverMaxSecondaryRoyaltyPercentage, // 27
        OnlyMaxInvocationsDecrease, // 28
        OnlyGteInvocations, // 29
        ScriptIdOutOfRange, // 30
        NoScriptsToRemove, // 31
        ScriptTypeAndVersionFormat, // 32
        AspectRatioTooLong, // 33
        AspectRatioNoNumbers, // 34
        AspectRatioImproperFormat // 35
    }

    /**
     * @notice Emits an error code `_errorCode` in the GenArt721Error event.
     * @dev Emitting error codes instead of error strings saves significant
     * contract bytecode size, allowing for more contract functionality within
     * the 24KB contract size limit.
     * @param _errorCode The error code to emit. See ErrorCodes enum.
     */
    error GenArt721Error(ErrorCodes _errorCode);

    /**
     * @notice Token ID `_tokenId` minted to `_to`.
     */
    event Mint(address indexed _to, uint256 indexed _tokenId);

    /**
     * @notice currentMinter updated to `_currentMinter`.
     * @dev Implemented starting with V3 core
     */
    event MinterUpdated(address indexed _currentMinter);

    /**
     * @notice Platform updated on bytes32-encoded field `_field`.
     */
    event PlatformUpdated(bytes32 indexed _field);

    /**
     * @notice Project ID `_projectId` updated on bytes32-encoded field
     * `_update`.
     */
    event ProjectUpdated(uint256 indexed _projectId, bytes32 indexed _update);

    event ProposedArtistAddressesAndSplits(
        uint256 indexed _projectId,
        address _artistAddress,
        address _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    );

    event AcceptedArtistAddressesAndSplits(uint256 indexed _projectId);

    // version and type of the core contract
    // coreVersion is a string of the form "0.x.y"
    function coreVersion() external view returns (string memory);

    // coreType is a string of the form "GenArt721CoreV3"
    function coreType() external view returns (string memory);

    // owner (pre-V3 was named admin) of contract
    // this is expected to be an Admin ACL contract for V3
    function owner() external view returns (address);

    // Admin ACL contract for V3, will be at the address owner()
    function adminACLContract() external returns (IAdminACLV0);

    // backwards-compatible (pre-V3) admin - equal to owner()
    function admin() external view returns (address);

    /**
     * Function determining if _sender is allowed to call function with
     * selector _selector on contract `_contract`. Intended to be used with
     * peripheral contracts such as minters, as well as internally by the
     * core contract itself.
     */
    function adminACLAllowed(
        address _sender,
        address _contract,
        bytes4 _selector
    ) external returns (bool);

    /// getter function of public variable
    function startingProjectId() external view returns (uint256);

    // getter function of public variable
    function nextProjectId() external view returns (uint256);

    // getter function of public mapping
    function tokenIdToProjectId(
        uint256 tokenId
    ) external view returns (uint256 projectId);

    // @dev this is not available in V0
    function isMintWhitelisted(address minter) external view returns (bool);

    function projectIdToArtistAddress(
        uint256 _projectId
    ) external view returns (address payable);

    function projectURIInfo(
        uint256 _projectId
    ) external view returns (string memory projectBaseURI);

    // @dev new function in V3
    function projectStateData(
        uint256 _projectId
    )
        external
        view
        returns (
            uint256 invocations,
            uint256 maxInvocations,
            bool active,
            bool paused,
            uint256 completedTimestamp,
            bool locked
        );

    function projectDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            string memory projectName,
            string memory artist,
            string memory description,
            string memory website,
            string memory license
        );

    function projectScriptDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            string memory scriptTypeAndVersion,
            string memory aspectRatio,
            uint256 scriptCount
        );

    function projectScriptByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (string memory);

    function tokenIdToHash(uint256 _tokenId) external view returns (bytes32);

    // function to set a token's hash (must be guarded)
    function setTokenHash_8PT(uint256 _tokenId, bytes32 _hash) external;

    // @dev gas-optimized signature in V3 for `mint`
    function mint_Ecf(
        address _to,
        uint256 _projectId,
        address _by
    ) external returns (uint256 tokenId);
}
