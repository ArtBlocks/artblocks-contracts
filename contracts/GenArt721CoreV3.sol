// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "./libs/0.5.x/CustomERC721Metadata.sol";
import "./libs/0.5.x/SafeMath.sol";
import "./libs/0.5.x/Strings.sol";

import "./interfaces/0.5.x/IRandomizer.sol";
import "./interfaces/0.5.x/IGenArt721CoreContract.sol";

pragma solidity ^0.5.17;

/**
 * @title Art Blocks ERC-721 core contract, V3.
 * @author Art Blocks Inc.
 */
contract GenArt721CoreV3 is CustomERC721Metadata, IGenArt721CoreContract {
    using SafeMath for uint256;

    /**
     * @notice Token ID `_tokenId` minted on project ID `_projectId` to `_to`.
     * @dev NatSpec for events not supported in Solidity ^0.5.0
     */
    event Mint(
        address indexed _to,
        uint256 indexed _tokenId,
        uint256 indexed _projectId
    );

    /**
     * @notice currentMinter updated to `_currentMinter`.
     * @dev Implemented starting with V3 core
     * @dev NatSpec for events not supported in Solidity ^0.5.0
     */
    event MinterUpdated(address indexed _currentMinter);

    /// randomizer contract
    IRandomizer public randomizerContract;

    struct Project {
        string name;
        string artist;
        string description;
        string website;
        string license;
        string projectBaseURI;
        uint256 invocations;
        uint256 maxInvocations;
        string scriptJSON;
        mapping(uint256 => string) scripts;
        uint256 scriptCount;
        string ipfsHash;
        bool active;
        bool locked;
        bool paused;
    }

    uint256 constant ONE_MILLION = 1_000_000;
    mapping(uint256 => Project) projects;

    //All financial functions are stripped from struct for visibility
    mapping(uint256 => address) public projectIdToArtistAddress;
    mapping(uint256 => address) public projectIdToAdditionalPayee;
    mapping(uint256 => uint256) public projectIdToAdditionalPayeePercentage;
    mapping(uint256 => uint256)
        public projectIdToSecondaryMarketRoyaltyPercentage;

    address public artblocksAddress;
    /// Percentage of mint revenue allocated to Art Blocks
    uint256 public artblocksPercentage = 10;

    mapping(uint256 => uint256) public tokenIdToProjectId;
    //mapping(uint256 => uint256[]) internal projectIdToTokenIds;
    mapping(uint256 => bytes32) public tokenIdToHash;
    mapping(bytes32 => uint256) public hashToTokenId;

    /// admin for contract
    address public admin;
    /// true if address is whitelisted
    mapping(address => bool) public isWhitelisted;

    /// single minter allowed for this core contract
    address public minterContract;

    /// next project ID to be created
    uint256 public nextProjectId = 0;

    modifier onlyValidTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token ID does not exist");
        _;
    }

    modifier onlyUnlocked(uint256 _projectId) {
        require(!projects[_projectId].locked, "Only if unlocked");
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            msg.sender == projectIdToArtistAddress[_projectId],
            "Only artist"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "Only whitelisted");
        _;
    }

    modifier onlyArtistOrWhitelisted(uint256 _projectId) {
        require(
            isWhitelisted[msg.sender] ||
                msg.sender == projectIdToArtistAddress[_projectId],
            "Only artist or whitelisted"
        );
        _;
    }

    /**
     * @notice Initializes contract.
     * @param _tokenName Name of token.
     * @param _tokenSymbol Token symbol.
     * @param _randomizerContract Randomizer contract.
     */
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        address _randomizerContract
    ) public CustomERC721Metadata(_tokenName, _tokenSymbol) {
        admin = msg.sender;
        isWhitelisted[msg.sender] = true;
        artblocksAddress = msg.sender;
        randomizerContract = IRandomizer(_randomizerContract);
    }

    /**
     * @notice Mints a token from project `_projectId` and sets the
     * token's owner to `_to`.
     * @param _to Address to be the minted token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _by Purchaser of minted token.
     * @dev sender must be a whitelisted minter
     */
    function mint(
        address _to,
        uint256 _projectId,
        address _by
    ) external returns (uint256 _tokenId) {
        require(
            msg.sender == minterContract,
            "Must mint from the allowed minter contract."
        );
        require(
            projects[_projectId].invocations.add(1) <=
                projects[_projectId].maxInvocations,
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

        uint256 tokenId = _mintToken(_to, _projectId);

        return tokenId;
    }

    function _mintToken(address _to, uint256 _projectId)
        internal
        returns (uint256 _tokenId)
    {
        uint256 tokenIdToBe = (_projectId * ONE_MILLION) +
            projects[_projectId].invocations;

        projects[_projectId].invocations = projects[_projectId].invocations.add(
            1
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                projects[_projectId].invocations,
                block.number,
                blockhash(block.number - 1),
                randomizerContract.returnValue()
            )
        );
        tokenIdToHash[tokenIdToBe] = hash;
        hashToTokenId[hash] = tokenIdToBe;

        _mint(_to, tokenIdToBe);

        tokenIdToProjectId[tokenIdToBe] = _projectId;
        //projectIdToTokenIds[_projectId].push(tokenIdToBe);

        emit Mint(_to, tokenIdToBe, _projectId);

        return tokenIdToBe;
    }

    /**
     * @notice Updates contract admin to `_adminAddress`.
     */
    function updateAdmin(address _adminAddress) public onlyAdmin {
        admin = _adminAddress;
    }

    /**
     * @notice Updates artblocksAddress to `_artblocksAddress`.
     */
    function updateArtblocksAddress(address _artblocksAddress)
        public
        onlyAdmin
    {
        artblocksAddress = _artblocksAddress;
    }

    /**
     * @notice Updates Art Blocks mint revenue percentage to
     * `_artblocksPercentage`.
     */
    function updateArtblocksPercentage(uint256 _artblocksPercentage)
        public
        onlyAdmin
    {
        require(_artblocksPercentage <= 25, "Max of 25%");
        artblocksPercentage = _artblocksPercentage;
    }

    /**
     * @notice Whitelists `_address`.
     */
    function addWhitelisted(address _address) public onlyAdmin {
        isWhitelisted[_address] = true;
    }

    /**
     * @notice Revokes whitelisting of `_address`.
     */
    function removeWhitelisted(address _address) public onlyAdmin {
        isWhitelisted[_address] = false;
    }

    /**
     * @notice updates minter to `_address`.
     */
    function updateMinterContract(address _address) public onlyAdmin {
        minterContract = _address;
        emit MinterUpdated(_address);
    }

    /**
     * @notice Updates randomizer to `_randomizerAddress`.
     */
    function updateRandomizerAddress(address _randomizerAddress)
        public
        onlyWhitelisted
    {
        randomizerContract = IRandomizer(_randomizerAddress);
    }

    /**
     * @notice Locks project `_projectId`.
     */
    function toggleProjectIsLocked(uint256 _projectId)
        public
        onlyWhitelisted
        onlyUnlocked(_projectId)
    {
        projects[_projectId].locked = true;
    }

    /**
     * @notice Toggles project `_projectId` as active/inactive.
     */
    function toggleProjectIsActive(uint256 _projectId) public onlyWhitelisted {
        projects[_projectId].active = !projects[_projectId].active;
    }

    /**
     * @notice Updates artist of project `_projectId` to `_artistAddress`.
     */
    function updateProjectArtistAddress(
        uint256 _projectId,
        address _artistAddress
    ) public onlyArtistOrWhitelisted(_projectId) {
        projectIdToArtistAddress[_projectId] = _artistAddress;
    }

    /**
     * @notice Toggles paused state of project `_projectId`.
     */
    function toggleProjectIsPaused(uint256 _projectId)
        public
        onlyArtist(_projectId)
    {
        projects[_projectId].paused = !projects[_projectId].paused;
    }

    /**
     * @notice Adds new project `_projectName` by `_artistAddress`.
     * @param _projectName Project name.
     * @param _artistAddress Artist's address.
     * @dev token price now stored on minter
     */
    function addProject(string memory _projectName, address _artistAddress)
        public
        onlyWhitelisted
    {
        uint256 projectId = nextProjectId;
        projectIdToArtistAddress[projectId] = _artistAddress;
        projects[projectId].name = _projectName;
        projects[projectId].paused = true;
        projects[projectId].maxInvocations = ONE_MILLION;

        nextProjectId = nextProjectId.add(1);
    }

    /**
     * @notice Updates name of project `_projectId` to be `_projectName`.
     */
    function updateProjectName(uint256 _projectId, string memory _projectName)
        public
        onlyUnlocked(_projectId)
        onlyArtistOrWhitelisted(_projectId)
    {
        projects[_projectId].name = _projectName;
    }

    /**
     * @notice Updates artist name for project `_projectId` to be
     * `_projectArtistName`.
     */
    function updateProjectArtistName(
        uint256 _projectId,
        string memory _projectArtistName
    ) public onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) {
        projects[_projectId].artist = _projectArtistName;
    }

    /**
     * @notice Updates additional payee for project `_projectId` to be
     * `_additionalPayee`, receiving `_additionalPayeePercentage` percent
     * of artist mint and royalty revenues.
     */
    function updateProjectAdditionalPayeeInfo(
        uint256 _projectId,
        address _additionalPayee,
        uint256 _additionalPayeePercentage
    ) public onlyArtist(_projectId) {
        require(_additionalPayeePercentage <= 100, "Max of 100%");
        projectIdToAdditionalPayee[_projectId] = _additionalPayee;
        projectIdToAdditionalPayeePercentage[
            _projectId
        ] = _additionalPayeePercentage;
    }

    /**
     * @notice Updates artist secondary market royalties for project
     * `_projectId` to be `_secondMarketRoyalty` percent.
     */
    function updateProjectSecondaryMarketRoyaltyPercentage(
        uint256 _projectId,
        uint256 _secondMarketRoyalty
    ) public onlyArtist(_projectId) {
        require(_secondMarketRoyalty <= 100, "Max of 100%");
        projectIdToSecondaryMarketRoyaltyPercentage[
            _projectId
        ] = _secondMarketRoyalty;
    }

    /**
     * @notice Updates description of project `_projectId`.
     */
    function updateProjectDescription(
        uint256 _projectId,
        string memory _projectDescription
    ) public onlyArtist(_projectId) {
        projects[_projectId].description = _projectDescription;
    }

    /**
     * @notice Updates website of project `_projectId` to be `_projectWebsite`.
     */
    function updateProjectWebsite(
        uint256 _projectId,
        string memory _projectWebsite
    ) public onlyArtist(_projectId) {
        projects[_projectId].website = _projectWebsite;
    }

    /**
     * @notice Updates license for project `_projectId`.
     */
    function updateProjectLicense(
        uint256 _projectId,
        string memory _projectLicense
    ) public onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) {
        projects[_projectId].license = _projectLicense;
    }

    /**
     * @notice Updates maximum invocations for project `_projectId` to
     * `_maxInvocations`.
     */
    function updateProjectMaxInvocations(
        uint256 _projectId,
        uint256 _maxInvocations
    ) public onlyArtist(_projectId) {
        require(
            (!projects[_projectId].locked ||
                _maxInvocations < projects[_projectId].maxInvocations),
            "Only if unlocked"
        );
        require(
            _maxInvocations > projects[_projectId].invocations,
            "You must set max invocations greater than current invocations"
        );
        require(_maxInvocations <= ONE_MILLION, "Cannot exceed 1000000");
        projects[_projectId].maxInvocations = _maxInvocations;
    }

    /**
     * @notice Adds a script to project `_projectId`.
     * @param _projectId Project to be updated.
     * @param _script Script to be added.
     */
    function addProjectScript(uint256 _projectId, string memory _script)
        public
        onlyUnlocked(_projectId)
        onlyArtistOrWhitelisted(_projectId)
    {
        projects[_projectId].scripts[
            projects[_projectId].scriptCount
        ] = _script;
        projects[_projectId].scriptCount = projects[_projectId].scriptCount.add(
            1
        );
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
    ) public onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) {
        require(
            _scriptId < projects[_projectId].scriptCount,
            "scriptId out of range"
        );
        projects[_projectId].scripts[_scriptId] = _script;
    }

    /**
     * @notice Removes last script from project `_projectId`.
     */
    function removeProjectLastScript(uint256 _projectId)
        public
        onlyUnlocked(_projectId)
        onlyArtistOrWhitelisted(_projectId)
    {
        require(
            projects[_projectId].scriptCount > 0,
            "there are no scripts to remove"
        );
        delete projects[_projectId].scripts[
            projects[_projectId].scriptCount - 1
        ];
        projects[_projectId].scriptCount = projects[_projectId].scriptCount.sub(
            1
        );
    }

    /**
     * @notice Updates script json for project `_projectId`.
     */
    function updateProjectScriptJSON(
        uint256 _projectId,
        string memory _projectScriptJSON
    ) public onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) {
        projects[_projectId].scriptJSON = _projectScriptJSON;
    }

    /**
     * @notice Updates ipfs hash for project `_projectId`.
     */
    function updateProjectIpfsHash(uint256 _projectId, string memory _ipfsHash)
        public
        onlyUnlocked(_projectId)
        onlyArtistOrWhitelisted(_projectId)
    {
        projects[_projectId].ipfsHash = _ipfsHash;
    }

    /**
     * @notice Updates base URI for project `_projectId` to `_newBaseURI`.
     */
    function updateProjectBaseURI(uint256 _projectId, string memory _newBaseURI)
        public
        onlyArtist(_projectId)
    {
        projects[_projectId].projectBaseURI = _newBaseURI;
    }

    /**
     * @notice Returns project details for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return projectName Name of project
     * @return artist Artist of project
     * @return description Project description
     * @return website Project website
     * @return license Project license
     */
    function projectDetails(uint256 _projectId)
        public
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
     * @notice Returns project token information for project `_projectId`.
     * @param _projectId Project to be queried
     * @return artistAddress Project Artist's address
     * @return pricePerTokenInWei (deprecated) - please view on minter
     * @return invocations Current number of invocations
     * @return maxInvocations Maximum allowed invocations
     * @return active Boolean representing if project is currently active
     * @return additionalPayee Additional payee address
     * @return additionalPayeePercentage Percentage of artist revenue
     * to be sent to the additional payee's address
     * @return currency (deprecated) - please view on minter
     * @return currencyAddress (deprecated) - please view on minter
     */
    function projectTokenInfo(uint256 _projectId)
        public
        view
        returns (
            address artistAddress,
            uint256 pricePerTokenInWei,
            uint256 invocations,
            uint256 maxInvocations,
            bool active,
            address additionalPayee,
            uint256 additionalPayeePercentage,
            string memory currency,
            address currencyAddress
        )
    {
        artistAddress = projectIdToArtistAddress[_projectId];
        pricePerTokenInWei = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        invocations = projects[_projectId].invocations;
        maxInvocations = projects[_projectId].maxInvocations;
        active = projects[_projectId].active;
        additionalPayee = projectIdToAdditionalPayee[_projectId];
        additionalPayeePercentage = projectIdToAdditionalPayeePercentage[
            _projectId
        ];
    }

    /**
     * @notice Returns script information for project `_projectId`.
     * @param _projectId Project to be queried.
     * @return scriptJSON Project's script json
     * @return scriptCount Count of scripts for project
     * @return ipfsHash IPFS hash for project
     * @return locked Boolean representing if project is locked
     * @return paused Boolean representing if project is paused
     */
    function projectScriptInfo(uint256 _projectId)
        external
        view
        returns (
            string memory scriptJSON,
            uint256 scriptCount,
            string memory ipfsHash,
            bool locked,
            bool paused
        )
    {
        scriptJSON = projects[_projectId].scriptJSON;
        scriptCount = projects[_projectId].scriptCount;
        ipfsHash = projects[_projectId].ipfsHash;
        locked = projects[_projectId].locked;
        paused = projects[_projectId].paused;
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
     * @notice Gets tokens of `owner`.
     */
    function tokensOfOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return _tokensOfOwner(owner);
    }

    /**
     * @notice Backwards-compatible (pre-V3) function returning if `_minter` is
     * minterContract.
     */
    function isMintWhitelisted(address _minter) external view returns (bool) {
        return (minterContract == _minter);
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
        public
        view
        returns (
            address artistAddress,
            address additionalPayee,
            uint256 additionalPayeePercentage,
            uint256 royaltyFeeByID
        )
    {
        artistAddress = projectIdToArtistAddress[tokenIdToProjectId[_tokenId]];
        additionalPayee = projectIdToAdditionalPayee[
            tokenIdToProjectId[_tokenId]
        ];
        additionalPayeePercentage = projectIdToAdditionalPayeePercentage[
            tokenIdToProjectId[_tokenId]
        ];
        royaltyFeeByID = projectIdToSecondaryMarketRoyaltyPercentage[
            tokenIdToProjectId[_tokenId]
        ];
    }

    /**
     * @notice Gets token URI for token ID `_tokenId`.
     */
    function tokenURI(uint256 _tokenId)
        external
        view
        onlyValidTokenId(_tokenId)
        returns (string memory)
    {
        return
            Strings.strConcat(
                projects[tokenIdToProjectId[_tokenId]].projectBaseURI,
                Strings.uint2str(_tokenId)
            );
    }
}
