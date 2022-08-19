// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.9;

// Created By: Art Blocks Inc.

import "./interfaces/0.8.x/IRandomizerV2.sol";
import "./interfaces/0.8.x/IAdminACLV0.sol";
import "./interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "./interfaces/0.8.x/IManifold.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.7/contracts/access/Ownable.sol";
import "@openzeppelin-4.7/contracts/token/ERC721/ERC721.sol";

/**
 * @title Art Blocks ERC-721 core contract, V3.
 * @author Art Blocks Inc.
 */
contract GenArt721CoreV3 is ERC721, Ownable, IGenArt721CoreContractV3 {
    uint256 constant ONE_MILLION = 1_000_000;
    uint24 constant ONE_MILLION_UINT24 = 1_000_000;
    uint256 constant FOUR_WEEKS_IN_SECONDS = 2_419_200;

    // generic platform event fields
    bytes32 constant FIELD_NEXT_PROJECT_ID = "nextProjectId";
    bytes32 constant FIELD_NEW_PROJECTS_FORBIDDEN = "newProjectsForbidden";
    bytes32 constant FIELD_ARTBLOCKS_PRIMARY_SALES_ADDRESS =
        "artblocksPrimarySalesAddress";
    bytes32 constant FIELD_ARTBLOCKS_SECONDARY_SALES_ADDRESS =
        "artblocksSecondarySalesAddress";
    bytes32 constant FIELD_RANDOMIZER_ADDRESS = "randomizerAddress";
    bytes32 constant FIELD_ARTBLOCKS_CURATION_REGISTRY_ADDRESS =
        "curationRegistryAddress";
    bytes32 constant FIELD_ARTBLOCKS_DEPENDENCY_REGISTRY_ADDRESS =
        "dependencyRegistryAddress";
    bytes32 constant FIELD_ARTBLOCKS_PRIMARY_SALES_PERCENTAGE =
        "artblocksPrimaryPercentage";
    bytes32 constant FIELD_ARTBLOCKS_SECONDARY_SALES_BPS =
        "artblocksSecondaryBPS";
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
        uint24 invocations;
        uint24 maxInvocations;
        uint24 scriptCount;
        // max uint64 ~= 1.8e19 sec ~= 570 billion years
        uint64 completedTimestamp;
        bool active;
        bool paused;
        string name;
        string artist;
        string description;
        string website;
        string license;
        string projectBaseURI;
        string scriptType;
        string scriptTypeVersion;
        string aspectRatio;
        string ipfsHash;
        mapping(uint256 => string) scripts;
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
    address payable public artblocksPrimarySalesAddress;
    /// Percentage of primary sales revenue allocated to Art Blocks
    uint256 public artblocksPrimarySalesPercentage = 10;
    /// Art Blocks payment address for all secondary sales royalty revenues
    address payable public artblocksSecondarySalesAddress;
    /// Basis Points of secondary sales royalties allocated to Art Blocks
    uint256 public artblocksSecondarySalesBPS = 250;

    mapping(uint256 => bytes32) public tokenIdToHash;

    /// single minter allowed for this core contract
    address public minterContract;

    /// next project ID to be created
    uint248 private _nextProjectId;

    /// bool indicating if adding new projects is forbidden;
    /// default behavior is to allow new projects
    bool public newProjectsForbidden;

    /// version & type of this core contract
    string public constant coreVersion = "v3.0.0";
    string public constant coreType = "GenArt721CoreV3";

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
     * @param _startingProjectId The initial next project ID.
     * @dev _startingProjectId should be set to a value much, much less than
     * max(uint248) to avoid overflow when adding to it.
     */
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        address _randomizerContract,
        address _adminACLContract,
        uint256 _startingProjectId
    ) ERC721(_tokenName, _tokenSymbol) {
        _updateArtblocksPrimarySalesAddress(msg.sender);
        _updateArtblocksSecondarySalesAddress(msg.sender);
        _updateRandomizerAddress(_randomizerContract);
        // set AdminACL management contract as owner
        _transferOwnership(_adminACLContract);
        // initialize next project ID
        _nextProjectId = uint248(_startingProjectId);
        emit PlatformUpdated(FIELD_NEXT_PROJECT_ID);
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
        require(msg.sender == minterContract, "Must mint from minter contract");

        // load invocations into memory
        uint24 invocationsBefore = projects[_projectId].invocations;
        uint24 invocationsAfter;
        unchecked {
            // invocationsBefore guaranteed <= maxInvocations <= 1_000_000,
            // 1_000_000 << max uint24, so no possible overflow
            invocationsAfter = invocationsBefore + 1;
        }
        uint24 maxInvocations = projects[_projectId].maxInvocations;

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
     * @notice Updates minter to `_address`.
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
        require(!newProjectsForbidden, "New projects forbidden");
        uint256 projectId = _nextProjectId;
        projectIdToArtistAddress[projectId] = _artistAddress;
        projects[projectId].name = _projectName;
        projects[projectId].paused = true;
        projects[projectId].maxInvocations = ONE_MILLION_UINT24;

        _nextProjectId = uint248(projectId) + 1;
        emit ProjectUpdated(projectId, FIELD_PROJECT_CREATED);
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
        uint24 _maxInvocations
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
     * @notice Next project ID to be created on this contract.
     */
    function nextProjectId() external view returns (uint256) {
        return _nextProjectId;
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
     * @notice Backwards-compatible (pre-V3) function returning if `_minter` is
     * minterContract.
     */
    function isMintWhitelisted(address _minter) external view returns (bool) {
        return (minterContract == _minter);
    }

    /**
     * @notice Backwards-compatible (pre-V3) function.
     * Gets artist + artist's additional payee royalty data for token ID
     `_tokenId`.
     * WARNING: Does not include Art Blocks portion of royalties.
     * @return artistAddress Artist's payment address
     * @return additionalPayee Additional payee's payment address
     * @return additionalPayeePercentage Percentage of artist revenue
     * to be sent to the additional payee's address
     * @return royaltyFeeByID Total royalty percentage to be sent to
     * combination of artist and additional payee
     * @dev Does not include Art Blocks portion of royalties.
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
        artblocksRevenue_ = (_price * artblocksPrimarySalesPercentage) / 100;
        uint256 projectFunds;
        unchecked {
            // artblocksRevenue_ is always <=25, so guaranteed to never underflow
            projectFunds = _price - artblocksRevenue_;
        }
        additionalPayeePrimaryRevenue_ =
            (projectFunds *
                projectIdToAdditionalPayeePrimarySalesPercentage[_projectId]) /
            100;
        unchecked {
            // projectIdToAdditionalPayeePrimarySalesPercentage is always
            // <=100, so guaranteed to never underflow
            artistRevenue_ = projectFunds - additionalPayeePrimaryRevenue_;
        }
        // set addresses from storage
        artblocksAddress_ = artblocksPrimarySalesAddress;
        if (artistRevenue_ > 0) {
            artistAddress_ = projectIdToArtistAddress[_projectId];
        }
        if (additionalPayeePrimaryRevenue_ > 0) {
            additionalPayeePrimaryAddress_ = projectIdToAdditionalPayeePrimarySales[
                _projectId
            ];
        }
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
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(IManifold).interfaceId ||
            super.supportsInterface(interfaceId);
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
     * @notice Updates Art Blocks payment address to `_artblocksPrimarySalesAddress`.
     */
    function _updateArtblocksPrimarySalesAddress(
        address _artblocksPrimarySalesAddress
    ) internal {
        artblocksPrimarySalesAddress = payable(_artblocksPrimarySalesAddress);
        emit PlatformUpdated(FIELD_ARTBLOCKS_PRIMARY_SALES_ADDRESS);
    }

    /**
     * @notice Updates Art Blocks secondary sales royalty payment address to
     * `_artblocksSecondarySalesAddress`.
     */
    function _updateArtblocksSecondarySalesAddress(
        address _artblocksSecondarySalesAddress
    ) internal {
        artblocksSecondarySalesAddress = payable(
            _artblocksSecondarySalesAddress
        );
        emit PlatformUpdated(FIELD_ARTBLOCKS_SECONDARY_SALES_ADDRESS);
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
        projects[_projectId].completedTimestamp = uint64(block.timestamp);
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
