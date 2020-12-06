// File: contracts/GenArt721.sol

//0xEC85c08504D52040c7B2252600b2823eF3e0bC24

//https://oneclickdapp.com/pandora-happy/

pragma solidity ^0.5.0;

import "./libs/CustomERC721Metadata.sol";
import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

interface Randomizer {
   function returnValue() external view returns(bytes32);
}

contract GenArt721 is CustomERC721Metadata {
    using SafeMath for uint256;

    event Mint(
        address indexed _to,
        uint256 indexed _tokenId,
        bytes32 indexed _hashString

    );

    Randomizer public randomizerContract;

    struct Project {
        string name;
        string artist;
        string description;
        string website;
        string license;
        bool dynamic;
        //address artistAddress;
        //address additionalPayee;
        //uint256 additionalPayeePercentage;
        uint256 secondMarketRoyalty;
        //uint256 pricePerTokenInWei;
        string projectBaseURI;
        string projectBaseIpfsURI;
        uint256 invocations;
        uint256 maxInvocations;
        string scriptJSON;
        mapping(uint256 => string) scripts;
        uint scriptCount;
        string ipfsHash;
        bool useHashString;
        bool useIpfs;
        bool active;
        bool locked;
        bool paused;
        //string currencySymbol;
        //address currencyAddress;
    }

    uint256 constant ONE_MILLION = 1_000_000;
    mapping(uint256 => Project) projects;

    mapping(uint256 => address) public projectIdToArtistAddress;
    mapping(uint256 => string) public projectIdToCurrencySymbol;
    mapping(uint256 => address) public projectIdToCurrencyAddress;
    mapping(uint256 => uint256) public projectIdToPricePerTokenInWei;
    mapping(uint256 => address) public projectIdToAdditionalPayee;
    mapping(uint256 => uint256) public projectIdToAdditionalPayeePercentage;

    address public artblocksAddress;
    uint256 public artblocksPercentage = 10;

    mapping(uint256 => string) public staticIpfsImageLink;
    mapping(uint256 => uint256) public tokenIdToProjectId;
    mapping(uint256 => uint256[]) internal projectIdToTokenIds;
    mapping(uint256 => bytes32) internal tokenIdToHash;
    mapping(bytes32 => uint256) public hashToTokenId;

    address public admin;
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public isMintWhitelisted;
    //mapping(address => bool) public isDeployer;

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
        require(msg.sender == projectIdToArtistAddress[_projectId], "Only artist");
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
/*
    modifier onlyDeployer() {
        require(isDeployer[msg.sender], "Only deployer");
        _;
    }
    */

    modifier onlyArtistOrWhitelisted(uint256 _projectId) {
        require(isWhitelisted[msg.sender] || msg.sender == projectIdToArtistAddress[_projectId], "Only artist or whitelisted");
        _;
    }

    constructor(string memory _tokenName, string memory _tokenSymbol, address _randomizerContract) CustomERC721Metadata(_tokenName, _tokenSymbol) public {
        admin = msg.sender;
        isWhitelisted[msg.sender] = true;
        artblocksAddress = msg.sender;
        randomizerContract = Randomizer(_randomizerContract);

    }

          ///FIXME set "external"?
    function mint(address _to, uint256 _projectId, address _by) public returns (uint256 _tokenId) {
        require(isMintWhitelisted[msg.sender], "Must mint from whitelisted minter contract.");
        require(projects[_projectId].invocations.add(1) <= projects[_projectId].maxInvocations, "Must not exceed max invocations");
        require(projects[_projectId].active || _by == projectIdToArtistAddress[_projectId], "Project must exist and be active");
        require(!projects[_projectId].paused || _by == projectIdToArtistAddress[_projectId], "Purchases are paused.");


        uint256 tokenId = _mintToken(_to, _projectId);
        /*
        if (projects[_projectId].useETH){
          _splitFunds(_projectId);
        }
        */

        return tokenId;
    }

    function _mintToken(address _to, uint256 _projectId) internal returns (uint256 _tokenId) {

        uint256 tokenIdToBe = (_projectId * ONE_MILLION) + projects[_projectId].invocations;

        projects[_projectId].invocations = projects[_projectId].invocations.add(1);


            bytes32 hash = keccak256(abi.encodePacked(projects[_projectId].invocations, block.number, blockhash(block.number - 1), msg.sender, randomizerContract.returnValue()));
            tokenIdToHash[tokenIdToBe]=hash;
            hashToTokenId[hash] = tokenIdToBe;


        _mint(_to, tokenIdToBe);

        tokenIdToProjectId[tokenIdToBe] = _projectId;
        projectIdToTokenIds[_projectId].push(tokenIdToBe);

        emit Mint(_to, tokenIdToBe, hash);

        return tokenIdToBe;
    }
/*
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
    */

    function updateArtblocksAddress(address _artblocksAddress) public onlyAdmin {
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

    function addMintWhitelisted(address _address) public onlyAdmin {
        isMintWhitelisted[_address] = true;
    }

    function removeMintWhitelisted(address _address) public onlyAdmin {
        isMintWhitelisted[_address] = false;
    }
/*
    function addDeployer(address _address) public onlyWhitelisted {
        isDeployer[_address] = true;
    }

    function removeDeployer(address _address) public onlyWhitelisted {
        isDeployer[_address] = false;
    }
    */

    function updateRandomizerAddress(address _randomizerAddress) public onlyWhitelisted {
      randomizerContract = Randomizer(_randomizerAddress);
    }
    function toggleProjectIsLocked(uint256 _projectId) public onlyWhitelisted onlyUnlocked(_projectId) {
        projects[_projectId].locked = true;
    }

    function toggleProjectIsActive(uint256 _projectId) public onlyWhitelisted {
        projects[_projectId].active = !projects[_projectId].active;
    }

    function updateProjectArtistAddress(uint256 _projectId, address _artistAddress) public onlyArtistOrWhitelisted(_projectId) {
        projectIdToArtistAddress[_projectId] = _artistAddress;
    }

    function toggleProjectIsPaused(uint256 _projectId) public onlyArtist(_projectId) {
        projects[_projectId].paused = !projects[_projectId].paused;
    }

    function addProject(string memory _projectName, address _artistAddress, uint256 _pricePerTokenInWei, bool _dynamic) public onlyWhitelisted {

        uint256 projectId = nextProjectId;
        projectIdToArtistAddress[projectId] = _artistAddress;
        projects[projectId].name = _projectName;
        projectIdToCurrencySymbol[projectId] = "ETH";
        projectIdToPricePerTokenInWei[projectId] = _pricePerTokenInWei;
        projects[projectId].paused=true;
        projects[projectId].dynamic=_dynamic;
        projects[projectId].maxInvocations = ONE_MILLION;
        if (!_dynamic) {
            projects[projectId].useHashString = false;
        } else {
            projects[projectId].useHashString = true;
        }
        nextProjectId = nextProjectId.add(1);
    }

    function updateProjectCurrencySymbol(uint256 _projectId, string memory _currencySymbol) onlyArtist(_projectId) public {
        projectIdToCurrencySymbol[_projectId] = _currencySymbol;
    }

    function updateProjectCurrencyAddress(uint256 _projectId, address _currencyAddress) onlyArtist(_projectId) public {
        projectIdToCurrencyAddress[_projectId] = _currencyAddress;
    }

    function updateProjectPricePerTokenInWei(uint256 _projectId, uint256 _pricePerTokenInWei) onlyArtist(_projectId) public {
        projectIdToPricePerTokenInWei[_projectId] = _pricePerTokenInWei;
    }
/*
    function toggleProjectUseETH(uint256 _projectId) public onlyArtist(_projectId) {
      projects[_projectId].useETH = !projects[_projectId].useETH;
    }
*/
    function updateProjectName(uint256 _projectId, string memory _projectName) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].name = _projectName;
    }

    function updateProjectArtistName(uint256 _projectId, string memory _projectArtistName) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
        projects[_projectId].artist = _projectArtistName;
    }

    function updateProjectAdditionalPayeeInfo(uint256 _projectId, address _additionalPayee, uint256 _additionalPayeePercentage) onlyArtist(_projectId) public {
        require(_additionalPayeePercentage <= 100, "Max of 100%");
        projectIdToAdditionalPayee[_projectId] = _additionalPayee;
        projectIdToAdditionalPayeePercentage[_projectId] = _additionalPayeePercentage;
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

    function updateProjectMaxInvocations(uint256 _projectId, uint256 _maxInvocations) onlyArtist(_projectId) public {
        require((!projects[_projectId].locked || _maxInvocations<projects[_projectId].maxInvocations, "Only if unlocked");
        require(_maxInvocations > projects[_projectId].invocations, "You must set max invocations greater than current invocations");
        require(_maxInvocations <= ONE_MILLION, "Cannot exceed 1,000,000");
        projects[_projectId].maxInvocations = _maxInvocations;
    }
/*
    function updateProjectHashesGenerated(uint256 _projectId, uint256 _hashes) onlyUnlocked(_projectId) onlyWhitelisted() public {
        require(projects[_projectId].invocations == 0, "Can not modify hashes generated after a token is minted.");
        require(projects[_projectId].dynamic, "Can only modify hashes on dynamic projects.");
        require(_hashes <= 100 && _hashes >= 0, "Hashes generated must be a positive integer and max hashes per invocation are 100");
        projects[_projectId].hashes = _hashes;
    }
    */
    function toggleProjectUseHashString(uint256 _projectId) onlyUnlocked(_projectId) onlyArtistOrWhitelisted(_projectId) public {
      require(projects[_projectId].invocations == 0, "Cannot modify after a token is minted.");
      projects[_projectId].useHashString = !projects[_projectId].useHashString;
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
            projects[_projectId].useHashString = false;
        } else {
            projects[_projectId].useHashString = true;
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

    function projectTokenInfo(uint256 _projectId) view public returns (address artistAddress, uint256 pricePerTokenInWei, uint256 invocations, uint256 maxInvocations, bool active, address additionalPayee, uint256 additionalPayeePercentage /*,string memory currency, address currencyAddress*/) {
        artistAddress = projectIdToArtistAddress[_projectId];
        pricePerTokenInWei = projectIdToPricePerTokenInWei[_projectId];
        invocations = projects[_projectId].invocations;
        maxInvocations = projects[_projectId].maxInvocations;
        active = projects[_projectId].active;
        additionalPayee = projectIdToAdditionalPayee[_projectId];
        additionalPayeePercentage = projectIdToAdditionalPayeePercentage[_projectId];
        //currency = projectIdToCurrencySymbol[_projectId];
        //currencyAddress = projectIdToCurrencyAddress[_projectId];
    }

    function projectScriptInfo(uint256 _projectId) view public returns (string memory scriptJSON, uint256 scriptCount, bool useHashString, string memory ipfsHash, bool locked, bool paused) {
        scriptJSON = projects[_projectId].scriptJSON;
        scriptCount = projects[_projectId].scriptCount;
        useHashString = projects[_projectId].useHashString;
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

    function showTokenHash(uint _tokenId) public view returns (bytes32){
        return tokenIdToHash[_tokenId];
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _tokensOfOwner(owner);
    }

    function getRoyaltyData(uint256 _tokenId) public view returns (address artistAddress, address additionalPayee, uint256 additionalPayeePercentage, uint256 royaltyFeeByID) {
        artistAddress = projectIdToArtistAddress[tokenIdToProjectId[_tokenId]];
        additionalPayee = projectIdToAdditionalPayee[tokenIdToProjectId[_tokenId]];
        additionalPayeePercentage = projectIdToAdditionalPayeePercentage[tokenIdToProjectId[_tokenId]];
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
