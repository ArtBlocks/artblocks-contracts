// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import "../../interfaces/v0.8.x/IRandomizer_V3CoreBase.sol";
import "../../interfaces/v0.8.x/IAdminACLV0_Extended.sol";
import "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine_Flex.sol";
import {IGenArt721CoreContractV3_ProjectFinance} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_ProjectFinance.sol";
import "../../interfaces/v0.8.x/IGenArt721CoreContractExposesHashSeed.sol";
import "../../interfaces/v0.8.x/IDependencyRegistryCompatibleV0.sol";
import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";

import "@openzeppelin-5.0/contracts/utils/Strings.sol";
import "@openzeppelin-5.0/contracts/access/Ownable.sol";
import {IERC2981} from "@openzeppelin-5.0/contracts/interfaces/IERC2981.sol";
import "../../libs/v0.8.x/ERC721_PackedHashSeedV1.sol";
import "../../libs/v0.8.x/BytecodeStorageV2.sol";
import {V3FlexLib} from "../../libs/v0.8.x/V3FlexLib.sol";
import "../../libs/v0.8.x/Bytes32Strings.sol";

/**
 * @title Art Blocks Engine Flex ERC-721 core contract, V3.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with progressively limited powers
 * as a project progresses from active to locked.
 * Privileged roles and abilities are controlled by the admin ACL contract and
 * artists. Both of these roles hold extensive power and can arbitrarily
 * control and modify portions of projects, dependent upon project state. After
 * a project is locked, important project metadata fields are locked including
 * the project name, artist name, and script and display details. Edition size
 * can never be increased.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the Admin ACL contract:
 * - updateArtblocksDependencyRegistryAddress
 * - updateArtblocksOnChainGeneratorAddress
 * - updateNextCoreContract
 * - updateProviderSalesAddresses
 * - updateProviderPrimarySalesPercentages (up to 100%)
 * - updateProviderDefaultSecondarySalesBPS (up to 100%)
 * - syncProviderSecondaryForProjectToDefaults
 * - updateMinterContract
 * - updateRandomizerAddress
 * - toggleProjectIsActive (note: artist may be configured to activate projects)
 * - addProject
 * - forbidNewProjects (forever forbidding new projects)
 * - updateDefaultBaseURI (used to initialize new project base URIs)
 * - updateSplitProvider
 * - updateIPFSGateway
 * - updateArweaveGateway
 * ----------------------------------------------------------------------------
 * The following functions are restricted to either the Artist address or
 * the Admin ACL contract, only when the project is not locked:
 * - updateProjectName
 * - updateProjectArtistName
 * - updateProjectLicense
 * - Change project script via addProjectScript, addProjectScriptCompressed,
 *   updateProjectScript, updateProjectScriptCompressed,
 *   and removeProjectLastScript
 * - updateProjectScriptType
 * - updateProjectAspectRatio
 * ----------------------------------------------------------------------------
 * The following functions are restricted to only the Artist address:
 * - proposeArtistPaymentAddressesAndSplits (Note that this has to be accepted
 *   by adminAcceptArtistAddressesAndSplits to take effect, which is restricted
 *   to the Admin ACL contract, or the artist if the core contract owner has
 *   renounced ownership. Also note that a proposal will be automatically
 *   accepted if the artist only proposes changed payee percentages without
 *   modifying any payee addresses, or is only removing payee addresses, or
 *   if the global config `autoApproveArtistSplitProposals` is set to `true`.)
 * - toggleProjectIsPaused (note the artist can still mint while paused)
 * - updateProjectSecondaryMarketRoyaltyPercentage (up to
     ARTIST_MAX_SECONDARY_ROYALTY_PERCENTAGE percent)
 * - updateProjectWebsite
 * - updateProjectMaxInvocations (to a number greater than or equal to the
 *   current number of invocations, and less than current project maximum
 *   invocations)
 * - updateProjectBaseURI (controlling the base URI for tokens in the project)
 * ----------------------------------------------------------------------------
 * The following function is restricted to either the Admin ACL contract, or
 * the Artist address if the core contract owner has renounced ownership:
 * - adminAcceptArtistAddressesAndSplits
 * - updateProjectArtistAddress (owner ultimately controlling the project and
 *   its and-on revenue, unless owner has renounced ownership)
 * ----------------------------------------------------------------------------
 * The following function is restricted to the artist when a project is
 * unlocked, and only callable by Admin ACL contract when a project is locked:
 * - updateProjectDescription
 * ----------------------------------------------------------------------------
 * The following functions for managing external asset dependencies are restricted
 * to projects with external asset dependencies that are unlocked:
 * - lockProjectExternalAssetDependencies 
 * - updateProjectExternalAssetDependency
 * - updateProjectExternalAssetDependencyOnChainCompressed
 * - updateProjectAssetDependencyOnChainAtAddress
 * - removeProjectExternalAssetDependency
 * - addProjectExternalAssetDependency
 * - addProjectExternalAssetDependencyOnChainCompressed
 * - addProjectAssetDependencyOnChainAtAddress
 * ----------------------------------------------------------------------------
 * The following function is restricted to owner calling directly:
 * - transferOwnership
 * - renounceOwnership
 * ----------------------------------------------------------------------------
 * The following configuration variables are set at time of contract deployment,
 * and not modifiable thereafter (immutable after the point of deployment):
 * - (bool) autoApproveArtistSplitProposals
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on minters,
 * registries, and other contracts that may interact with this core contract.
 */
contract GenArt721CoreV3_Engine_Flex is
    ERC721_PackedHashSeedV1,
    Ownable,
    IERC2981,
    IDependencyRegistryCompatibleV0,
    IGenArt721CoreContractV3_Engine_Flex,
    IGenArt721CoreContractV3_ProjectFinance,
    IGenArt721CoreContractExposesHashSeed
{
    using BytecodeStorageWriter for string;
    using BytecodeStorageWriter for bytes;
    using Bytes32Strings for bytes32;
    using Strings for uint256;
    using Strings for address;
    uint256 constant ONE_HUNDRED = 100;
    uint256 constant ONE_MILLION = 1_000_000;
    uint24 constant ONE_MILLION_UINT24 = 1_000_000;
    uint256 constant FOUR_WEEKS_IN_SECONDS = 2_419_200;
    uint8 constant AT_CHARACTER_CODE = uint8(bytes1("@")); // 0x40

    // numeric constants
    uint256 constant MAX_PROVIDER_SECONDARY_SALES_BPS = 10000; // 10_000 BPS = 100%
    uint256 constant ARTIST_MAX_SECONDARY_ROYALTY_PERCENTAGE = 95; // 95%

    /// pointer to next core contract associated with this contract
    address public nextCoreContract;

    /// Dependency registry managed by Art Blocks
    address public artblocksDependencyRegistryAddress;
    /// On chain generator managed by Art Blocks
    address public artblocksOnChainGeneratorAddress;

    /// ensure initialization can only be performed once
    bool private initialized;

    /// current randomizer contract
    IRandomizer_V3CoreBase public randomizerContract;

    /// append-only array of all randomizer contract addresses ever used by
    /// this contract
    address[] private _historicalRandomizerAddresses;

    /// admin ACL contract
    IAdminACLV0 public adminACLContract;

    struct Project {
        uint24 invocations;
        uint24 maxInvocations;
        uint24 scriptCount;
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 completedTimestamp;
        bool active;
        bool paused;
        string name;
        string artist;
        address descriptionAddress;
        string website;
        string license;
        string projectBaseURI;
        bytes32 scriptTypeAndVersion;
        string aspectRatio;
        // mapping from script index to address storing script in bytecode
        mapping(uint256 => address) scriptBytecodeAddresses;
    }

    mapping(uint256 => Project) projects;

    /// private mapping from project ID to project financial information. See
    /// `projectIdToFinancials` getter for public access.
    mapping(uint256 _projectId => ProjectFinance)
        private _projectIdToFinancials;

    /// hash of artist's proposed payment updates to be approved by admin
    mapping(uint256 => bytes32) public proposedArtistAddressesAndSplitsHash;

    /// The render provider payment address for all primary sales revenues
    /// (packed)
    address payable public renderProviderPrimarySalesAddress;
    /// Percentage of primary sales revenue allocated to the render provider
    /// (packed)
    // packed uint: max of 100, max uint8 = 255
    uint8 private _renderProviderPrimarySalesPercentage;
    /// The platform provider payment address for all primary sales revenues
    /// (packed)
    address payable public platformProviderPrimarySalesAddress;
    /// Percentage of primary sales revenue allocated to the platform provider
    /// (packed)
    // packed uint: max of 100, max uint8 = 255
    uint8 private _platformProviderPrimarySalesPercentage;

    /// @dev Note on "default" provider secondary values - the only way these can
    /// be different on a per project basis is if admin updates these and then
    /// does not call syncProviderSecondaryForProjectToDefaults for the project.
    /// -----------------------------------------------------------------------
    /// The default render provider payment address for all secondary sales royalty
    /// revenues, for all new projects. Individual project payment info is defined
    /// in each project's ProjectFinance struct.
    /// Projects can be updated to this value by calling the
    /// `syncProviderSecondaryForProjectToDefaults` function for each project.
    address payable public defaultRenderProviderSecondarySalesAddress;
    /// The default basis points allocated to render provider for all secondary
    /// sales royalty revenues, for all new projects. Individual project
    /// payment info is defined in each project's ProjectFinance struct.
    /// Projects can be updated to this value by calling the
    /// `syncProviderSecondaryForProjectToDefaults` function for each project.
    uint256 public defaultRenderProviderSecondarySalesBPS;
    /// The default platform provider payment address for all secondary sales royalty
    /// revenues, for all new projects. Individual project payment info is defined
    /// in each project's ProjectFinance struct.
    /// Projects can be updated to this value by calling the
    /// `syncProviderSecondaryForProjectToDefaults` function for each project.
    address payable public defaultPlatformProviderSecondarySalesAddress;
    /// The default basis points allocated to platform provider for all secondary
    /// sales royalty revenues, for all new projects. Individual project
    /// payment info is defined in each project's ProjectFinance struct.
    /// Projects can be updated to this value by calling the
    /// `syncProviderSecondaryForProjectToDefaults` function for each project.
    uint256 public defaultPlatformProviderSecondarySalesBPS;
    /// -----------------------------------------------------------------------

    /// single minter allowed for this core contract
    address public minterContract;

    /// starting (initial) project ID on this contract configured
    /// at time of deployment and intended to be immutable after initialization.
    /// Not marked as immutable due to initialization requirements
    /// under the ERC-1167 minimal proxy pattern, which necessitates
    /// setting this value post-deployment.
    uint256 public startingProjectId;

    /// next project ID to be created
    uint248 private _nextProjectId;

    /// bool indicating if adding new projects is forbidden;
    /// default behavior is to allow new projects
    bool public newProjectsForbidden;

    /// configuration variable set at time of deployment, intended to be
    /// immutable after initialization, that determines whether or not
    /// admin approval^ should be required to accept artist address change
    /// proposals, or if these proposals should always auto-approve, as
    /// determined by the business process requirements of the Engine
    /// partner using this contract.
    ///
    /// ^does not apply in the case where contract-ownership itself is revoked
    /// Not marked as immutable due to initialization requirements
    /// under the ERC-1167 minimal proxy pattern, which necessitates
    /// setting this value post-deployment.
    bool public autoApproveArtistSplitProposals;

    /// configuration variable set at time of deployment, intended to be
    /// immutable after initialization, that determines if platform provider
    /// fees and addresses are always required to be set to zero.
    /// Not marked as immutable due to initialization requirements
    /// under the ERC-1167 minimal proxy pattern, which necessitates
    /// setting this value post-deployment.
    bool public nullPlatformProvider;

    /// configuration variable set at time of deployment, intended to be
    /// immutable after initialization, that determines if artists are allowed
    /// to activate their own projects.
    /// Not marked as immutable due to initialization requirements
    /// under the ERC-1167 minimal proxy pattern, which necessitates
    /// setting this value post-deployment.
    bool public allowArtistProjectActivation;

    /// version & type of this core contract
    bytes32 constant CORE_VERSION = "v3.2.1";

    function coreVersion() external pure returns (string memory) {
        return CORE_VERSION.toString();
    }

    bytes32 constant CORE_TYPE = "GenArt721CoreV3_Engine_Flex";

    function coreType() external pure returns (string memory) {
        return CORE_TYPE.toString();
    }

    /// default base URI to initialize all new project projectBaseURI values to
    string public defaultBaseURI;

    // ERC2981 royalty support and default royalty values
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    uint8 private constant _DEFAULT_ARTIST_SECONDARY_ROYALTY_PERCENTAGE = 5;

    // royalty split provider
    ISplitProviderV0 public splitProvider;

    /**
     * @dev This constructor sets the owner to a non-functional address as a formality.
     * It is only ever ran on the implementation contract. The `Ownable` constructor is
     * called to satisfy the contract's inheritance requirements. This owner has no
     * operational significance and should not be considered secure or meaningful.
     * The true ownership will be set in the `initialize` function post-deployment to
     * ensure correct owner management in the proxy architecture.
     * Explicitly setting the owner to '0xdead' to indicate non-operational use.
     */
    constructor() Ownable(0x000000000000000000000000000000000000dEaD) {}

    function _onlyNonZeroAddress(address _address) internal pure {
        if (_address == address(0)) {
            revert GenArt721Error(ErrorCodes.OnlyNonZeroAddress);
        }
    }

    function _onlyNonEmptyString(string memory _string) internal pure {
        if (bytes(_string).length == 0) {
            revert GenArt721Error(ErrorCodes.OnlyNonEmptyString);
        }
    }

    function _onlyNonEmptyBytes(bytes memory _bytes) internal pure {
        if (_bytes.length == 0) {
            revert GenArt721Error(ErrorCodes.OnlyNonEmptyBytes);
        }
    }

    function _onlyValidTokenId(uint256 _tokenId) internal view {
        if (_ownerOf(_tokenId) == address(0)) {
            revert GenArt721Error(ErrorCodes.TokenDoesNotExist);
        }
    }

    function _onlyValidProjectId(uint256 _projectId) internal view {
        if (_projectId < startingProjectId || _projectId >= _nextProjectId) {
            revert GenArt721Error(ErrorCodes.ProjectDoesNotExist);
        }
    }

    function _onlyUnlocked(uint256 _projectId) internal view {
        // Note: calling `_projectUnlocked` enforces that the `_projectId`
        //       passed in is valid.`
        if (!_projectUnlocked(_projectId)) {
            revert GenArt721Error(ErrorCodes.OnlyUnlockedProjects);
        }
    }

    function _onlyAdminACL(bytes4 _selector) internal {
        if (!adminACLAllowed(msg.sender, address(this), _selector)) {
            revert GenArt721Error(ErrorCodes.OnlyAdminACL);
        }
    }

    function _onlyArtist(uint256 _projectId) internal view {
        if (msg.sender != _projectIdToFinancials[_projectId].artistAddress) {
            revert GenArt721Error(ErrorCodes.OnlyArtist);
        }
    }

    function _onlyArtistOrAdminACL(
        uint256 _projectId,
        bytes4 _selector
    ) internal {
        if (
            !(msg.sender == _projectIdToFinancials[_projectId].artistAddress ||
                adminACLAllowed(msg.sender, address(this), _selector))
        ) {
            revert GenArt721Error(ErrorCodes.OnlyArtistOrAdminACL);
        }
    }

    /**
     * This modifier allows the artist of a project to call a function if the
     * owner of the contract has renounced ownership. This is to allow the
     * contract to continue to function if the owner decides to renounce
     * ownership.
     */
    function _onlyAdminACLOrRenouncedArtist(
        uint256 _projectId,
        bytes4 _selector
    ) internal {
        // check if Admin ACL is allowed to call this function
        if (adminACLAllowed(msg.sender, address(this), _selector)) {
            return;
        }
        // check if the owner has renounced ownership and the caller is the
        // artist of the project
        if (
            owner() == address(0) &&
            msg.sender == _projectIdToFinancials[_projectId].artistAddress
        ) {
            return;
        }
        // neither of the above conditions were met, revert
        revert GenArt721Error(ErrorCodes.OnlyAdminACLOrRenouncedArtist);
    }

    /**
     * @notice Initializes the contract with the provided `engineConfiguration`.
     * This function should be called atomically, immediately after deployment.
     * Only callable once. Validation on `engineConfiguration` is performed by caller.
     * @param engineConfiguration EngineConfiguration to configure the contract with.
     * @param _adminACLContract Address of admin access control contract, to be
     * set as contract owner.
     */
    function initialize(
        EngineConfiguration calldata engineConfiguration,
        address _adminACLContract
    ) external {
        // can only be initialized once
        if (initialized) {
            revert GenArt721Error(ErrorCodes.ContractInitialized);
        }
        // @dev assume renderProviderAddress, randomizer, and AdminACL non-zero
        // checks on platform provider addresses performed in _updateProviderSalesAddresses
        // initialize default sales revenue percentages and basis points
        _renderProviderPrimarySalesPercentage = 10;
        defaultRenderProviderSecondarySalesBPS = 250;
        _platformProviderPrimarySalesPercentage = engineConfiguration
            .nullPlatformProvider
            ? 0
            : 10;
        defaultPlatformProviderSecondarySalesBPS = engineConfiguration
            .nullPlatformProvider
            ? 0
            : 250;

        // set token name and token symbol
        ERC721_PackedHashSeedV1.initialize(
            engineConfiguration.tokenName,
            engineConfiguration.tokenSymbol
        );

        _updateSplitProvider(engineConfiguration.splitProviderAddress);
        // setup immutable `autoApproveArtistSplitProposals` config
        autoApproveArtistSplitProposals = engineConfiguration
            .autoApproveArtistSplitProposals;
        // setup immutable `nullPlatformProvider` config
        nullPlatformProvider = engineConfiguration.nullPlatformProvider;
        // setup immutable `allowArtistProjectActivation` config
        allowArtistProjectActivation = engineConfiguration
            .allowArtistProjectActivation;
        // record contracts starting project ID
        // casting-up is safe
        startingProjectId = uint256(engineConfiguration.startingProjectId);
        // @dev nullPlatformProvider must be set before calling _updateProviderSalesAddresses
        _updateProviderSalesAddresses(
            engineConfiguration.renderProviderAddress,
            engineConfiguration.renderProviderAddress,
            engineConfiguration.platformProviderAddress,
            engineConfiguration.platformProviderAddress
        );
        _updateRandomizerAddress(engineConfiguration.randomizerContract);
        // set AdminACL management contract as owner
        _transferOwnership(_adminACLContract);
        // initialize default base URI
        _updateDefaultBaseURI(
            string.concat(
                "https://token.artblocks.io/",
                address(this).toHexString(),
                "/"
            )
        );
        // initialize next project ID
        _nextProjectId = engineConfiguration.startingProjectId;
        emit PlatformUpdated(
            bytes32(uint256(PlatformUpdatedFields.FIELD_NEXT_PROJECT_ID))
        );
        initialized = true;
        // @dev This contract is registered on the core registry in a
        // subsequent call by the factory.
    }

    /**
     * @notice Updates preferredIPFSGateway to `_gateway`.
     */
    function updateIPFSGateway(string calldata _gateway) public {
        _onlyAdminACL(this.updateIPFSGateway.selector);
        V3FlexLib.updateIPFSGateway({_gateway: _gateway});
    }

    /**
     * @notice Updates preferredArweaveGateway to `_gateway`.
     */
    function updateArweaveGateway(string calldata _gateway) public {
        _onlyAdminACL(this.updateArweaveGateway.selector);
        V3FlexLib.updateArweaveGateway({_gateway: _gateway});
    }

    /**
     * @notice Locks external asset dependencies for project `_projectId`.
     */
    function lockProjectExternalAssetDependencies(uint256 _projectId) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.lockProjectExternalAssetDependencies.selector
        );
        V3FlexLib.lockProjectExternalAssetDependencies({
            _projectId: _projectId
        });
    }

    /**
     * @notice Updates external asset dependency for project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _cidOrData Field that contains the CID of the dependency if IPFS or ARWEAVE,
     * empty string of ONCHAIN, or a string representation of the Art Blocks Dependency
     * Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType Asset dependency type.
     *  0 - IPFS
     *  1 - ARWEAVE
     *  2 - ONCHAIN
     *  3 - ART_BLOCKS_DEPENDENCY_REGISTRY
     */
    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectExternalAssetDependency.selector
        );
        V3FlexLib.updateProjectExternalAssetDependency({
            _projectId: _projectId,
            _index: _index,
            _cidOrData: _cidOrData,
            _dependencyType: _dependencyType
        });
    }

    /**
     * @notice Updates external asset dependency for project `_projectId` of type
     * ONCHAIN using on-chain compression. The string should be compressed using
     * `getCompressed`.
     * This function stores the string in a compressed format on-chain.
     * For reads, the compressed script is decompressed on-chain, ensuring the
     * original text is reconstructed without external dependencies.
     * @dev _compressedString in memory to minimize bytecode size.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _compressedString Pre-compressed string asset to be added.
     */
    function updateProjectExternalAssetDependencyOnChainCompressed(
        uint256 _projectId,
        uint256 _index,
        bytes memory _compressedString
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectExternalAssetDependencyOnChainCompressed.selector
        );
        V3FlexLib.updateProjectExternalAssetDependencyOnChainCompressed({
            _projectId: _projectId,
            _index: _index,
            _compressedString: _compressedString
        });
    }

    /**
     * @notice Updates external asset dependency for project `_projectId` at
     * index `_index`, with data at BytecodeStorage-compatible address
     * `_assetAddress`.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _assetAddress Address of the on-chain asset.
     */
    function updateProjectAssetDependencyOnChainAtAddress(
        uint256 _projectId,
        uint256 _index,
        address _assetAddress
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectAssetDependencyOnChainAtAddress.selector
        );
        V3FlexLib.updateProjectAssetDependencyOnChainAtAddress({
            _projectId: _projectId,
            _index: _index,
            _assetAddress: _assetAddress
        });
    }

    /**
     * @notice Removes external asset dependency for project `_projectId` at index `_index`.
     * As of v3.2, only allow removal of dependency at last index, for UX purposes.
     * @param _projectId Project to be updated.
     * @param _index Asset index
     */
    function removeProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.removeProjectExternalAssetDependency.selector
        );
        V3FlexLib.removeProjectExternalAssetDependency({
            _projectId: _projectId,
            _index: _index
        });
    }

    /**
     * @notice Adds external asset dependency for project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _cidOrData Field that contains the CID of the dependency if IPFS or ARWEAVE,
     * empty string of ONCHAIN, or a string representation of the Art Blocks Dependency
     * Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType Asset dependency type.
     *  0 - IPFS
     *  1 - ARWEAVE
     *  2 - ONCHAIN
     *  3 - ART_BLOCKS_DEPENDENCY_REGISTRY
     */
    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.addProjectExternalAssetDependency.selector
        );
        V3FlexLib.addProjectExternalAssetDependency({
            _projectId: _projectId,
            _cidOrData: _cidOrData,
            _dependencyType: _dependencyType
        });
    }

    /**
     * @notice Adds external asset dependency for project `_projectId` of type
     * ONCHAIN using on-chain compression. The string should be compressed using
     * `getCompressed`.
     * This function stores the string in a compressed format on-chain.
     * For reads, the compressed script is decompressed on-chain, ensuring the
     * original text is reconstructed without external dependencies.
     * @dev _compressedString in memory to minimize bytecode size.
     * @param _projectId Project to be updated.
     * @param _compressedString Pre-compressed string asset to be added.
     */
    function addProjectExternalAssetDependencyOnChainCompressed(
        uint256 _projectId,
        bytes memory _compressedString
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.addProjectExternalAssetDependencyOnChainCompressed.selector
        );
        V3FlexLib.addProjectExternalAssetDependencyOnChainCompressed({
            _projectId: _projectId,
            _compressedString: _compressedString
        });
    }

    /**
     * @notice Adds an on-chain external asset dependency for project
     * `_projectId`, with data at BytecodeStorage-compatible address
     * `_assetAddress`.
     * @param _projectId Project to be updated.
     * @param _assetAddress Address of the BytecodeStorageReader-compatible on-chain asset.
     */
    function addProjectAssetDependencyOnChainAtAddress(
        uint256 _projectId,
        address _assetAddress
    ) external {
        _onlyArtistOrAdminACL(
            _projectId,
            this.addProjectAssetDependencyOnChainAtAddress.selector
        );
        V3FlexLib.addProjectAssetDependencyOnChainAtAddress({
            _projectId: _projectId,
            _assetAddress: _assetAddress
        });
    }

    /**
     * @notice Mints a token from project `_projectId` and sets the
     * token's owner to `_to`. Hash may or may not be assigned to the token
     * during the mint transaction, depending on the randomizer contract.
     * @param _to Address to be the minted token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _by Purchaser of minted token.
     * @return _tokenId The ID of the minted token.
     * @dev sender must be the allowed minterContract
     * @dev name of function is optimized for gas usage
     */
    function mint_Ecf(
        address _to,
        uint256 _projectId,
        address _by
    ) external returns (uint256 _tokenId) {
        // CHECKS
        if (msg.sender != minterContract) {
            revert GenArt721Error(ErrorCodes.OnlyMinterContract);
        }
        Project storage project = projects[_projectId];
        // load invocations into memory
        uint24 invocationsBefore = project.invocations;
        uint24 invocationsAfter;
        unchecked {
            // invocationsBefore guaranteed <= maxInvocations <= 1_000_000,
            // 1_000_000 << max uint24, so no possible overflow
            invocationsAfter = invocationsBefore + 1;
        }
        uint24 maxInvocations = project.maxInvocations;
        if (invocationsBefore >= maxInvocations) {
            revert GenArt721Error(ErrorCodes.MaxInvocationsReached);
        }
        if (
            !(project.active ||
                _by == _projectIdToFinancials[_projectId].artistAddress)
        ) {
            revert GenArt721Error(ErrorCodes.ProjectMustExistAndBeActive);
        }
        if (
            project.paused &&
            _by != _projectIdToFinancials[_projectId].artistAddress
        ) {
            revert GenArt721Error(ErrorCodes.PurchasesPaused);
        }

        // EFFECTS
        // increment project's invocations
        project.invocations = invocationsAfter;
        uint256 thisTokenId;
        unchecked {
            // invocationsBefore is uint24 << max uint256. In production use,
            // _projectId * ONE_MILLION must be << max uint256, otherwise
            // tokenIdToProjectId function become invalid.
            // Therefore, no risk of overflow
            thisTokenId = (_projectId * ONE_MILLION) + invocationsBefore;
        }

        // mark project as completed if hit max invocations
        if (invocationsAfter == maxInvocations) {
            _completeProject(_projectId);
        }

        // INTERACTIONS
        _mint(_to, thisTokenId);

        // token hash is updated by the randomizer contract on V3
        randomizerContract.assignTokenHash(thisTokenId);

        // Do not need to also log `projectId` in event, as the `projectId` for
        // a given token can be derived from the `tokenId` with:
        //   projectId = tokenId / 1_000_000
        emit Mint(_to, thisTokenId);

        return thisTokenId;
    }

    /**
     * @notice Sets the hash seed for a given token ID `_tokenId`.
     * May only be called by the current randomizer contract.
     * May only be called for tokens that have not already been assigned a
     * non-zero hash.
     * @param _tokenId Token ID to set the hash for.
     * @param _hashSeed Hash seed to set for the token ID. Only last 12 bytes
     * will be used.
     * @dev gas-optimized function name because called during mint sequence
     * @dev if a separate event is required when the token hash is set, e.g.
     * for indexing purposes, it must be emitted by the randomizer. This is to
     * minimize gas when minting.
     */
    function setTokenHash_8PT(uint256 _tokenId, bytes32 _hashSeed) external {
        _onlyValidTokenId(_tokenId);

        OwnerAndHashSeed storage ownerAndHashSeed = _ownersAndHashSeeds[
            _tokenId
        ];
        if (msg.sender != address(randomizerContract)) {
            revert GenArt721Error(ErrorCodes.OnlyRandomizer);
        }
        if (ownerAndHashSeed.hashSeed != bytes12(0)) {
            revert GenArt721Error(ErrorCodes.TokenHashAlreadySet);
        }
        if (_hashSeed == bytes12(0)) {
            revert GenArt721Error(ErrorCodes.NoZeroHashSeed);
        }
        ownerAndHashSeed.hashSeed = bytes12(_hashSeed);
    }

    /**
     * @notice Allows owner (AdminACL) to revoke ownership of the contract.
     * Note that the contract is intended to continue to function after the
     * owner renounces ownership, but no new projects will be able to be added.
     * Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the
     * owner/AdminACL contract. The same is true for any dependent contracts
     * that also integrate with the owner/AdminACL contract (e.g. potentially
     * minter suite contracts, registry contracts, etc.).
     * After renouncing ownership, artists will be in control of updates to
     * their payment addresses and splits (see modifier
     * onlyAdminACLOrRenouncedArtist`).
     * While there is no currently intended reason to call this method based on
     * typical Engine partner business practices, this method exists to allow
     * artists to continue to maintain the limited set of contract
     * functionality that exists post-project-lock in an environment in which
     * there is no longer an admin maintaining this smart contract.
     * @dev This function is intended to be called directly by the AdminACL,
     * not by an address allowed by the AdminACL contract.
     */
    function renounceOwnership() public override onlyOwner {
        // broadcast that new projects are no longer allowed (if not already)
        _forbidNewProjects();
        // renounce ownership viw Ownable
        Ownable.renounceOwnership();
    }

    /**
     * @notice Updates reference to next core contract, associated with this contract.
     * @param _nextCoreContract Address of the next core contract
     */
    function updateNextCoreContract(address _nextCoreContract) external {
        _onlyAdminACL(this.updateNextCoreContract.selector);
        nextCoreContract = _nextCoreContract;
        emit PlatformUpdated(
            bytes32(uint256(PlatformUpdatedFields.FIELD_NEXT_CORE_CONTRACT))
        );
    }

    /**
     * @notice Updates reference to Art Blocks Dependency Registry contract.
     * @param _artblocksDependencyRegistryAddress Address of new Dependency
     * Registry.
     */
    function updateArtblocksDependencyRegistryAddress(
        address _artblocksDependencyRegistryAddress
    ) external {
        _onlyAdminACL(this.updateArtblocksDependencyRegistryAddress.selector);
        _onlyNonZeroAddress(_artblocksDependencyRegistryAddress);
        artblocksDependencyRegistryAddress = _artblocksDependencyRegistryAddress;
        emit PlatformUpdated(
            bytes32(
                uint256(
                    PlatformUpdatedFields
                        .FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS
                )
            )
        );
    }

    /**
     * @notice Updates reference to Art Blocks On Chain Generator contract.
     * @param _artblocksOnChainGeneratorAddress Address of new on chain generator.
     */
    function updateArtblocksOnChainGeneratorAddress(
        address _artblocksOnChainGeneratorAddress
    ) external {
        _onlyAdminACL(this.updateArtblocksOnChainGeneratorAddress.selector);
        _onlyNonZeroAddress(_artblocksOnChainGeneratorAddress);
        artblocksOnChainGeneratorAddress = _artblocksOnChainGeneratorAddress;
        emit PlatformUpdated(
            bytes32(
                uint256(
                    PlatformUpdatedFields
                        .FIELD_ARTBLOCKS_ON_CHAIN_GENERATOR_ADDRESS
                )
            )
        );
    }

    /**
     * @notice Updates sales addresses for the platform and render providers to
     * the input parameters.
     * note: This does not update splitter contracts for all projects on
     * this core contract. If updated splitter contracts are desired, they must be
     * updated after this update via the `syncProviderSecondaryForProjectToDefaults` function.
     * @param _renderProviderPrimarySalesAddress Address of new primary sales
     * payment address.
     * @param _defaultRenderProviderSecondarySalesAddress Default address of new secondary sales
     * payment address.
     * @param _platformProviderPrimarySalesAddress Address of new primary sales
     * payment address.
     * @param _defaultPlatformProviderSecondarySalesAddress Default address of new secondary sales
     * payment address.
     */
    function updateProviderSalesAddresses(
        address payable _renderProviderPrimarySalesAddress,
        address payable _defaultRenderProviderSecondarySalesAddress,
        address payable _platformProviderPrimarySalesAddress,
        address payable _defaultPlatformProviderSecondarySalesAddress
    ) external {
        _onlyAdminACL(this.updateProviderSalesAddresses.selector);
        _onlyNonZeroAddress(_renderProviderPrimarySalesAddress);
        _onlyNonZeroAddress(_defaultRenderProviderSecondarySalesAddress);
        // @dev checks on platform provider addresses performed in _updateProviderSalesAddresses
        _updateProviderSalesAddresses(
            _renderProviderPrimarySalesAddress,
            _defaultRenderProviderSecondarySalesAddress,
            _platformProviderPrimarySalesAddress,
            _defaultPlatformProviderSecondarySalesAddress
        );
    }

    /**
     * @notice Updates the render and platform provider primary sales revenue percentage to
     * the provided inputs.
     * If contract is configured to have a null platform provider, the platform provider
     * primary sales percentage must be set to zero.
     * @param renderProviderPrimarySalesPercentage_ New primary sales revenue % for the render provider
     * @param platformProviderPrimarySalesPercentage_ New primary sales revenue % for the platform provider
     * percentage.
     */
    function updateProviderPrimarySalesPercentages(
        uint256 renderProviderPrimarySalesPercentage_,
        uint256 platformProviderPrimarySalesPercentage_
    ) external {
        _onlyAdminACL(this.updateProviderPrimarySalesPercentages.selector);
        // require no platform provider payment if null platform provider
        if (
            nullPlatformProvider && platformProviderPrimarySalesPercentage_ != 0
        ) {
            revert GenArt721Error(ErrorCodes.OnlyNullPlatformProvider);
        }

        // Validate that the sum of the proposed %s, does not exceed 100%.
        if (
            (renderProviderPrimarySalesPercentage_ +
                platformProviderPrimarySalesPercentage_) > ONE_HUNDRED
        ) {
            revert GenArt721Error(ErrorCodes.OverMaxSumOfPercentages);
        }
        // Casting to `uint8` here is safe due check above, which does not allow
        // overflow as of solidity version ^0.8.0.
        _renderProviderPrimarySalesPercentage = uint8(
            renderProviderPrimarySalesPercentage_
        );
        _platformProviderPrimarySalesPercentage = uint8(
            platformProviderPrimarySalesPercentage_
        );
        emit PlatformUpdated(
            bytes32(
                uint256(
                    PlatformUpdatedFields
                        .FIELD_PROVIDER_PRIMARY_SALES_PERCENTAGES
                )
            )
        );
    }

    /**
     * @notice Updates default render and platform provider secondary sales royalty
     * Basis Points to the provided inputs.
     * If contract is configured to have a null platform provider, the platform provider
     * secondary sales BPS must be set to zero.
     * note: This does not update splitter contracts for all projects on
     * this core contract. If updated splitter contracts are desired, they must be
     * updated after this update via the `syncProviderSecondaryForProjectToDefaults` function.
     * @param _defaultRenderProviderSecondarySalesBPS New default secondary sales royalty Basis
     * points.
     * @param _defaultPlatformProviderSecondarySalesBPS New default secondary sales royalty Basis
     * points.
     * @dev Due to secondary royalties being ultimately enforced via social
     * consensus, no hard upper limit is imposed on the BPS value, other than
     * <= 100% royalty, which would not make mathematical sense. Realistically,
     * changing this value is expected to either never occur, or be a rare
     * occurrence.
     */
    function updateProviderDefaultSecondarySalesBPS(
        uint256 _defaultRenderProviderSecondarySalesBPS,
        uint256 _defaultPlatformProviderSecondarySalesBPS
    ) external {
        _onlyAdminACL(this.updateProviderDefaultSecondarySalesBPS.selector);
        // require no platform provider payment if null platform provider
        if (
            nullPlatformProvider &&
            _defaultPlatformProviderSecondarySalesBPS != 0
        ) {
            revert GenArt721Error(ErrorCodes.OnlyNullPlatformProvider);
        }
        // Validate that the sum of the proposed provider BPS, does not exceed 10_000 BPS.
        if (
            _defaultRenderProviderSecondarySalesBPS +
                _defaultPlatformProviderSecondarySalesBPS >
            MAX_PROVIDER_SECONDARY_SALES_BPS
        ) {
            revert GenArt721Error(ErrorCodes.OverMaxSumOfBPS);
        }
        defaultRenderProviderSecondarySalesBPS = _defaultRenderProviderSecondarySalesBPS;
        defaultPlatformProviderSecondarySalesBPS = _defaultPlatformProviderSecondarySalesBPS;
        emit PlatformUpdated(
            bytes32(
                uint256(
                    PlatformUpdatedFields.FIELD_PROVIDER_SECONDARY_SALES_BPS
                )
            )
        );
    }

    /**
     * @notice Updates minter to `_address`.
     * @param _address Address of new minter.
     */
    function updateMinterContract(address _address) external {
        _onlyAdminACL(this.updateMinterContract.selector);
        _onlyNonZeroAddress(_address);
        minterContract = _address;
        emit MinterUpdated(_address);
    }

    /**
     * @notice Updates randomizer to `_randomizerAddress`.
     * @param _randomizerAddress Address of new randomizer.
     */
    function updateRandomizerAddress(address _randomizerAddress) external {
        _onlyAdminACL(this.updateRandomizerAddress.selector);
        _onlyNonZeroAddress(_randomizerAddress);
        _updateRandomizerAddress(_randomizerAddress);
    }

    /**
     * @notice Updates split provider address to `_splitProviderAddress`.
     * Reverts if `_splitProviderAddress` is zero address.
     * @param _splitProviderAddress New split provider address.
     */
    function updateSplitProvider(address _splitProviderAddress) external {
        _onlyAdminACL(this.updateSplitProvider.selector);
        _updateSplitProvider(_splitProviderAddress);
    }

    /**
     * @notice Toggles project `_projectId` as active/inactive.
     * @param _projectId Project ID to be toggled.
     */
    function toggleProjectIsActive(uint256 _projectId) external {
        if (allowArtistProjectActivation) {
            _onlyArtistOrAdminACL(
                _projectId,
                this.toggleProjectIsActive.selector
            );
        } else {
            _onlyAdminACL(this.toggleProjectIsActive.selector);
        }
        _onlyValidProjectId(_projectId);
        projects[_projectId].active = !projects[_projectId].active;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_ACTIVE))
        );
    }

    /**
     * @notice Artist proposes updated set of artist address, additional payee
     * addresses, and percentage splits for project `_projectId`. Addresses and
     * percentages do not have to all be changed, but they must all be defined
     * as a complete set.
     * Note that if the artist is only proposing a change to the payee percentage
     * splits, without modifying the payee addresses, the proposal will be
     * automatically approved and the new splits will become active immediately.
     * Automatic approval will also be granted if the artist is only removing
     * additional payee addresses, without adding any new ones.
     * Also note that if `autoApproveArtistSplitProposals` is true, proposals
     * will always be auto-approved, regardless of what is being changed.
     * Also note that if the artist is proposing sending funds to the zero
     * address, this function will revert and the proposal will not be created.
     * @param _projectId Project ID.
     * @param _artistAddress Artist address that controls the project, and may
     * receive payments.
     * @param _additionalPayeePrimarySales Address that may receive a
     * percentage split of the artist's primary sales revenue.
     * @param _additionalPayeePrimarySalesPercentage Percent of artist's
     * portion of primary sale revenue that will be split to address
     * `_additionalPayeePrimarySales`.
     * @param _additionalPayeeSecondarySales Address that may receive a percentage
     * split of the secondary sales royalties.
     * @param _additionalPayeeSecondarySalesPercentage Percent of artist's portion
     * of secondary sale royalties that will be split to address
     * `_additionalPayeeSecondarySales`.
     * @dev `_artistAddress` must be a valid address (non-zero-address), but it
     * is intentionally allowable for `_additionalPayee{Primary,Secondaary}Sales`
     * and their associated percentages to be zero'd out by the controlling artist.
     */
    function proposeArtistPaymentAddressesAndSplits(
        uint256 _projectId,
        address payable _artistAddress,
        address payable _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address payable _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    ) external {
        _onlyValidProjectId(_projectId);
        _onlyArtist(_projectId);
        _onlyNonZeroAddress(_artistAddress);
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            _projectId
        ];
        // checks
        if (
            _additionalPayeePrimarySalesPercentage > ONE_HUNDRED ||
            _additionalPayeeSecondarySalesPercentage > ONE_HUNDRED
        ) {
            revert GenArt721Error(ErrorCodes.MaxOf100Percent);
        }
        if (
            _additionalPayeePrimarySalesPercentage > 0 &&
            _additionalPayeePrimarySales == address(0)
        ) {
            revert GenArt721Error(ErrorCodes.PrimaryPayeeIsZeroAddress);
        }
        if (
            _additionalPayeeSecondarySalesPercentage > 0 &&
            _additionalPayeeSecondarySales == address(0)
        ) {
            revert GenArt721Error(ErrorCodes.SecondaryPayeeIsZeroAddress);
        }
        // effects
        // emit event for off-chain indexing
        // note: always emit a proposal event, even in the pathway of
        // automatic approval, to simplify indexing expectations
        emit ProposedArtistAddressesAndSplits(
            _projectId,
            _artistAddress,
            _additionalPayeePrimarySales,
            _additionalPayeePrimarySalesPercentage,
            _additionalPayeeSecondarySales,
            _additionalPayeeSecondarySalesPercentage
        );
        // automatically accept if no proposed addresses modifications, or if
        // the proposal only removes payee addresses, or if contract is set to
        // always auto-approve.
        // store proposal hash on-chain, only if not automatic accept
        bool automaticAccept = autoApproveArtistSplitProposals;
        if (!automaticAccept) {
            // block scope to avoid stack too deep error
            bool artistUnchanged = _artistAddress ==
                projectFinance.artistAddress;
            bool additionalPrimaryUnchangedOrRemoved = (_additionalPayeePrimarySales ==
                    projectFinance.additionalPayeePrimarySales) ||
                    (_additionalPayeePrimarySales == address(0));
            bool additionalSecondaryUnchangedOrRemoved = (_additionalPayeeSecondarySales ==
                    projectFinance.additionalPayeeSecondarySales) ||
                    (_additionalPayeeSecondarySales == address(0));
            automaticAccept =
                artistUnchanged &&
                additionalPrimaryUnchangedOrRemoved &&
                additionalSecondaryUnchangedOrRemoved;
        }
        if (automaticAccept) {
            // clear any previously proposed values
            proposedArtistAddressesAndSplitsHash[_projectId] = bytes32(0);

            // update storage
            // artist address can change during automatic accept if
            // autoApproveArtistSplitProposals is true
            projectFinance.artistAddress = _artistAddress;
            projectFinance
                .additionalPayeePrimarySales = _additionalPayeePrimarySales;
            // safe to cast as uint8 as max is 100%, max uint8 is 255
            projectFinance.additionalPayeePrimarySalesPercentage = uint8(
                _additionalPayeePrimarySalesPercentage
            );
            projectFinance
                .additionalPayeeSecondarySales = _additionalPayeeSecondarySales;
            // safe to cast as uint8 as max is 100%, max uint8 is 255
            projectFinance.additionalPayeeSecondarySalesPercentage = uint8(
                _additionalPayeeSecondarySalesPercentage
            );

            // assign project's splitter
            // @dev only call after all previous storage updates
            _assignSplitter(_projectId);

            // emit event for off-chain indexing
            emit AcceptedArtistAddressesAndSplits(_projectId);
        } else {
            proposedArtistAddressesAndSplitsHash[_projectId] = keccak256(
                abi.encode(
                    _artistAddress,
                    _additionalPayeePrimarySales,
                    _additionalPayeePrimarySalesPercentage,
                    _additionalPayeeSecondarySales,
                    _additionalPayeeSecondarySalesPercentage
                )
            );
        }
    }

    /**
     * @notice Admin accepts a proposed set of updated artist address,
     * additional payee addresses, and percentage splits for project
     * `_projectId`. Addresses and percentages do not have to all be changed,
     * but they must all be defined as a complete set.
     * @param _projectId Project ID.
     * @param _artistAddress Artist address that controls the project, and may
     * receive payments.
     * @param _additionalPayeePrimarySales Address that may receive a
     * percentage split of the artist's primary sales revenue.
     * @param _additionalPayeePrimarySalesPercentage Percent of artist's
     * portion of primary sale revenue that will be split to address
     * `_additionalPayeePrimarySales`.
     * @param _additionalPayeeSecondarySales Address that may receive a percentage
     * split of the secondary sales royalties.
     * @param _additionalPayeeSecondarySalesPercentage Percent of artist's portion
     * of secondary sale royalties that will be split to address
     * `_additionalPayeeSecondarySales`.
     * @dev this must be called by the Admin ACL contract, and must only accept
     * the most recent proposed values for a given project (validated on-chain
     * by comparing the hash of the proposed and accepted values).
     * @dev `_artistAddress` must be a valid address (non-zero-address), but it
     * is intentionally allowable for `_additionalPayee{Primary,Secondaary}Sales`
     * and their associated percentages to be zero'd out by the controlling artist.
     */
    function adminAcceptArtistAddressesAndSplits(
        uint256 _projectId,
        address payable _artistAddress,
        address payable _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address payable _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    ) external {
        _onlyValidProjectId(_projectId);
        _onlyAdminACLOrRenouncedArtist(
            _projectId,
            this.adminAcceptArtistAddressesAndSplits.selector
        );
        _onlyNonZeroAddress(_artistAddress);
        // checks
        if (
            proposedArtistAddressesAndSplitsHash[_projectId] !=
            keccak256(
                abi.encode(
                    _artistAddress,
                    _additionalPayeePrimarySales,
                    _additionalPayeePrimarySalesPercentage,
                    _additionalPayeeSecondarySales,
                    _additionalPayeeSecondarySalesPercentage
                )
            )
        ) {
            revert GenArt721Error(ErrorCodes.MustMatchArtistProposal);
        }
        // effects
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            _projectId
        ];
        projectFinance.artistAddress = _artistAddress;
        projectFinance
            .additionalPayeePrimarySales = _additionalPayeePrimarySales;
        projectFinance.additionalPayeePrimarySalesPercentage = uint8(
            _additionalPayeePrimarySalesPercentage
        );
        projectFinance
            .additionalPayeeSecondarySales = _additionalPayeeSecondarySales;
        projectFinance.additionalPayeeSecondarySalesPercentage = uint8(
            _additionalPayeeSecondarySalesPercentage
        );
        // clear proposed values
        proposedArtistAddressesAndSplitsHash[_projectId] = bytes32(0);

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter(_projectId);

        // emit event for off-chain indexing
        emit AcceptedArtistAddressesAndSplits(_projectId);
    }

    /**
     * @notice Updates artist of project `_projectId` to `_artistAddress`.
     * This is to only be used in the event that the artist address is
     * compromised or sanctioned.
     * @param _projectId Project ID.
     * @param _artistAddress New artist address.
     */
    function updateProjectArtistAddress(
        uint256 _projectId,
        address payable _artistAddress
    ) external {
        _onlyValidProjectId(_projectId);
        _onlyAdminACLOrRenouncedArtist(
            _projectId,
            this.updateProjectArtistAddress.selector
        );
        _onlyNonZeroAddress(_artistAddress);

        _projectIdToFinancials[_projectId].artistAddress = _artistAddress;

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter(_projectId);

        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_ARTIST_ADDRESS))
        );
    }

    /**
     * @notice Toggles paused state of project `_projectId`.
     * @param _projectId Project ID to be toggled.
     */
    function toggleProjectIsPaused(uint256 _projectId) external {
        _onlyArtist(_projectId);
        projects[_projectId].paused = !projects[_projectId].paused;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_PAUSED))
        );
    }

    /**
     * @notice Adds new project `_projectName` by `_artistAddress`.
     * @param _projectName Project name.
     * @param _artistAddress Artist's address.
     * @dev token price now stored on minter
     */
    function addProject(
        string memory _projectName,
        address payable _artistAddress
    ) external {
        _onlyAdminACL(this.addProject.selector);
        _onlyNonEmptyString(_projectName);
        _onlyNonZeroAddress(_artistAddress);
        if (newProjectsForbidden) {
            revert GenArt721Error(ErrorCodes.NewProjectsForbidden);
        }
        uint256 projectId = _nextProjectId;
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            projectId
        ];
        projectFinance.artistAddress = _artistAddress;
        projects[projectId].name = _projectName;
        projects[projectId].paused = true;
        projects[projectId].maxInvocations = ONE_MILLION_UINT24;
        projects[projectId].projectBaseURI = defaultBaseURI;
        // assign default artist royalty to artist
        projectFinance
            .secondaryMarketRoyaltyPercentage = _DEFAULT_ARTIST_SECONDARY_ROYALTY_PERCENTAGE;
        // copy default platform and render provider royalties to ProjectFinance
        projectFinance
            .platformProviderSecondarySalesAddress = defaultPlatformProviderSecondarySalesAddress;
        projectFinance.platformProviderSecondarySalesBPS = uint16(
            defaultPlatformProviderSecondarySalesBPS
        );
        projectFinance
            .renderProviderSecondarySalesAddress = defaultRenderProviderSecondarySalesAddress;
        projectFinance.renderProviderSecondarySalesBPS = uint16(
            defaultRenderProviderSecondarySalesBPS
        );

        _nextProjectId = uint248(projectId) + 1;

        // @dev emit initial project created event before splitter event
        emit ProjectUpdated(
            projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_CREATED))
        );

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter(projectId);
    }

    /**
     * @notice Forever forbids new projects from being added to this contract.
     */
    function forbidNewProjects() external {
        _onlyAdminACL(this.forbidNewProjects.selector);
        if (newProjectsForbidden) {
            revert GenArt721Error(ErrorCodes.NewProjectsAlreadyForbidden);
        }
        _forbidNewProjects();
    }

    /**
     * @notice Updates name of project `_projectId` to be `_projectName`.
     * @param _projectId Project ID.
     * @param _projectName New project name.
     */
    function updateProjectName(
        uint256 _projectId,
        string memory _projectName
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(_projectId, this.updateProjectName.selector);
        _onlyNonEmptyString(_projectName);
        projects[_projectId].name = _projectName;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_NAME))
        );
    }

    /**
     * @notice Updates artist name for project `_projectId` to be
     * `_projectArtistName`.
     * @dev allows admin to update after project is locked, due to our
     * experiences of artist name changes being requested post-lock.
     * @param _projectId Project ID.
     * @param _projectArtistName New artist name.
     */
    function updateProjectArtistName(
        uint256 _projectId,
        string memory _projectArtistName
    ) external {
        // if unlocked, only artist may update, if locked, only admin may update
        if (_projectUnlocked(_projectId)) {
            if (
                msg.sender != _projectIdToFinancials[_projectId].artistAddress
            ) {
                revert GenArt721Error(ErrorCodes.OnlyArtistOrAdminIfLocked);
            }
        } else {
            if (
                !adminACLAllowed(
                    msg.sender,
                    address(this),
                    this.updateProjectArtistName.selector
                )
            ) {
                revert GenArt721Error(ErrorCodes.OnlyArtistOrAdminIfLocked);
            }
        }
        _onlyNonEmptyString(_projectArtistName);
        projects[_projectId].artist = _projectArtistName;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_ARTIST_NAME))
        );
    }

    /**
     * @notice Updates artist secondary market royalties for project
     * `_projectId` to be `_secondaryMarketRoyalty` percent.
     * This deploys a new splitter contract if needed.
     * This DOES NOT include the secondary market royalty percentages collected
     * by the issuing platform; it is only the total percentage of royalties
     * that will be split to artist and additionalSecondaryPayee.
     * @param _projectId Project ID.
     * @param _secondaryMarketRoyalty Percent of secondary sales revenue that will
     * be split to artist and additionalSecondaryPayee. This must be less than
     * or equal to ARTIST_MAX_SECONDARY_ROYALTY_PERCENTAGE percent.
     */
    function updateProjectSecondaryMarketRoyaltyPercentage(
        uint256 _projectId,
        uint256 _secondaryMarketRoyalty
    ) external {
        _onlyArtist(_projectId);
        if (_secondaryMarketRoyalty > ARTIST_MAX_SECONDARY_ROYALTY_PERCENTAGE) {
            revert GenArt721Error(ErrorCodes.OverMaxSecondaryRoyaltyPercentage);
        }
        _projectIdToFinancials[_projectId]
            .secondaryMarketRoyaltyPercentage = uint8(_secondaryMarketRoyalty);

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter(_projectId);

        emit ProjectUpdated(
            _projectId,
            bytes32(
                uint256(
                    ProjectUpdatedFields
                        .FIELD_PROJECT_SECONDARY_MARKET_ROYALTY_PERCENTAGE
                )
            )
        );
    }

    /**
     * @notice Updates platform and render provider secondary market royalty addresses
     * and BPS to the contract-level default values for project `_projectId`.
     * This updates the splitter parameters on the existing splitter for the project.
     * Reverts if called by a non-admin address.
     * @param _projectId Project ID.
     */
    function syncProviderSecondaryForProjectToDefaults(
        uint256 _projectId
    ) external {
        _onlyAdminACL(this.syncProviderSecondaryForProjectToDefaults.selector);
        _onlyValidProjectId(_projectId);
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            _projectId
        ];
        // update project finance for project in storage
        projectFinance
            .platformProviderSecondarySalesAddress = defaultPlatformProviderSecondarySalesAddress;
        projectFinance.platformProviderSecondarySalesBPS = uint16(
            defaultPlatformProviderSecondarySalesBPS
        );
        projectFinance
            .renderProviderSecondarySalesAddress = defaultRenderProviderSecondarySalesAddress;
        projectFinance.renderProviderSecondarySalesBPS = uint16(
            defaultRenderProviderSecondarySalesBPS
        );

        emit ProjectUpdated(
            _projectId,
            bytes32(
                uint256(
                    ProjectUpdatedFields
                        .FIELD_PROJECT_PROVIDER_SECONDARY_FINANCIALS
                )
            )
        );

        // assign project's splitter
        // @dev only call after all previous storage updates
        _assignSplitter(_projectId);
    }

    /**
     * @notice Updates description of project `_projectId`.
     * Only artist may call when unlocked, only admin may call when locked.
     * Note: The BytecodeStorage library is used to store the description to
     * reduce initial upload cost, however, even minor edits will require an
     * expensive, entirely new bytecode storage contract to be deployed instead
     * of relatively cheap updates to already-warm storage slots. This results
     * in an increased gas cost for minor edits to the description after the
     * initial upload, but an overall decrease in gas cost for projects with
     * less than ~3-5 edits (depending on the length of the description).
     * @param _projectId Project ID.
     * @param _projectDescription New project description.
     */
    function updateProjectDescription(
        uint256 _projectId,
        string memory _projectDescription
    ) external {
        // checks
        // if unlocked, only artist may update, if locked, only admin may update
        if (_projectUnlocked(_projectId)) {
            if (
                msg.sender != _projectIdToFinancials[_projectId].artistAddress
            ) {
                revert GenArt721Error(ErrorCodes.OnlyArtistOrAdminIfLocked);
            }
        } else {
            if (
                !adminACLAllowed(
                    msg.sender,
                    address(this),
                    this.updateProjectDescription.selector
                )
            ) {
                revert GenArt721Error(ErrorCodes.OnlyArtistOrAdminIfLocked);
            }
        }
        // effects
        // store description in contract bytecode, replacing reference address from
        // the old storage description with the newly created one
        projects[_projectId].descriptionAddress = _projectDescription
            .writeToBytecode();
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_DESCRIPTION))
        );
    }

    /**
     * @notice Updates website of project `_projectId` to be `_projectWebsite`.
     * @param _projectId Project ID.
     * @param _projectWebsite New project website.
     * @dev It is intentionally allowed for this to be set to the empty string.
     */
    function updateProjectWebsite(
        uint256 _projectId,
        string memory _projectWebsite
    ) external {
        _onlyArtist(_projectId);
        projects[_projectId].website = _projectWebsite;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_WEBSITE))
        );
    }

    /**
     * @notice Updates license for project `_projectId`.
     * @param _projectId Project ID.
     * @param _projectLicense New project license.
     */
    function updateProjectLicense(
        uint256 _projectId,
        string memory _projectLicense
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(_projectId, this.updateProjectLicense.selector);
        _onlyNonEmptyString(_projectLicense);
        projects[_projectId].license = _projectLicense;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_LICENSE))
        );
    }

    /**
     * @notice Updates maximum invocations for project `_projectId` to
     * `_maxInvocations`. Maximum invocations may only be decreased by the
     * artist, and must be greater than or equal to current invocations.
     * New projects are created with maximum invocations of 1 million by
     * default.
     * @param _projectId Project ID.
     * @param _maxInvocations New maximum invocations.
     */
    function updateProjectMaxInvocations(
        uint256 _projectId,
        uint24 _maxInvocations
    ) external {
        _onlyArtist(_projectId);
        // CHECKS
        Project storage project = projects[_projectId];
        uint256 _invocations = project.invocations;
        if (_maxInvocations >= project.maxInvocations) {
            revert GenArt721Error(ErrorCodes.OnlyMaxInvocationsDecrease);
        }
        if (_maxInvocations < _invocations) {
            revert GenArt721Error(ErrorCodes.OnlyGteInvocations);
        }
        // EFFECTS
        project.maxInvocations = _maxInvocations;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_MAX_INVOCATIONS))
        );

        // register completed timestamp if action completed the project
        if (_maxInvocations == _invocations) {
            _completeProject(_projectId);
        }
    }

    /**
     * @notice Adds a script to project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _script Script to be added. Required to be a non-empty string,
     * but no further validation is performed.
     */
    function addProjectScript(
        uint256 _projectId,
        string memory _script
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(_projectId, this.addProjectScript.selector);
        _onlyNonEmptyString(_script);
        Project storage project = projects[_projectId];
        // store script in contract bytecode
        project.scriptBytecodeAddresses[project.scriptCount] = _script
            .writeToBytecode();
        project.scriptCount = project.scriptCount + 1;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT))
        );
    }

    /**
     * @notice Adds a pre-compressed script to project `_projectId`. The script
     * should be compressed using `getCompressed`. This function stores the script
     * in a compressed format on-chain. For reads, the compressed script is
     * decompressed on-chain, ensuring the original text is reconstructed without
     * external dependencies.
     * @param _projectId Project to be updated.
     * @param _compressedScript Pre-compressed script to be added.
     * Required to be non-empty, but no further validation is performed.
     */
    function addProjectScriptCompressed(
        uint256 _projectId,
        bytes memory _compressedScript
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(
            _projectId,
            this.addProjectScriptCompressed.selector
        );
        _onlyNonEmptyBytes(_compressedScript);
        Project storage project = projects[_projectId];
        // store compressed script in contract bytecode
        project.scriptBytecodeAddresses[project.scriptCount] = _compressedScript
            .writeToBytecodeCompressed();
        project.scriptCount = project.scriptCount + 1;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT))
        );
    }

    /**
     * @notice Updates script for project `_projectId` at script ID `_scriptId`.
     * @param _projectId Project to be updated.
     * @param _scriptId Script ID to be updated.
     * @param _script The updated script value. Required to be a non-empty
     *                string, but no further validation is performed.
     */
    function updateProjectScript(
        uint256 _projectId,
        uint256 _scriptId,
        string memory _script
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(_projectId, this.updateProjectScript.selector);
        _onlyNonEmptyString(_script);
        Project storage project = projects[_projectId];
        if (_scriptId >= project.scriptCount) {
            revert GenArt721Error(ErrorCodes.ScriptIdOutOfRange);
        }
        // store script in contract bytecode, replacing reference address from
        // the old storage contract with the newly created one
        project.scriptBytecodeAddresses[_scriptId] = _script.writeToBytecode();
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT))
        );
    }

    /**
     * @notice Updates script for project `_projectId` at script ID `_scriptId`
     * with a pre-compressed script. The script should be compressed using
     * `getCompressed`. This function stores the script in a compressed format
     * on-chain. For reads, the compressed script is decompressed on-chain, ensuring
     * the original text is reconstructed without external dependencies.
     * @param _projectId Project to be updated.
     * @param _scriptId Script ID to be updated.
     * @param _compressedScript The updated pre-compressed script value.
     * Required to be non-empty, but no further validation is performed.
     */
    function updateProjectScriptCompressed(
        uint256 _projectId,
        uint256 _scriptId,
        bytes memory _compressedScript
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectScriptCompressed.selector
        );
        _onlyNonEmptyBytes(_compressedScript);
        Project storage project = projects[_projectId];
        if (_scriptId >= project.scriptCount) {
            revert GenArt721Error(ErrorCodes.ScriptIdOutOfRange);
        }
        // store script in contract bytecode, replacing reference address from
        // the old storage contract with the newly created one
        project.scriptBytecodeAddresses[_scriptId] = _compressedScript
            .writeToBytecodeCompressed();
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT))
        );
    }

    /**
     * @notice Removes last script from project `_projectId`.
     * @param _projectId Project to be updated.
     */
    function removeProjectLastScript(uint256 _projectId) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(
            _projectId,
            this.removeProjectLastScript.selector
        );
        Project storage project = projects[_projectId];
        if (project.scriptCount == 0) {
            revert GenArt721Error(ErrorCodes.NoScriptsToRemove);
        }
        // delete reference to old storage contract address
        delete project.scriptBytecodeAddresses[project.scriptCount - 1];
        unchecked {
            project.scriptCount = project.scriptCount - 1;
        }
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT))
        );
    }

    /**
     * @notice Updates script type for project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _scriptTypeAndVersion Script type and version e.g. "p5js@1.0.0",
     * as bytes32 encoded string.
     */
    function updateProjectScriptType(
        uint256 _projectId,
        bytes32 _scriptTypeAndVersion
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectScriptType.selector
        );
        Project storage project = projects[_projectId];
        // require exactly one @ symbol in _scriptTypeAndVersion
        if (
            !_scriptTypeAndVersion.containsExactCharacterQty(
                AT_CHARACTER_CODE,
                uint8(1)
            )
        ) {
            revert GenArt721Error(ErrorCodes.ScriptTypeAndVersionFormat);
        }
        project.scriptTypeAndVersion = _scriptTypeAndVersion;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_SCRIPT_TYPE))
        );
    }

    /**
     * @notice Updates project's aspect ratio.
     * @param _projectId Project to be updated.
     * @param _aspectRatio Aspect ratio to be set. Intended to be string in the
     * format of a decimal, e.g. "1" for square, "1.77777778" for 16:9, etc.,
     * allowing for a maximum of 10 digits and one (optional) decimal separator.
     */
    function updateProjectAspectRatio(
        uint256 _projectId,
        string memory _aspectRatio
    ) external {
        _onlyUnlocked(_projectId);
        _onlyArtistOrAdminACL(
            _projectId,
            this.updateProjectAspectRatio.selector
        );
        _onlyNonEmptyString(_aspectRatio);
        // Perform more detailed input validation for aspect ratio.
        bytes memory aspectRatioBytes = bytes(_aspectRatio);
        uint256 bytesLength = aspectRatioBytes.length;
        if (bytesLength > 11) {
            revert GenArt721Error(ErrorCodes.AspectRatioTooLong);
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
            revert GenArt721Error(ErrorCodes.AspectRatioImproperFormat);
        }
        if (!hasSeenNumber) {
            revert GenArt721Error(ErrorCodes.AspectRatioNoNumbers);
        }

        projects[_projectId].aspectRatio = _aspectRatio;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_ASPECT_RATIO))
        );
    }

    /**
     * @notice Updates base URI for project `_projectId` to `_newBaseURI`.
     * This is the controlling base URI for all tokens in the project. The
     * contract-level defaultBaseURI is only used when initializing new
     * projects.
     * @param _projectId Project to be updated.
     * @param _newBaseURI New base URI.
     */
    function updateProjectBaseURI(
        uint256 _projectId,
        string memory _newBaseURI
    ) external {
        _onlyArtist(_projectId);
        _onlyNonEmptyString(_newBaseURI);
        projects[_projectId].projectBaseURI = _newBaseURI;
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_BASE_URI))
        );
    }

    /**
     * @notice Updates default base URI to `_defaultBaseURI`. The
     * contract-level defaultBaseURI is only used when initializing new
     * projects. Token URIs are determined by their project's `projectBaseURI`.
     * @param _defaultBaseURI New default base URI.
     */
    function updateDefaultBaseURI(string memory _defaultBaseURI) external {
        _onlyAdminACL(this.updateDefaultBaseURI.selector);
        _onlyNonEmptyString(_defaultBaseURI);
        _updateDefaultBaseURI(_defaultBaseURI);
    }

    /**
     * @notice Next project ID to be created on this contract.
     * @return uint256 Next project ID.
     */
    function nextProjectId() external view returns (uint256) {
        return _nextProjectId;
    }

    /**
     * @notice Returns token hash for token ID `_tokenId`. Returns null if hash
     * has not been set.
     * @param _tokenId Token ID to be queried.
     * @return bytes32 Token hash.
     * @dev token hash is the keccak256 hash of the stored hash seed
     */
    function tokenIdToHash(uint256 _tokenId) external view returns (bytes32) {
        bytes12 _hashSeed = _ownersAndHashSeeds[_tokenId].hashSeed;
        if (_hashSeed == 0) {
            return 0;
        }
        return keccak256(abi.encode(_hashSeed));
    }

    /**
     * @notice Returns token hash **seed** for token ID `_tokenId`. Returns
     * null if hash seed has not been set. The hash seed id the bytes12 value
     * which is hashed to produce the token hash.
     * @param _tokenId Token ID to be queried.
     * @return bytes12 Token hash seed.
     * @dev token hash seed is keccak256 hashed to give the token hash
     */
    function tokenIdToHashSeed(
        uint256 _tokenId
    ) external view returns (bytes12) {
        return _ownersAndHashSeeds[_tokenId].hashSeed;
    }

    /**
     * @notice View function returning the render provider portion of
     * primary sales, in percent.
     * @return uint256 The render provider portion of primary sales,
     * in percent.
     */
    function renderProviderPrimarySalesPercentage()
        external
        view
        returns (uint256)
    {
        return _renderProviderPrimarySalesPercentage;
    }

    /**
     * @notice View function returning the platform provider portion of
     * primary sales, in percent.
     * @return uint256 The platform provider portion of primary sales,
     * in percent.
     */
    function platformProviderPrimarySalesPercentage()
        external
        view
        returns (uint256)
    {
        return _platformProviderPrimarySalesPercentage;
    }

    /**
     * @notice View function returning Artist's address for project
     * `_projectId`.
     * @param _projectId Project ID to be queried.
     * @return address Artist's address.
     */
    function projectIdToArtistAddress(
        uint256 _projectId
    ) external view returns (address payable) {
        return _projectIdToFinancials[_projectId].artistAddress;
    }

    /**
     * @notice View function returning Artist's secondary market royalty
     * percentage for project `_projectId`.
     * This does not include render/platform providers portions of secondary
     * market royalties.
     * @param _projectId Project ID to be queried.
     * @return uint256 Artist's secondary market royalty percentage.
     */
    function projectIdToSecondaryMarketRoyaltyPercentage(
        uint256 _projectId
    ) external view returns (uint256) {
        return
            _projectIdToFinancials[_projectId].secondaryMarketRoyaltyPercentage;
    }

    /**
     * @notice View function returning project financial details for project
     * `_projectId`.
     * @param _projectId Project ID to be queried.
     * @return ProjectFinance Project financial details.
     */
    function projectIdToFinancials(
        uint256 _projectId
    ) external view returns (ProjectFinance memory) {
        return _projectIdToFinancials[_projectId];
    }

    /**
     * @notice Returns project details for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return projectName Name of project
     * @return artist Artist of project
     * @return description Project description
     * @return website Project website
     * @return license Project license
     * @dev this function was named projectDetails prior to V3 core contract.
     */
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
        )
    {
        Project storage project = projects[_projectId];
        projectName = project.name;
        artist = project.artist;
        address projectDescriptionBytecodeAddress = project.descriptionAddress;
        if (projectDescriptionBytecodeAddress == address(0)) {
            description = "";
        } else {
            description = _readFromBytecode(projectDescriptionBytecodeAddress);
        }
        website = project.website;
        license = project.license;
    }

    /**
     * @notice Returns project state data for project `_projectId`.
     * @param _projectId Project to be queried
     * @return invocations Current number of invocations
     * @return maxInvocations Maximum allowed invocations
     * @return active Boolean representing if project is currently active
     * @return paused Boolean representing if project is paused
     * @return completedTimestamp zero if project not complete, otherwise
     * timestamp of project completion.
     * @return locked Boolean representing if project is locked
     * @dev price and currency info are located on minter contracts
     */
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
        )
    {
        Project storage project = projects[_projectId];
        invocations = project.invocations;
        maxInvocations = project.maxInvocations;
        active = project.active;
        paused = project.paused;
        completedTimestamp = project.completedTimestamp;
        locked = !_projectUnlocked(_projectId);
    }

    /**
     * @notice Returns script information for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return scriptTypeAndVersion Project's script type and version
     * (e.g. "p5js(atSymbol)1.0.0")
     * @return aspectRatio Aspect ratio of project (e.g. "1" for square,
     * "1.77777778" for 16:9, etc.)
     * @return scriptCount Count of scripts for project
     */
    function projectScriptDetails(
        uint256 _projectId
    )
        external
        view
        override(IGenArt721CoreContractV3_Base, IDependencyRegistryCompatibleV0)
        returns (
            string memory scriptTypeAndVersion,
            string memory aspectRatio,
            uint256 scriptCount
        )
    {
        Project storage project = projects[_projectId];
        scriptTypeAndVersion = project.scriptTypeAndVersion.toString();
        aspectRatio = project.aspectRatio;
        scriptCount = project.scriptCount;
    }

    /**
     * @notice Returns address with bytecode containing project script for
     * project `_projectId` at script index `_index`.
     */
    function projectScriptBytecodeAddressByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (address) {
        return projects[_projectId].scriptBytecodeAddresses[_index];
    }

    /**
     * @notice Returns the compressed form of a string in bytes using solady LibZip's flz compress algorithm. The bytes output from this function are intended to be used as input to `addProjectScriptCompressed` and `updateProjectScriptCompressed`.
     * @param _script Script to be compressed. Required to be a non-empty string, but no further validaton is performed.
     * @return bytes compressed bytes
     */
    function getCompressed(
        string memory _script
    ) external pure returns (bytes memory) {
        _onlyNonEmptyString(_script);
        return BytecodeStorageReader.getCompressed(_script);
    }

    /**
     * @notice Returns script for project `_projectId` at script index `_index`.
     * @param _projectId Project to be queried.
     * @param _index Index of script to be queried.
     */
    function projectScriptByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (string memory) {
        Project storage project = projects[_projectId];
        // If trying to access an out-of-index script, return the empty string.
        if (_index >= project.scriptCount) {
            return "";
        }
        return _readFromBytecode(project.scriptBytecodeAddresses[_index]);
    }

    /**
     * @notice Returns base URI for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return projectBaseURI Base URI for project
     */
    function projectURIInfo(
        uint256 _projectId
    ) external view returns (string memory projectBaseURI) {
        projectBaseURI = projects[_projectId].projectBaseURI;
    }

    /**
     * @notice Backwards-compatible (pre-V3) function returning if `_minter` is
     * minterContract.
     * @param _minter Address to be queried.
     * @return bool Boolean representing if `_minter` is minterContract.
     */
    function isMintWhitelisted(address _minter) external view returns (bool) {
        return (minterContract == _minter);
    }

    /**
     * @notice Gets qty of randomizers in history of all randomizers used by
     * this core contract. If a randomizer is switched away from then back to,
     * it will show up in the history twice.
     * @return randomizerHistoryCount Count of randomizers in history
     */
    function numHistoricalRandomizers() external view returns (uint256) {
        return _historicalRandomizerAddresses.length;
    }

    /**
     * @notice Gets address of randomizer at index `_index` in history of all
     * randomizers used by this core contract. Index is zero-based.
     * @param _index Historical index of randomizer to be queried.
     * @return randomizerAddress Address of randomizer at index `_index`.
     * @dev If a randomizer is switched away from and then switched back to, it
     * will show up in the history twice.
     */
    function getHistoricalRandomizerAt(
        uint256 _index
    ) external view returns (address) {
        if (_index >= _historicalRandomizerAddresses.length) {
            revert GenArt721Error(ErrorCodes.IndexOutOfBounds);
        }
        return _historicalRandomizerAddresses[_index];
    }

    /**
     * @notice Gets ERC-2981 royalty information for token with ID `_tokenId`
     * and sale price `_salePrice`.
     * @param _tokenId Token ID to be queried for royalty information
     * @param _salePrice the sale price of the NFT asset specified by _tokenId
     * @return receiver address that should be sent the royalty payment
     * @return royaltyAmount the royalty payment amount for `_salePrice
     * @dev reverts if invalid _tokenId
     */
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        _onlyValidTokenId(_tokenId);

        // populate receiver with project's royalty splitter
        // @dev royalty splitter created upon project creation, so will always exist
        // for valid token ID
        uint256 projectId = tokenIdToProjectId(_tokenId);
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            projectId
        ];
        receiver = projectFinance.royaltySplitter;

        // populate royaltyAmount with calculated royalty amount
        // @dev important to cast to uint256 before multiplying to avoid overflow
        uint256 totalRoyaltyBPS = (100 *
            uint256(projectFinance.secondaryMarketRoyaltyPercentage)) +
            projectFinance.platformProviderSecondarySalesBPS +
            projectFinance.renderProviderSecondarySalesBPS;
        // @dev totalRoyaltyBPS guaranteed to be <= 10,000,
        if (totalRoyaltyBPS > 10_000) {
            revert GenArt721Error(ErrorCodes.OverMaxSumOfBPS);
        }
        // @dev overflow automatically checked in solidity 0.8
        // @dev totalRoyaltyBPS guaranteed to be <= 10_000,
        // so overflow only possible with unreasonably high _salePrice values near uint256 max
        royaltyAmount = (_salePrice * totalRoyaltyBPS) / 10_000;
    }

    /**
     * @notice View function that returns appropriate revenue splits between
     * different render provider, platform provider, Artist, and Artist's
     * additional primary sales payee given a sale price of `_price` on
     * project `_projectId`.
     * This always returns four revenue amounts and four addresses, but if a
     * revenue is zero for either Artist or additional payee, the corresponding
     * address returned will also be null (for gas optimization).
     * Does not account for refund if user overpays for a token (minter should
     * handle a refund of the difference, if appropriate).
     * Some minters may have alternative methods of splitting payments, in
     * which case they should implement their own payment splitting logic.
     * @param _projectId Project ID to be queried.
     * @param _price Sale price of token.
     * @return renderProviderRevenue_ amount of revenue to be sent to the
     * render provider
     * @return renderProviderAddress_ address to send render provider revenue to
     * @return platformProviderRevenue_ amount of revenue to be sent to the
     * platform provider
     * @return platformProviderAddress_ address to send platform provider revenue to
     * @return artistRevenue_ amount of revenue to be sent to Artist
     * @return artistAddress_ address to send Artist revenue to. Will be null
     * if no revenue is due to artist (gas optimization).
     * @return additionalPayeePrimaryRevenue_ amount of revenue to be sent to
     * additional payee for primary sales
     * @return additionalPayeePrimaryAddress_ address to send Artist's
     * additional payee for primary sales revenue to. Will be null if no
     * revenue is due to additional payee for primary sales (gas optimization).
     * @dev this always returns four addresses and four revenues, but if the
     * revenue is zero, the corresponding address will be address(0). It is up
     * to the contract performing the revenue split to handle this
     * appropriately.
     */
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
        )
    {
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            _projectId
        ];
        // calculate revenues – this is a three-way split between the
        // render provider, the platform provider, and the artist, and
        // is safe to perform this given that in the case of loss of
        // precision Solidity will round down.
        uint256 projectFunds = _price;
        renderProviderRevenue_ =
            (_price * uint256(_renderProviderPrimarySalesPercentage)) /
            ONE_HUNDRED;
        // renderProviderRevenue_ percentage is always <=100, so guaranteed to never underflow
        projectFunds -= renderProviderRevenue_;
        platformProviderRevenue_ =
            (_price * uint256(_platformProviderPrimarySalesPercentage)) /
            ONE_HUNDRED;
        // platformProviderRevenue_ percentage is always <=100, so guaranteed to never underflow
        projectFunds -= platformProviderRevenue_;
        additionalPayeePrimaryRevenue_ =
            (projectFunds *
                projectFinance.additionalPayeePrimarySalesPercentage) /
            ONE_HUNDRED;
        // projectIdToAdditionalPayeePrimarySalesPercentage is always
        // <=100, so guaranteed to never underflow
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
     * @notice Returns external asset dependency for project `_projectId` at index `_index`.
     * If the dependencyType is ONCHAIN, the `data` field will contain the extrated bytecode data and `cid`
     * will be an empty string. Conversly, for any other dependencyType, the `data` field will be an empty string
     * and the `bytecodeAddress` will point to the zero address.
     * If the dependencyType is ART_BLOCKS_DEPENDENCY_REGISTRY, the `cid` field will contain the string
     * representation of the dependencyNameAndVersion bytes32 value stored in the dependency registry (
     * at public address `artblocksDependencyRegistryAddress`)
     * @param _projectId Project to be queried.
     * @param _index Index of external asset dependency to be queried.
     * @return ExternalAssetDependencyWithData External asset dependency for project `_projectId` at index `_index`.
     */
    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (ExternalAssetDependencyWithData memory) {
        return
            V3FlexLib.projectExternalAssetDependencyByIndex({
                _projectId: _projectId,
                _index: _index
            });
    }

    /**
     * @notice Returns external asset dependency count for project `_projectId` at index `_index`.
     * @param _projectId Project to be queried.
     * @return uint256 Count of external asset dependencies for project `_projectId`.
     */
    function projectExternalAssetDependencyCount(
        uint256 _projectId
    ) external view returns (uint256) {
        return
            V3FlexLib.projectExternalAssetDependencyCount({
                _projectId: _projectId
            });
    }

    /**
     * @notice Returns the preferred IPFS gateway for the platform.
     * @return string Preferred IPFS gateway for the platform.
     */
    function preferredIPFSGateway() external view returns (string memory) {
        return V3FlexLib.preferredIPFSGateway();
    }

    /**
     * @notice Returns the preferred Arweave gateway for the platform.
     * @return string Preferred Arweave gateway for the platform.
     */
    function preferredArweaveGateway() external view returns (string memory) {
        return V3FlexLib.preferredArweaveGateway();
    }

    /**
     * @notice Backwards-compatible (pre-V3) getter returning contract admin
     * @return address Address of contract admin (same as owner)
     */
    function admin() external view returns (address) {
        return owner();
    }

    /**
     * @notice Gets the project ID for a given `_tokenId`.
     * @param _tokenId Token ID to be queried.
     * @return _projectId Project ID for given `_tokenId`.
     */
    function tokenIdToProjectId(
        uint256 _tokenId
    ) public pure returns (uint256 _projectId) {
        return _tokenId / ONE_MILLION;
    }

    /**
     * @notice Convenience function that returns whether `_sender` is allowed
     * to call function with selector `_selector` on contract `_contract`, as
     * determined by this contract's current Admin ACL contract. Expected use
     * cases include minter contracts checking if caller is allowed to call
     * admin-gated functions on minter contracts.
     * @param _sender Address of the sender calling function with selector
     * `_selector` on contract `_contract`.
     * @param _contract Address of the contract being called by `_sender`.
     * @param _selector Function selector of the function being called by
     * `_sender`.
     * @return bool Whether `_sender` is allowed to call function with selector
     * `_selector` on contract `_contract`.
     * @dev assumes the Admin ACL contract is the owner of this contract, which
     * is expected to always be true.
     * @dev adminACLContract is expected to either be null address (if owner
     * has renounced ownership), or conform to IAdminACLV0 interface. Check for
     * null address first to avoid revert when admin has renounced ownership.
     */
    function adminACLAllowed(
        address _sender,
        address _contract,
        bytes4 _selector
    ) public returns (bool) {
        return
            owner() != address(0) &&
            adminACLContract.allowed(_sender, _contract, _selector);
    }

    /**
     * @notice Returns contract owner. Set to deployer's address by default on
     * contract deployment.
     * @return address Address of contract owner.
     * @dev ref: https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable
     * @dev owner role was called `admin` prior to V3 core contract
     */
    function owner()
        public
        view
        override(Ownable, IGenArt721CoreContractV3_Base)
        returns (address)
    {
        return Ownable.owner();
    }

    /**
     * @notice Gets token URI for token ID `_tokenId`.
     * @param _tokenId Token ID to be queried.
     * @return string URI of token ID `_tokenId`.
     * @dev token URIs are the concatenation of the project base URI and the
     * token ID.
     */
    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        _onlyValidTokenId(_tokenId);
        string memory _projectBaseURI = projects[tokenIdToProjectId(_tokenId)]
            .projectBaseURI;
        return string.concat(_projectBaseURI, _tokenId.toString());
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721_PackedHashSeedV1, IERC165)
        returns (bool)
    {
        return
            interfaceId == _INTERFACE_ID_ERC2981 ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Forbids new projects from being created
     * @dev only performs operation and emits event if contract is not already
     * forbidding new projects.
     */
    function _forbidNewProjects() internal {
        if (!newProjectsForbidden) {
            newProjectsForbidden = true;
            emit PlatformUpdated(
                bytes32(
                    uint256(PlatformUpdatedFields.FIELD_NEW_PROJECTS_FORBIDDEN)
                )
            );
        }
    }

    /**
     * @notice Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     * @param newOwner New owner.
     * @dev owner role was called `admin` prior to V3 core contract.
     * @dev Overrides and wraps OpenZeppelin's _transferOwnership function to
     * also update adminACLContract for improved introspection.
     */
    function _transferOwnership(address newOwner) internal override {
        Ownable._transferOwnership(newOwner);
        adminACLContract = IAdminACLV0(newOwner);
    }

    /**
     * @notice Updates sales addresses for the platform and render providers to
     * the input parameters.
     * Reverts if invalid platform provider addresses are provided given the
     * contract's immutably configured nullPlatformProvider state.
     * Does not check render provider addresses in any way.
     * @param _renderProviderPrimarySalesAddress Address of new primary sales
     * payment address.
     * @param _defaultRenderProviderSecondarySalesAddress Address of new secondary sales
     * payment address.
     * @param _platformProviderPrimarySalesAddress Address of new primary sales
     * payment address.
     * @param _defaultPlatformProviderSecondarySalesAddress Address of new secondary sales
     * payment address.
     */
    function _updateProviderSalesAddresses(
        address _renderProviderPrimarySalesAddress,
        address _defaultRenderProviderSecondarySalesAddress,
        address _platformProviderPrimarySalesAddress,
        address _defaultPlatformProviderSecondarySalesAddress
    ) internal {
        if (nullPlatformProvider) {
            // require null platform provider address
            if (
                _platformProviderPrimarySalesAddress != address(0) ||
                _defaultPlatformProviderSecondarySalesAddress != address(0)
            ) {
                revert GenArt721Error(ErrorCodes.OnlyNullPlatformProvider);
            }
        } else {
            _onlyNonZeroAddress(_platformProviderPrimarySalesAddress);
            _onlyNonZeroAddress(_defaultPlatformProviderSecondarySalesAddress);
        }
        platformProviderPrimarySalesAddress = payable(
            _platformProviderPrimarySalesAddress
        );
        defaultPlatformProviderSecondarySalesAddress = payable(
            _defaultPlatformProviderSecondarySalesAddress
        );
        renderProviderPrimarySalesAddress = payable(
            _renderProviderPrimarySalesAddress
        );
        defaultRenderProviderSecondarySalesAddress = payable(
            _defaultRenderProviderSecondarySalesAddress
        );
        emit PlatformUpdated(
            bytes32(
                uint256(PlatformUpdatedFields.FIELD_PROVIDER_SALES_ADDRESSES)
            )
        );
    }

    /**
     * @notice Updates randomizer address to `_randomizerAddress`.
     * @param _randomizerAddress New randomizer address.
     * @dev Note that this method does not check that the input address is
     * not `address(0)`, as it is expected that callers of this method should
     * perform input validation where applicable.
     */
    function _updateRandomizerAddress(address _randomizerAddress) internal {
        randomizerContract = IRandomizer_V3CoreBase(_randomizerAddress);
        // populate historical randomizer array
        _historicalRandomizerAddresses.push(_randomizerAddress);
        emit PlatformUpdated(
            bytes32(uint256(PlatformUpdatedFields.FIELD_RANDOMIZER_ADDRESS))
        );
    }

    /**
     * @notice Updates split provider address to `_splitProviderAddress`.
     * Reverts if `_splitProviderAddress` is the zero address.
     * @param _splitProviderAddress New split provider address.
     * @dev Note that this method does not check that the input address is
     * not `address(0)`, as it is expected that callers of this method should
     * perform input validation where applicable.
     */
    function _updateSplitProvider(address _splitProviderAddress) internal {
        // require non-zero split provider address
        _onlyNonZeroAddress(_splitProviderAddress);
        splitProvider = ISplitProviderV0(_splitProviderAddress);
        emit PlatformUpdated(
            bytes32(uint256(PlatformUpdatedFields.FIELD_SPLIT_PROVIDER))
        );
    }

    /**
     * @notice internal function to update a splitter contract for a project,
     * based on the project's financials in this contract's storage.
     * @dev Warning: this function uses storage reads to get the project's
     * financials, so ensure storage has been updated before calling this
     * @dev This function includes a trusted interaction that is entrusted to
     * not reenter this contract.
     * @param projectId Project ID to be updated.
     */
    function _assignSplitter(uint256 projectId) internal {
        ProjectFinance storage projectFinance = _projectIdToFinancials[
            projectId
        ];
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

        emit ProjectRoyaltySplitterUpdated({
            projectId: projectId,
            royaltySplitter: royaltySplitter
        });
    }

    /**
     * @notice Updates default base URI to `_defaultBaseURI`.
     * When new projects are added, their `projectBaseURI` is automatically
     * initialized to `_defaultBaseURI`.
     * @param _defaultBaseURI New default base URI.
     * @dev Note that this method does not check that the input string is not
     * the empty string, as it is expected that callers of this method should
     * perform input validation where applicable.
     */
    function _updateDefaultBaseURI(string memory _defaultBaseURI) internal {
        defaultBaseURI = _defaultBaseURI;
        emit PlatformUpdated(
            bytes32(uint256(PlatformUpdatedFields.FIELD_DEFAULT_BASE_URI))
        );
    }

    /**
     * @notice Internal function to complete a project.
     * @param _projectId Project ID to be completed.
     */
    function _completeProject(uint256 _projectId) internal {
        projects[_projectId].completedTimestamp = uint64(block.timestamp);
        emit ProjectUpdated(
            _projectId,
            bytes32(uint256(ProjectUpdatedFields.FIELD_PROJECT_COMPLETED))
        );
    }

    /**
     * @notice Internal function that returns whether a project is unlocked.
     * Projects automatically lock four weeks after they are completed.
     * Projects are considered completed when they have been invoked the
     * maximum number of times.
     * @param _projectId Project ID to be queried.
     * @return bool true if project is unlocked, false otherwise.
     * @dev This also enforces that the `_projectId` passed in is valid.
     */
    function _projectUnlocked(uint256 _projectId) internal view returns (bool) {
        _onlyValidProjectId(_projectId);

        uint256 projectCompletedTimestamp = projects[_projectId]
            .completedTimestamp;
        bool projectOpen = projectCompletedTimestamp == 0;
        return
            projectOpen ||
            (block.timestamp - projectCompletedTimestamp <
                FOUR_WEEKS_IN_SECONDS);
    }

    /**
     * Helper for calling `BytecodeStorageReader` external library reader method,
     * added for bytecode size reduction purposes.
     */
    function _readFromBytecode(
        address _address
    ) internal view returns (string memory) {
        return BytecodeStorageReader.readFromBytecode(_address);
    }
}
