// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.9;

// Created By: Art Blocks Inc.

import "./interfaces/0.8.x/IRandomizerV2.sol";
import "./interfaces/0.8.x/IAdminACLV0.sol";
import "./interfaces/0.8.x/IGenArt721CoreContractV3.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/token/ERC721/ERC721.sol";

/**
 * @title Art Blocks ERC-721 core contract, V3.
 * @author Art Blocks Inc.
 */
contract GenArt721CoreV3 is ERC721, Ownable, IGenArt721CoreContractV3 {
    uint256 constant ONE_MILLION = 1_000_000;
    uint256 constant FOUR_WEEKS_IN_SECONDS = 2_419_200;

    // generic platform event fields
    bytes32 constant FIELD_ARTBLOCKS_ADDRESS = "artblocksAddress";
    bytes32 constant FIELD_ARTBLOCKS_ADDRESS_SECONDARY =
        "artblocksAddressSecondary";
    bytes32 constant FIELD_RANDOMIZER_ADDRESS = "randomizerAddress";
    bytes32 constant FIELD_ARTBLOCKS_CURATION_REGISTRY_ADDRESS =
        "curationRegistryAddress";
    bytes32 constant FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS =
        "dependencyRegistryAddress";
    bytes32 constant FIELD_ARTBLOCKS_PERCENTAGE = "artblocksPercentage";
    bytes32 constant FIELD_ARTBLOCKS_BPS_SECONDARY = "artblocksBPSSecondary";
    // generic project event fields
    bytes32 constant FIELD_PROJECT_COMPLETED = "completed";
    bytes32 constant FIELD_PROJECT_ACTIVE = "active";
    bytes32 constant FIELD_ARTIST_ADDRESS = "artistAddress";
    bytes32 constant FIELD_PROJECT_PAUSED = "paused";
    bytes32 constant FIELD_PROJECT_CREATED = "created";
    bytes32 constant FIELD_PROJECT_NAME = "name";
    bytes32 constant FIELD_ARTIST_NAME = "artistName";
    bytes32 constant FIELD_SECONDARY_MARKET_ROYALTY_PERCENTAGE =
        "royaltyPercentage";
    bytes32 constant FIELD_PROJECT_DESCRIPTION = "description";
    bytes32 constant FIELD_PROJECT_WEBSITE = "website";
    bytes32 constant FIELD_PROJECT_LICENSE = "license";
    bytes32 constant FIELD_MAX_INVOCATIONS = "maxInvocations";
    bytes32 constant FIELD_PROJECT_SCRIPT = "script";
    bytes32 constant FIELD_PROJECT_SCRIPT_TYPE = "scriptType";
    bytes32 constant FIELD_PROJECT_ASPECT_RATIO = "aspectRatio";
    bytes32 constant FIELD_PROJECT_IPFS_HASH = "ipfsHash";
    bytes32 constant FIELD_PROJECT_BASE_URI = "baseURI";

    // Art Blocks previous flagship ERC721 token addresses (for reference)
    /// Art Blocks Project ID range: [0-2]
    address public constant ART_BLOCKS_ERC721TOKEN_ADDRESS_V0 =
        0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a;
    /// Art Blocks Project ID range: [3-TODO: add V1 final project ID before deploying]
    address public constant ART_BLOCKS_ERC721TOKEN_ADDRESS_V1 =
        0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270;

    /// Curation registry managed by Art Blocks
    address public artblocksCurationRegistryAddress;
    /// Dependency registry managed by Art Blocks
    address public artblocksDependencyRegistryAddress;

    /// current randomizer contract
    IRandomizerV2 public randomizerContract;

    /// append-only array of all randomizer contract addresses ever used by
    /// this contract
    address[] private _historicalRandomizerAddresses;

    /// admin ACL contract
    IAdminACLV0 public adminACLContract;

    struct Project {
        string name;
        string artist;
        string description;
        string website;
        string license;
        string projectBaseURI;
        string scriptType;
        string scriptTypeVersion;
        string aspectRatio;
        uint256 invocations;
        uint256 maxInvocations;
        mapping(uint256 => string) scripts;
        uint256 scriptCount;
        string ipfsHash;
        bool active;
        bool paused;
        uint256 completedTimestamp;
    }

    mapping(uint256 => Project) projects;

    // All financial functions are stripped from struct for visibility
    mapping(uint256 => address payable) public projectIdToArtistAddress;
    mapping(uint256 => address payable)
        public projectIdToAdditionalPayeePrimarySales;
    mapping(uint256 => uint256)
        public projectIdToAdditionalPayeePrimarySalesPercentage;
    mapping(uint256 => address payable)
        public projectIdToAdditionalPayeeSecondarySales;
    mapping(uint256 => uint256)
        public projectIdToAdditionalPayeeSecondarySalesPercentage;
    mapping(uint256 => uint256)
        public projectIdToSecondaryMarketRoyaltyPercentage;

    /// hash of artist's proposed payment updates to be approved by admin
    mapping(uint256 => bytes32) public proposedArtistAddressesAndSplitsHash;

    /// Art Blocks payment address for all primary sales revenues
    address payable public artblocksAddress;
    /// Percentage of mint revenue allocated to Art Blocks
    uint256 public artblocksPercentage = 10;
    /// Art Blocks payment address for all secondary sales royalty reveneus
    address payable public artblocksAddressSecondary;
    /// Basis Points of secondary sales revenue allocated to Art Blocks
    uint256 public artblocksBPSSecondary = 250;

    mapping(uint256 => bytes32) public tokenIdToHash;

    /// single minter allowed for this core contract
    address public minterContract;

    /// next project ID to be created
    uint256 public nextProjectId = 0;

    /// version & type of this core contract
    string public constant coreVersion = "v3.0.0";
    string public constant coreType = "GenArt721CoreV3";

    event ProposedArtistAddressesAndSplits(
        uint256 indexed _projectId,
        address _artistAddress,
        address _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    );

    event AcceptedArtistAddressesAndSplits(uint256 indexed _projectId);

    modifier onlyValidTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token ID does not exist");
        _;
    }

    modifier onlyUnlocked(uint256 _projectId) {
        require(_projectUnlocked(_projectId), "Only if unlocked");
        _;
    }

    modifier onlyAdminACL(bytes4 _selector) {
        require(
            adminACLAllowed(msg.sender, address(this), _selector),
            "Only Admin ACL allowed"
        );
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            msg.sender == projectIdToArtistAddress[_projectId],
            "Only artist"
        );
        _;
    }

    modifier onlyArtistOrAdminACL(uint256 _projectId, bytes4 _selector) {
        require(
            msg.sender == projectIdToArtistAddress[_projectId] ||
                adminACLAllowed(msg.sender, address(this), _selector),
            "Only artist or Admin ACL allowed"
        );
        _;
    }

    /**
     * This modifier allows the artist of a project to call a function if the
     * owner of the contract has renounced ownership. This is to allow the
     * contract to continue to function if the owner decides to renounce
     * ownership.
     */
    modifier onlyAdminACLOrRenouncedArtist(
        uint256 _projectId,
        bytes4 _selector
    ) {
        require(
            adminACLAllowed(msg.sender, address(this), _selector) ||
                (owner() == address(0) &&
                    msg.sender == projectIdToArtistAddress[_projectId]),
            "Only Admin ACL allowed, or artist if owner has renounced"
        );
        _;
    }

    /**
     * @notice Initializes contract.
     * @param _tokenName Name of token.
     * @param _tokenSymbol Token symbol.
     * @param _randomizerContract Randomizer contract.
     * @param _adminACLContract Address of admin access control contract, to be
     * set as contract owner.
     */
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        address _randomizerContract,
        address _adminACLContract
    ) ERC721(_tokenName, _tokenSymbol) {
        _updateArtblocksAddress(msg.sender);
        _updateArtblocksAddressSecondary(msg.sender);
        _updateRandomizerAddress(_randomizerContract);
        // set AdminACL management contract as owner
        _transferOwnership(_adminACLContract);
    }

    /**
     * @notice Mints a token from project `_projectId` and sets the
     * token's owner to `_to`.
     * @param _to Address to be the minted token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _by Purchaser of minted token.
     * @dev sender must be the allowed minterContract
     * @dev name of function is optimized for gas usage
     */
    function mint_Ecf(
        address _to,
        uint256 _projectId,
        address _by
    ) external returns (uint256 _tokenId) {
        // CHECKS
        require(
            msg.sender == minterContract,
            "Must mint from the allowed minter contract."
        );

        // load invocations into memory
        uint256 invocationsBefore = projects[_projectId].invocations;
        uint256 invocationsAfter = invocationsBefore + 1;
        uint256 maxInvocations = projects[_projectId].maxInvocations;

        require(
            invocationsBefore < maxInvocations,
            "Must not exceed max invocations"
        );
        require(
            projects[_projectId].active ||
                _by == projectIdToArtistAddress[_projectId],
            "Project must exist and be active"
        );
        require(
            !projects[_projectId].paused ||
                _by == projectIdToArtistAddress[_projectId],
            "Purchases are paused."
        );

        // EFFECTS
        // increment project's invocations
        projects[_projectId].invocations = invocationsAfter;
        uint256 thisTokenId = (_projectId * ONE_MILLION) + invocationsBefore;

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
     * @notice Sets the hash for a given token ID `_tokenId`.
     * May only be called by the current randomizer contract.
     * May only be called for tokens that have not already been assigned a
     * non-zero hash.
     * @param _tokenId Token ID to set the hash for.
     * @param _hash Hash to set for the token ID.
     * @dev gas-optimized function name because called during mint sequence
     */
    function setTokenHash_8PT(uint256 _tokenId, bytes32 _hash)
        external
        onlyValidTokenId(_tokenId)
    {
        require(
            msg.sender == address(randomizerContract),
            "Only randomizer may set"
        );
        require(
            tokenIdToHash[_tokenId] == bytes32(0),
            "Token hash already set."
        );
        tokenIdToHash[_tokenId] = _hash;
    }

    /**
     * @notice Updates reference to Art Blocks Curation Registry contract.
     */
    function updateArtblocksCurationRegistryAddress(
        address _artblocksCurationRegistryAddress
    )
        external
        onlyAdminACL(this.updateArtblocksCurationRegistryAddress.selector)
    {
        artblocksCurationRegistryAddress = _artblocksCurationRegistryAddress;
        emit PlatformUpdated(FIELD_ARTBLOCKS_CURATION_REGISTRY_ADDRESS);
    }

    /**
     * @notice Updates reference to Art Blocks Dependency Registry contract.
     */
    function updateArtblocksDependencyRegistryAddress(
        address _artblocksDependencyRegistryAddress
    )
        external
        onlyAdminACL(this.updateArtblocksDependencyRegistryAddress.selector)
    {
        artblocksDependencyRegistryAddress = _artblocksDependencyRegistryAddress;
        emit PlatformUpdated(FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS);
    }

    /**
     * @notice Updates artblocksAddress to `_artblocksAddress`.
     */
    function updateArtblocksAddress(address payable _artblocksAddress)
        external
        onlyAdminACL(this.updateArtblocksAddress.selector)
    {
        _updateArtblocksAddress(_artblocksAddress);
    }

    /**
     * @notice Updates artblocksAddressSecondary to
     * `_artblocksAddressSecondary`.
     */
    function updateArtblocksAddressSecondary(
        address payable _artblocksAddressSecondary
    ) external onlyAdminACL(this.updateArtblocksAddressSecondary.selector) {
        _updateArtblocksAddressSecondary(_artblocksAddressSecondary);
    }

    /**
     * @notice Updates Art Blocks mint revenue percentage to
     * `_artblocksPercentage`.
     */
    function updateArtblocksPercentage(uint256 _artblocksPercentage)
        external
        onlyAdminACL(this.updateArtblocksPercentage.selector)
    {
        require(_artblocksPercentage <= 25, "Max of 25%");
        artblocksPercentage = _artblocksPercentage;
        emit PlatformUpdated(FIELD_ARTBLOCKS_PERCENTAGE);
    }

    /**
     * @notice Updates Art Blocks secondary sales revenue Basis Points to
     * `_artblocksBPSSecondary`.
     */
    function updateArtblocksBPSSecondary(uint256 _artblocksBPSSecondary)
        external
        onlyAdminACL(this.updateArtblocksBPSSecondary.selector)
    {
        require(_artblocksBPSSecondary <= 250, "Max of 2.5%");
        artblocksBPSSecondary = _artblocksBPSSecondary;
        emit PlatformUpdated(FIELD_ARTBLOCKS_BPS_SECONDARY);
    }

    /**
     * @notice updates minter to `_address`.
     */
    function updateMinterContract(address _address)
        external
        onlyAdminACL(this.updateMinterContract.selector)
    {
        minterContract = _address;
        emit MinterUpdated(_address);
    }

    /**
     * @notice Updates randomizer to `_randomizerAddress`.
     */
    function updateRandomizerAddress(address _randomizerAddress)
        external
        onlyAdminACL(this.updateRandomizerAddress.selector)
    {
        _updateRandomizerAddress(_randomizerAddress);
    }

    /**
     * @notice Toggles project `_projectId` as active/inactive.
     */
    function toggleProjectIsActive(uint256 _projectId)
        external
        onlyAdminACL(this.toggleProjectIsActive.selector)
    {
        projects[_projectId].active = !projects[_projectId].active;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_ACTIVE);
    }

    /**
     * @notice Artist proposes updated set of artist address, additional payee
     * addresses, and percentage splits for project `_projectId`. Addresses and
     * percentages do not have to all be changed, but they must all be defined
     * as a complete set.
     * @param _projectId Project ID.
     * @param _artistAddress Artist address that controls the project, and may
     * receive payments.
     * @param _additionalPayeePrimarySales Address that may receive a
     * percentage split of the artit's primary sales revenue.
     * @param _additionalPayeePrimarySalesPercentage Percent of artist's
     * portion of primary sale revenue that will be split to address
     * `_additionalPayeePrimarySales`.
     * @param _additionalPayeeSecondarySales Address that may receive a percentage
     * split of the secondary sales royalties.
     * @param _additionalPayeeSecondarySalesPercentage Percent of artist's portion
     * of secondary sale royalties that will be split to address
     * `_additionalPayeeSecondarySales`.
     */
    function proposeArtistPaymentAddressesAndSplits(
        uint256 _projectId,
        address payable _artistAddress,
        address payable _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address payable _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    ) external onlyArtist(_projectId) {
        // checks
        require(
            _additionalPayeePrimarySalesPercentage <= 100 &&
                _additionalPayeeSecondarySalesPercentage <= 100,
            "Max of 100%"
        );
        // effects
        proposedArtistAddressesAndSplitsHash[_projectId] = keccak256(
            abi.encodePacked(
                _artistAddress,
                _additionalPayeePrimarySales,
                _additionalPayeePrimarySalesPercentage,
                _additionalPayeeSecondarySales,
                _additionalPayeeSecondarySalesPercentage
            )
        );
        // emit event for off-chain indexing
        emit ProposedArtistAddressesAndSplits(
            _projectId,
            _artistAddress,
            _additionalPayeePrimarySales,
            _additionalPayeePrimarySalesPercentage,
            _additionalPayeeSecondarySales,
            _additionalPayeeSecondarySalesPercentage
        );
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
     * percentage split of the artit's primary sales revenue.
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
     */
    function adminAcceptArtistAddressesAndSplits(
        uint256 _projectId,
        address payable _artistAddress,
        address payable _additionalPayeePrimarySales,
        uint256 _additionalPayeePrimarySalesPercentage,
        address payable _additionalPayeeSecondarySales,
        uint256 _additionalPayeeSecondarySalesPercentage
    )
        external
        onlyAdminACLOrRenouncedArtist(
            _projectId,
            this.adminAcceptArtistAddressesAndSplits.selector
        )
    {
        // checks
        require(
            proposedArtistAddressesAndSplitsHash[_projectId] ==
                keccak256(
                    abi.encodePacked(
                        _artistAddress,
                        _additionalPayeePrimarySales,
                        _additionalPayeePrimarySalesPercentage,
                        _additionalPayeeSecondarySales,
                        _additionalPayeeSecondarySalesPercentage
                    )
                ),
            "Must match artist proposal"
        );
        // effects
        projectIdToArtistAddress[_projectId] = _artistAddress;
        projectIdToAdditionalPayeePrimarySales[
            _projectId
        ] = _additionalPayeePrimarySales;
        projectIdToAdditionalPayeePrimarySalesPercentage[
            _projectId
        ] = _additionalPayeePrimarySalesPercentage;
        projectIdToAdditionalPayeeSecondarySales[
            _projectId
        ] = _additionalPayeeSecondarySales;
        projectIdToAdditionalPayeeSecondarySalesPercentage[
            _projectId
        ] = _additionalPayeeSecondarySalesPercentage;
        // emit event for off-chain indexing
        emit AcceptedArtistAddressesAndSplits(_projectId);
    }

    /**
     * @notice Updates artist of project `_projectId` to `_artistAddress`.
     * This is to only be used in the event that the artist address is
     * compromised or sanctioned.
     */
    function updateProjectArtistAddress(
        uint256 _projectId,
        address payable _artistAddress
    ) external onlyAdminACL(this.updateProjectArtistAddress.selector) {
        projectIdToArtistAddress[_projectId] = _artistAddress;
        emit ProjectUpdated(_projectId, FIELD_ARTIST_ADDRESS);
    }

    /**
     * @notice Toggles paused state of project `_projectId`.
     */
    function toggleProjectIsPaused(uint256 _projectId)
        external
        onlyArtist(_projectId)
    {
        projects[_projectId].paused = !projects[_projectId].paused;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_PAUSED);
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
    ) external onlyAdminACL(this.addProject.selector) {
        uint256 projectId = nextProjectId;
        projectIdToArtistAddress[projectId] = _artistAddress;
        projects[projectId].name = _projectName;
        projects[projectId].paused = true;
        projects[projectId].maxInvocations = ONE_MILLION;

        nextProjectId = nextProjectId + 1;
        emit ProjectUpdated(projectId, FIELD_PROJECT_CREATED);
    }

    /**
     * @notice Updates name of project `_projectId` to be `_projectName`.
     */
    function updateProjectName(uint256 _projectId, string memory _projectName)
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectName.selector)
    {
        projects[_projectId].name = _projectName;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_NAME);
    }

    /**
     * @notice Updates artist name for project `_projectId` to be
     * `_projectArtistName`.
     */
    function updateProjectArtistName(
        uint256 _projectId,
        string memory _projectArtistName
    )
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectArtistName.selector)
    {
        projects[_projectId].artist = _projectArtistName;
        emit ProjectUpdated(_projectId, FIELD_ARTIST_NAME);
    }

    /**
     * @notice Updates artist secondary market royalties for project
     * `_projectId` to be `_secondMarketRoyalty` percent.
     * This DOES NOT include the secondary market royalty percentages collected
     * by Art Blocks; this is only the total percentage of royalties that will
     * be split to artist and additionalSecondaryPayee.
     * @param _projectId Project ID.
     * @param _secondMarketRoyalty Percent of secondary sales revenue that will
     * be split to artist and additionalSecondaryPayee. This must be less than
     * or equal to 95 percent.
     */
    function updateProjectSecondaryMarketRoyaltyPercentage(
        uint256 _projectId,
        uint256 _secondMarketRoyalty
    ) external onlyArtist(_projectId) {
        require(_secondMarketRoyalty <= 95, "Max of 95%");
        projectIdToSecondaryMarketRoyaltyPercentage[
            _projectId
        ] = _secondMarketRoyalty;
        emit ProjectUpdated(
            _projectId,
            FIELD_SECONDARY_MARKET_ROYALTY_PERCENTAGE
        );
    }

    /**
     * @notice Updates description of project `_projectId`.
     * Only artist may call when unlocked, only admin may call when locked.
     */
    function updateProjectDescription(
        uint256 _projectId,
        string memory _projectDescription
    ) external {
        // checks
        require(
            _projectUnlocked(_projectId)
                ? msg.sender == projectIdToArtistAddress[_projectId]
                : adminACLAllowed(
                    msg.sender,
                    address(this),
                    this.updateProjectDescription.selector
                ),
            "Only artist when unlocked, owner when locked"
        );
        // effects
        projects[_projectId].description = _projectDescription;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_DESCRIPTION);
    }

    /**
     * @notice Updates website of project `_projectId` to be `_projectWebsite`.
     */
    function updateProjectWebsite(
        uint256 _projectId,
        string memory _projectWebsite
    ) external onlyArtist(_projectId) {
        projects[_projectId].website = _projectWebsite;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_WEBSITE);
    }

    /**
     * @notice Updates license for project `_projectId`.
     */
    function updateProjectLicense(
        uint256 _projectId,
        string memory _projectLicense
    )
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectLicense.selector)
    {
        projects[_projectId].license = _projectLicense;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_LICENSE);
    }

    /**
     * @notice Updates maximum invocations for project `_projectId` to
     * `_maxInvocations`. Maximum invocations may only be decreased by the
     * artist, and must be greater than or equal to current invocations.
     * New projects are created with maximum invocations of 1 million by
     * default.
     */
    function updateProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) external onlyArtist(_projectId) {
        // checks
        require(
            (_maxInvocations < projects[_projectId].maxInvocations),
            "maxInvocations may only be decreased"
        );
        require(
            _maxInvocations >= projects[_projectId].invocations,
            "Only max invocations gte current invocations"
        );
        // effects
        projects[_projectId].maxInvocations = _maxInvocations;
        emit ProjectUpdated(_projectId, FIELD_MAX_INVOCATIONS);

        // register completed timestamp if action completed the project
        if (_maxInvocations == projects[_projectId].invocations) {
            _completeProject(_projectId);
        }
    }

    /**
     * @notice Adds a script to project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _script Script to be added.
     */
    function addProjectScript(uint256 _projectId, string memory _script)
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.addProjectScript.selector)
    {
        projects[_projectId].scripts[
            projects[_projectId].scriptCount
        ] = _script;
        projects[_projectId].scriptCount = projects[_projectId].scriptCount + 1;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_SCRIPT);
    }

    /**
     * @notice Updates script for project `_projectId` at script ID `_scriptId`.
     * @param _projectId Project to be updated.
     * @param _scriptId Script ID to be updated.
     * @param _script Script to be added.
     */
    function updateProjectScript(
        uint256 _projectId,
        uint256 _scriptId,
        string memory _script
    )
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectScript.selector)
    {
        require(
            _scriptId < projects[_projectId].scriptCount,
            "scriptId out of range"
        );
        projects[_projectId].scripts[_scriptId] = _script;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_SCRIPT);
    }

    /**
     * @notice Removes last script from project `_projectId`.
     */
    function removeProjectLastScript(uint256 _projectId)
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.removeProjectLastScript.selector)
    {
        require(
            projects[_projectId].scriptCount > 0,
            "there are no scripts to remove"
        );
        delete projects[_projectId].scripts[
            projects[_projectId].scriptCount - 1
        ];
        projects[_projectId].scriptCount = projects[_projectId].scriptCount - 1;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_SCRIPT);
    }

    /**
     * @notice Updates script type for project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _scriptType Libary to be injected by renderer. e.g. "p5js"
     * @param _scriptTypeVersion Version of library to be injected. e.g. "1.0.0"
     */
    function updateProjectScriptType(
        uint256 _projectId,
        string memory _scriptType,
        string memory _scriptTypeVersion
    )
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectScriptType.selector)
    {
        projects[_projectId].scriptType = _scriptType;
        projects[_projectId].scriptTypeVersion = _scriptTypeVersion;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_SCRIPT_TYPE);
    }

    /**
     * @notice Updates project's aspect ratio.
     * @param _projectId Project to be updated.
     * @param _aspectRatio Aspect ratio to be set. Intended to be string in the
     * format of a decimal, e.g. "1" for square, "1.77777778" for 16:9, etc.
     */
    function updateProjectAspectRatio(
        uint256 _projectId,
        string memory _aspectRatio
    )
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectAspectRatio.selector)
    {
        projects[_projectId].aspectRatio = _aspectRatio;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_ASPECT_RATIO);
    }

    /**
     * @notice Updates ipfs hash for project `_projectId`.
     */
    function updateProjectIpfsHash(uint256 _projectId, string memory _ipfsHash)
        external
        onlyUnlocked(_projectId)
        onlyArtistOrAdminACL(_projectId, this.updateProjectIpfsHash.selector)
    {
        projects[_projectId].ipfsHash = _ipfsHash;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_IPFS_HASH);
    }

    /**
     * @notice Updates base URI for project `_projectId` to `_newBaseURI`.
     */
    function updateProjectBaseURI(uint256 _projectId, string memory _newBaseURI)
        external
        onlyArtist(_projectId)
    {
        projects[_projectId].projectBaseURI = _newBaseURI;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_BASE_URI);
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
    function projectDetails(uint256 _projectId)
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
        projectName = projects[_projectId].name;
        artist = projects[_projectId].artist;
        description = projects[_projectId].description;
        website = projects[_projectId].website;
        license = projects[_projectId].license;
    }

    /**
     * @notice Returns project state data for project `_projectId`.
     * @param _projectId Project to be queried
     * @return invocations Current number of invocations
     * @return maxInvocations Maximum allowed invocations
     * @return active Boolean representing if project is currently active
     * @return paused Boolean representing if project is paused
     * @return locked Boolean representing if project is locked
     * @dev price and currency info are located on minter contracts
     */
    function projectStateData(uint256 _projectId)
        external
        view
        returns (
            uint256 invocations,
            uint256 maxInvocations,
            bool active,
            bool paused,
            bool locked
        )
    {
        invocations = projects[_projectId].invocations;
        maxInvocations = projects[_projectId].maxInvocations;
        active = projects[_projectId].active;
        paused = projects[_projectId].paused;
        locked = !_projectUnlocked(_projectId);
    }

    /**
     * @notice Returns artist payment information for project `_projectId`.
     * @param _projectId Project to be queried
     * @return artistAddress Project Artist's address
     * @return additionalPayeePrimarySales Additional payee address for primary
     * sales
     * @return additionalPayeePrimarySalesPercentage Percentage of artist revenue
     * to be sent to the additional payee address for primary sales
     * @return additionalPayeeSecondarySales Additional payee address for secondary
     * sales royalties
     * @return additionalPayeeSecondarySalesPercentage Percentage of artist revenue
     * to be sent to the additional payee address for secondary sales royalties

     */
    function projectArtistPaymentInfo(uint256 _projectId)
        external
        view
        returns (
            address artistAddress,
            address additionalPayeePrimarySales,
            uint256 additionalPayeePrimarySalesPercentage,
            address additionalPayeeSecondarySales,
            uint256 additionalPayeeSecondarySalesPercentage
        )
    {
        artistAddress = projectIdToArtistAddress[_projectId];
        additionalPayeePrimarySales = projectIdToAdditionalPayeePrimarySales[
            _projectId
        ];
        additionalPayeePrimarySalesPercentage = projectIdToAdditionalPayeePrimarySalesPercentage[
            _projectId
        ];
        additionalPayeeSecondarySales = projectIdToAdditionalPayeeSecondarySales[
            _projectId
        ];
        additionalPayeeSecondarySalesPercentage = projectIdToAdditionalPayeeSecondarySalesPercentage[
            _projectId
        ];
    }

    /**
     * @notice Returns script information for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return scriptType Project's script type/library (e.g. "p5js")
     * @return scriptTypeVersion Project's library version (e.g. "1.0.0")
     * @return aspectRatio Aspect ratio of project (e.g. "1" for square,
     * "1.77777778" for 16:9, etc.)
     * @return ipfsHash IPFS hash for project
     * @return scriptCount Count of scripts for project
     */
    function projectScriptDetails(uint256 _projectId)
        external
        view
        returns (
            string memory scriptType,
            string memory scriptTypeVersion,
            string memory aspectRatio,
            string memory ipfsHash,
            uint256 scriptCount
        )
    {
        scriptType = projects[_projectId].scriptType;
        scriptTypeVersion = projects[_projectId].scriptTypeVersion;
        aspectRatio = projects[_projectId].aspectRatio;
        scriptCount = projects[_projectId].scriptCount;
        ipfsHash = projects[_projectId].ipfsHash;
    }

    /**
     * @notice Returns script for project `_projectId` at script index `_index`.
     */
    function projectScriptByIndex(uint256 _projectId, uint256 _index)
        external
        view
        returns (string memory)
    {
        return projects[_projectId].scripts[_index];
    }

    /**
     * @notice Returns base URI for project `_projectId`.
     */
    function projectURIInfo(uint256 _projectId)
        external
        view
        returns (string memory projectBaseURI)
    {
        projectBaseURI = projects[_projectId].projectBaseURI;
    }

    /**
     * @notice Backwards-compatible (pre-V3) function returning if `_minter` is
     * minterContract.
     */
    function isMintWhitelisted(address _minter) external view returns (bool) {
        return (minterContract == _minter);
    }

    /**
     * @notice Gets qty of randomizers in history of all randomizers used by
     * this core contract. If a randomizer is switched away from then back to,
     * it will show up in the history twice.
     */
    function numHistoricalRandomizers() external view returns (uint256) {
        return _historicalRandomizerAddresses.length;
    }

    /**
     * @notice Gets address of randomizer at index `_index` in history of all
     * randomizers used by this core contract. Index is zero-based.
     * @param _index Historical index of randomizer to be queried.
     * @dev If a randomizer is switched away from and then switched back to, it
     * will show up in the history twice.
     */
    function getHistoricalRandomizerAt(uint256 _index)
        external
        view
        returns (address)
    {
        require(
            _index < _historicalRandomizerAddresses.length,
            "Index out of bounds"
        );
        return _historicalRandomizerAddresses[_index];
    }

    /**
     * @notice Gets royalty data for token ID `_tokenId`.
     * @param _tokenId Token ID to be queried.
     * @return artistAddress Artist's payment address
     * @return additionalPayee Additional payee's payment address
     * @return additionalPayeePercentage Percentage of artist revenue
     * to be sent to the additional payee's address
     * @return royaltyFeeByID Total royalty percentage to be sent to
     * combination of artist and additional payee
     */
    function getRoyaltyData(uint256 _tokenId)
        external
        view
        returns (
            address artistAddress,
            address additionalPayee,
            uint256 additionalPayeePercentage,
            uint256 royaltyFeeByID
        )
    {
        uint256 projectId = _tokenId / ONE_MILLION;
        artistAddress = projectIdToArtistAddress[projectId];
        additionalPayee = projectIdToAdditionalPayeeSecondarySales[projectId];
        additionalPayeePercentage = projectIdToAdditionalPayeeSecondarySalesPercentage[
            projectId
        ];
        royaltyFeeByID = projectIdToSecondaryMarketRoyaltyPercentage[projectId];
    }

    /**
     * @notice View function that returns appropriate revenue splits between
     * different Art Blocks, Artist, and Artist's additional primary sales
     * payee given a sale price of `_price` on project `_projectId`.
     * This always returns three revenue amounts and three addresses, but if a
     * revenue is zero for either Artist or additional payee, the corresponding
     * address returned will also be null (for gas optimization).
     * Does not account for refund if user overpays for a token (minter should
     * handle a refund of the difference, if appropriate).
     * Some minters may have alternative methods of splitting payments, in
     * which case they should implement their own payment splitting logic.
     * @param _projectId Project ID to be queried.
     * @param _price Sale price of token.
     * @return artblocksRevenue_ amount of revenue to be sent to Art Blocks
     * @return artblocksAddress_ address to send Art Blocks revenue to
     * @return artistRevenue_ amount of revenue to be sent to Artist
     * @return artistAddress_ address to send Artist revenue to. Will be null
     * if no revenue is due to artist (gas optimization).
     * @return additionalPayeePrimaryRevenue_ amount of revenue to be sent to
     * additional payee for primary sales
     * @return additionalPayeePrimaryAddress_ address to send Artist's
     * additional payee for primary sales revenue to. Will be null if no
     * revenue is due to additional payee for primary sales (gas optimization).
     * @dev this always returns three addresses and three revenues, but if the
     * revenue is zero, the corresponding address will be address(0). It is up
     * to the contract performing the revenue split to handle this
     * appropriately.
     */
    function getPrimaryRevenueSplits(uint256 _projectId, uint256 _price)
        external
        view
        returns (
            uint256 artblocksRevenue_,
            address payable artblocksAddress_,
            uint256 artistRevenue_,
            address payable artistAddress_,
            uint256 additionalPayeePrimaryRevenue_,
            address payable additionalPayeePrimaryAddress_
        )
    {
        // calculate revenues
        artblocksRevenue_ = (_price * artblocksPercentage) / 100;
        uint256 projectFunds = _price - artblocksRevenue_;
        additionalPayeePrimaryRevenue_ =
            (projectFunds *
                projectIdToAdditionalPayeePrimarySalesPercentage[_projectId]) /
            100;
        artistRevenue_ = projectFunds - additionalPayeePrimaryRevenue_;
        // set addresses from storage
        artblocksAddress_ = artblocksAddress;
        artistAddress_ = artistRevenue_ > 0
            ? projectIdToArtistAddress[_projectId]
            : payable(address(0));
        additionalPayeePrimaryAddress_ = additionalPayeePrimaryRevenue_ > 0
            ? projectIdToAdditionalPayeePrimarySales[_projectId]
            : payable(address(0));
    }

    /**
     * @notice Backwards-compatible (pre-V3) getter returning contract admin
     * @return admin_ Address of contract owner
     */
    function admin() external view returns (address) {
        return owner();
    }

    /**
     * @notice Gets the project ID for a given `_tokenId`.
     */
    function tokenIdToProjectId(uint256 _tokenId)
        external
        pure
        returns (uint256 _projectId)
    {
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
     * @dev ref: https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable
     * @dev owner role was called `admin` prior to V3 core contract
     */
    function owner()
        public
        view
        override(Ownable, IGenArt721CoreContractV3)
        returns (address)
    {
        return Ownable.owner();
    }

    /**
     * @notice Gets token URI for token ID `_tokenId`.
     */
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        onlyValidTokenId(_tokenId)
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    projects[_tokenId / ONE_MILLION].projectBaseURI,
                    Strings.toString(_tokenId)
                )
            );
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     * @dev Overrides and wraps OpenZeppelin's _transferOwnership function to
     * also update adminACLContract for improved introspection.
     */
    function _transferOwnership(address newOwner) internal override {
        Ownable._transferOwnership(newOwner);
        adminACLContract = IAdminACLV0(newOwner);
    }

    /**
     * @notice Updates Art Blocks payment address to `_artblocksAddress`.
     */
    function _updateArtblocksAddress(address _artblocksAddress) internal {
        artblocksAddress = payable(_artblocksAddress);
        emit PlatformUpdated(FIELD_ARTBLOCKS_ADDRESS);
    }

    /**
     * @notice Updates Art Blocks secondary sales payment address to
     * `_artblocksAddressSecondary`.
     */
    function _updateArtblocksAddressSecondary(
        address _artblocksAddressSecondary
    ) internal {
        artblocksAddressSecondary = payable(_artblocksAddressSecondary);
        emit PlatformUpdated(FIELD_ARTBLOCKS_ADDRESS_SECONDARY);
    }

    /**
     * @notice Updates randomizer address to `_randomizerAddress`.
     */
    function _updateRandomizerAddress(address _randomizerAddress) internal {
        randomizerContract = IRandomizerV2(_randomizerAddress);
        // populate historical randomizer array
        _historicalRandomizerAddresses.push(_randomizerAddress);
        emit PlatformUpdated(FIELD_RANDOMIZER_ADDRESS);
    }

    /**
     * @notice Internal function to complete a project.
     */
    function _completeProject(uint256 _projectId) internal {
        projects[_projectId].completedTimestamp = block.timestamp;
        emit ProjectUpdated(_projectId, FIELD_PROJECT_COMPLETED);
    }

    /**
     * @notice Internal function that returns whether a project is unlocked.
     * Projects automatically lock four weeks after they are completed.
     * Projects are considered completed when they have been invoked the
     * maximum number of times.
     * @param _projectId Project ID to check.
     */
    function _projectUnlocked(uint256 _projectId) internal view returns (bool) {
        uint256 projectCompletedTimestamp = projects[_projectId]
            .completedTimestamp;
        bool projectOpen = projectCompletedTimestamp == 0;
        return
            projectOpen ||
            (block.timestamp - projectCompletedTimestamp <
                FOUR_WEEKS_IN_SECONDS);
    }
}
