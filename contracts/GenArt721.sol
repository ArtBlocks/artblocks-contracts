// File: contracts/GenArt721.sol
pragma solidity ^0.5.0;

import "./libs/CustomERC721Metadata.sol";
import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

contract GenArt721 is CustomERC721Metadata {
    using SafeMath for uint256;

    event Mint(
        address indexed _to,
        uint256 indexed _tokenId,
        uint256 indexed _projectId,
        uint256 _invocations,
        uint256 _value
    );

    struct Project {
        string name;
        string artist;
        string description;
        string website;
        string license;
        bool dynamic;
        address payable artistAddress;
        address payable additionalPayee;
        uint256 additionalPayeePercentage;
        uint256 secondMarketRoyalty;
        uint256 pricePerTokenInWei;
        string projectBaseURI;
        string projectBaseIpfsURI;
        uint256 invocations;
        uint256 maxInvocations;
        string scriptJSON;
        mapping(uint256 => string) scripts;
        uint scriptCount;
        string ipfsHash;
        uint256 hashes;
        bool useIpfs;
        bool active;
        bool locked;
        bool paused;
    }

    uint256 constant ONE_MILLION = 1_000_000;
    mapping(uint256 => Project) projects;

    address payable public artblocksAddress;
    uint256 public artblocksPercentage = 10;

    mapping(uint256 => string) public staticIpfsImageLink;
    mapping(uint256 => uint256) public tokenIdToProjectId;
    mapping(uint256 => uint256[]) internal projectIdToTokenIds;
    mapping(uint256 => bytes32[]) internal tokenIdToHashes;
    mapping(bytes32 => uint256) public hashToTokenId;

    address public admin;
    mapping(address => bool) public isWhitelisted;

    uint256 public nextProjectId;

    modifier onlyValidTokenId(uint256 _tokenId) {
        require(_exists(_tokenId), "Token ID does not exist");
        _;
    }

    modifier onlyUnlocked(uint256 _projectId) {
        require(!projects[_projectId].locked, "Only if unlocked");
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(msg.sender == projects[_projectId].artistAddress, "Only artist");
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
        require(isWhitelisted[msg.sender] || msg.sender == projects[_projectId].artistAddress, "Only artist or whitelisted");
        _;
    }

    constructor(string memory _tokenName, string memory _tokenSymbol) CustomERC721Metadata(_tokenName, _tokenSymbol) public {
        admin = msg.sender;
        isWhitelisted[msg.sender] = true;
        artblocksAddress = msg.sender;
    }

    function purchase(uint256 _projectId) public payable returns (uint256 _tokenId) {
        return purchaseTo(msg.sender, _projectId);
    }

    function purchaseTo(address _to, uint256 _projectId) public payable returns (uint256 _tokenId) {
        require(msg.value >= projects[_projectId].pricePerTokenInWei, "Must send at least pricePerTokenInWei");
        require(projects[_projectId].invocations.add(1) <= projects[_projectId].maxInvocations, "Must not exceed max invocations");
        require(projects[_projectId].active || msg.sender == projects[_projectId].artistAddress, "Project must exist and be active");
        require(!projects[_projectId].paused || msg.sender == projects[_projectId].artistAddress, "Purchases are paused.");

        uint256 tokenId = _mintToken(_to, _projectId);

        _splitFunds(_projectId);

        return tokenId;
    }

    function _mintToken(address _to, uint256 _projectId) internal returns (uint256 _tokenId) {

        uint256 tokenIdToBe = (_projectId * ONE_MILLION) + projects[_projectId].invocations;

        projects[_projectId].invocations = projects[_projectId].invocations.add(1);

        for (uint256 i = 0; i < projects[_projectId].hashes; i++) {
            bytes32 hash = keccak256(abi.encodePacked(projects[_projectId].invocations, block.number.add(i), msg.sender));
            tokenIdToHashes[tokenIdToBe].push(hash);
            hashToTokenId[hash] = tokenIdToBe;
        }

        _mint(_to, tokenIdToBe);

        tokenIdToProjectId[tokenIdToBe] = _projectId;
        projectIdToTokenIds[_projectId].push(tokenIdToBe);

        emit Mint(_to, tokenIdToBe, _projectId, projects[_projectId].invocations, projects[_projectId].pricePerTokenInWei);

        return tokenIdToBe;
    }

    function _splitFunds(uint256 _projectId) internal {
        if (msg.value > 0) {

            uint256 pricePerTokenInWei = projects[_projectId].pricePerTokenInWei;
            uint256 refund = msg.value.sub(projects[_projectId].pricePerTokenInWei);

            if (refund > 0) {
                msg.sender.transfer(refund);
            }

            uint256 foundationAmount = pricePerTokenInWei.div(100).mul(artblocksPercentage);
            if (foundationAmount > 0) {
                artblocksAddress.transfer(foundationAmount);
            }

            uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);

            uint256 additionalPayeeAmount;
            if (projects[_projectId].additionalPayeePercentage > 0) {
                additionalPayeeAmount = projectFunds.div(100).mul(projects[_projectId].additionalPayeePercentage);
                if (additionalPayeeAmount > 0) {
                    projects[_projectId].additionalPayee.transfer(additionalPayeeAmount);
                }
            }

            uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
            if (creatorFunds > 0) {
                projects[_projectId].artistAddress.transfer(creatorFunds);
            }
        }
    }

    function updateArtblocksAddress(address payable _artblocksAddress) public onlyAdmin {
        artblocksAddress = _artblocksAddress;
    }

    function updateArtblocksPercentage(uint256 _artblocksPercentage) public onlyAdmin {
        require(_artblocksPercentage <= 25, "Max of 25%");
        artblocksPercentage = _artblocksPercentage;
    }

    function addWhitelisted(address _address) public onlyAdmin {
        isWhitelisted[_address] = true;
    }

    function removeWhitelisted(address _address) public onlyAdmin {
        isWhitelisted[_address] = false;
    }

    
    function toggleProjectIsLocked(uint256 _projectId) public onlyWhitelisted onlyUnlocked(_projectId) {
        projects[_projectId].locked = true;
    }

    function toggleProjectIsActive(uint256 _projectId) public onlyWhitelisted {
        projects[_projectId].active = !projects[_projectId].active;
    }

    function updateProjectArtistAddress(uint256 _projectId, address payable _artistAddress) public onlyArtistOrWhitelisted(_projectId) {
        projects[_projectId].artistAddress = _artistAddress;
    }

    function toggleProjectIsPaused(uint256 _projectId) public onlyArtist(_projectId) {
        projects[_projectId].paused = !projects[_projectId].paused;
    }

    function addProject(uint256 _pricePerTokenInWei, bool _dynamic) public onlyWhitelisted {

        uint256 projectId = nextProjectId;
        projects[projectId].artistAddress = msg.sender;
        projects[projectId].pricePerTokenInWei = _pricePerTokenInWei;
        projects[projectId].paused=true;
        projects[projectId].dynamic=_dynamic;
        projects[projectId].maxInvocations = ONE_MILLION;
        if (!_dynamic) {
            projects[projectId].hashes = 0;
        } else {
            projects[projectId].hashes = 1;
        }
        nextProjectId = nextProjectId.add(1);
    }

    function updateProjectPricePerTokenInWei(uint256 _projectId, uint256 _pricePerTokenInWei) onlyArtist(_projectId) public {
        projects[_projectId].pricePerTokenInWei = _pricePerTokenInWei;
    }

    function updateProjectName(uint256 _projectId, string memory _projectName) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].name = _projectName;
    }

    function updateProjectArtistName(uint256 _projectId, string memory _projectArtistName) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].artist = _projectArtistName;
    }

    function updateProjectAdditionalPayeeInfo(uint256 _projectId, address payable _additionalPayee, uint256 _additionalPayeePercentage) onlyArtist(_projectId) public {
        require(_additionalPayeePercentage <= 100, "Max of 100%");
        projects[_projectId].additionalPayee = _additionalPayee;
        projects[_projectId].additionalPayeePercentage = _additionalPayeePercentage;
    }

    function updateProjectSecondaryMarketRoyaltyPercentage(uint256 _projectId, uint256 _secondMarketRoyalty) onlyArtist(_projectId) public {
        require(_secondMarketRoyalty <= 100, "Max of 100%");
        projects[_projectId].secondMarketRoyalty = _secondMarketRoyalty;
    }

    function updateProjectDescription(uint256 _projectId, string memory _projectDescription) onlyArtist(_projectId) public {
        projects[_projectId].description = _projectDescription;
    }

    function updateProjectWebsite(uint256 _projectId, string memory _projectWebsite) onlyArtist(_projectId) public {
        projects[_projectId].website = _projectWebsite;
    }

    function updateProjectLicense(uint256 _projectId, string memory _projectLicense) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].license = _projectLicense;
    }

    function updateProjectMaxInvocations(uint256 _projectId, uint256 _maxInvocations) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        require(_maxInvocations > projects[_projectId].invocations, "You must set max invocations greater than current invocations");
        require(_maxInvocations <= ONE_MILLION, "Cannot exceed 1,000,000");
        projects[_projectId].maxInvocations = _maxInvocations;
    }

    function updateProjectHashesGenerated(uint256 _projectId, uint256 _hashes) onlyUnlocked(_projectId) onlyWhitelisted() public {
        require(projects[_projectId].invocations == 0, "Can not modify hashes generated after a token is minted.");
        require(projects[_projectId].dynamic, "Can only modify hashes on dynamic projects.");
        require(_hashes <= 100 && _hashes >= 0, "Hashes generated must be a positive integer and max hashes per invocation are 100");
        projects[_projectId].hashes = _hashes;
    }

    function addProjectScript(uint256 _projectId, string memory _script) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].scripts[projects[_projectId].scriptCount] = _script;
        projects[_projectId].scriptCount = projects[_projectId].scriptCount.add(1);
    }

    function updateProjectScript(uint256 _projectId, uint256 _scriptId, string memory _script) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        require(_scriptId < projects[_projectId].scriptCount, "scriptId out of range");
        projects[_projectId].scripts[_scriptId] = _script;
    }

    function removeProjectLastScript(uint256 _projectId) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        require(projects[_projectId].scriptCount > 0, "there are no scripts to remove");
        delete projects[_projectId].scripts[projects[_projectId].scriptCount - 1];
        projects[_projectId].scriptCount = projects[_projectId].scriptCount.sub(1);
    }

    function updateProjectScriptJSON(uint256 _projectId, string memory _projectScriptJSON) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].scriptJSON = _projectScriptJSON;
    }

    function updateProjectIpfsHash(uint256 _projectId, string memory _ipfsHash) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].ipfsHash = _ipfsHash;
    }

    function updateProjectBaseURI(uint256 _projectId, string memory _newBaseURI) onlyArtist(_projectId) public {
        projects[_projectId].projectBaseURI = _newBaseURI;
    }

    function updateProjectBaseIpfsURI(uint256 _projectId, string memory _projectBaseIpfsURI) onlyArtist(_projectId) public {
        projects[_projectId].projectBaseIpfsURI = _projectBaseIpfsURI;
    }

    function toggleProjectUseIpfsForStatic(uint256 _projectId) onlyArtist(_projectId) public {
        require(!projects[_projectId].dynamic, "can only set static IPFS hash for static projects");
        projects[_projectId].useIpfs = !projects[_projectId].useIpfs;
    }

    function toggleProjectIsDynamic(uint256 _projectId) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
      require(projects[_projectId].invocations == 0, "Can not switch after a token is minted.");
        if (projects[_projectId].dynamic) {
            projects[_projectId].hashes = 0;
        } else {
            projects[_projectId].hashes = 1;
        }
        projects[_projectId].dynamic = !projects[_projectId].dynamic;
    }

    function overrideTokenDynamicImageWithIpfsLink(uint256 _tokenId, string memory _ipfsHash) onlyArtist(tokenIdToProjectId[_tokenId]) public {
        staticIpfsImageLink[_tokenId] = _ipfsHash;
    }

    function clearTokenIpfsImageUri(uint256 _tokenId) onlyArtist(tokenIdToProjectId[_tokenId]) public {
        delete staticIpfsImageLink[tokenIdToProjectId[_tokenId]];
    }

    function projectDetails(uint256 _projectId) view public returns (string memory projectName, string memory artist, string memory description, string memory website, string memory license, bool dynamic) {
        projectName = projects[_projectId].name;
        artist = projects[_projectId].artist;
        description = projects[_projectId].description;
        website = projects[_projectId].website;
        license = projects[_projectId].license;
        dynamic = projects[_projectId].dynamic;
    }

    function projectTokenInfo(uint256 _projectId) view public returns (address artistAddress, uint256 pricePerTokenInWei, uint256 invocations, uint256 maxInvocations, bool active, address additionalPayee, uint256 additionalPayeePercentage) {
        artistAddress = projects[_projectId].artistAddress;
        pricePerTokenInWei = projects[_projectId].pricePerTokenInWei;
        invocations = projects[_projectId].invocations;
        maxInvocations = projects[_projectId].maxInvocations;
        active = projects[_projectId].active;
        additionalPayee = projects[_projectId].additionalPayee;
        additionalPayeePercentage = projects[_projectId].additionalPayeePercentage;
    }

    function projectScriptInfo(uint256 _projectId) view public returns (string memory scriptJSON, uint256 scriptCount, uint256 hashes, string memory ipfsHash, bool locked, bool paused) {
        scriptJSON = projects[_projectId].scriptJSON;
        scriptCount = projects[_projectId].scriptCount;
        hashes = projects[_projectId].hashes;
        ipfsHash = projects[_projectId].ipfsHash;
        locked = projects[_projectId].locked;
        paused = projects[_projectId].paused;
    }

    function projectScriptByIndex(uint256 _projectId, uint256 _index) view public returns (string memory){
        return projects[_projectId].scripts[_index];
    }

    function projectURIInfo(uint256 _projectId) view public returns (string memory projectBaseURI, string memory projectBaseIpfsURI, bool useIpfs) {
        projectBaseURI = projects[_projectId].projectBaseURI;
        projectBaseIpfsURI = projects[_projectId].projectBaseIpfsURI;
        useIpfs = projects[_projectId].useIpfs;
    }

    function projectShowAllTokens(uint _projectId) public view returns (uint256[] memory){
        return projectIdToTokenIds[_projectId];
    }

    function showTokenHashes(uint _tokenId) public view returns (bytes32[] memory){
        return tokenIdToHashes[_tokenId];
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _tokensOfOwner(owner);
    }

    function getRoyaltyData(uint256 _tokenId) public view returns (address artistAddress, address additionalPayee, uint256 additionalPayeePercentage, uint256 royaltyFeeByID) {
        artistAddress = projects[tokenIdToProjectId[_tokenId]].artistAddress;
        additionalPayee = projects[tokenIdToProjectId[_tokenId]].additionalPayee;
        additionalPayeePercentage = projects[tokenIdToProjectId[_tokenId]].additionalPayeePercentage;
        royaltyFeeByID = projects[tokenIdToProjectId[_tokenId]].secondMarketRoyalty;
    }

    function tokenURI(uint256 _tokenId) external view onlyValidTokenId(_tokenId) returns (string memory) {
        if (bytes(staticIpfsImageLink[_tokenId]).length > 0) {
            return Strings.strConcat(projects[tokenIdToProjectId[_tokenId]].projectBaseIpfsURI, staticIpfsImageLink[_tokenId]);
        }

        if (!projects[tokenIdToProjectId[_tokenId]].dynamic && projects[tokenIdToProjectId[_tokenId]].useIpfs) {
            return Strings.strConcat(projects[tokenIdToProjectId[_tokenId]].projectBaseIpfsURI, projects[tokenIdToProjectId[_tokenId]].ipfsHash);
        }

        return Strings.strConcat(projects[tokenIdToProjectId[_tokenId]].projectBaseURI, Strings.uint2str(_tokenId));
    }
}
