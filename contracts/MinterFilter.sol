/**
 *Submitted for verification at Etherscan.io on 2020-12-20
 */

import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

pragma solidity ^0.5.0;

interface GenArt721CoreContract {
    function isWhitelisted(address sender) external view returns (bool);

    function projectIdToCurrencySymbol(uint256 _projectId)
        external
        view
        returns (string memory);

    function projectIdToCurrencyAddress(uint256 _projectId)
        external
        view
        returns (address);

    function projectIdToArtistAddress(uint256 _projectId)
        external
        view
        returns (address payable);

    function projectIdToPricePerTokenInWei(uint256 _projectId)
        external
        view
        returns (uint256);

    function projectIdToAdditionalPayee(uint256 _projectId)
        external
        view
        returns (address payable);

    function projectIdToAdditionalPayeePercentage(uint256 _projectId)
        external
        view
        returns (uint256);

    function artblocksAddress() external view returns (address payable);

    function artblocksPercentage() external view returns (uint256);

    function mint(
        address _to,
        uint256 _projectId,
        address _by
    ) external returns (uint256 tokenId);
}

contract MinterFilter {
    using SafeMath for uint256;

    GenArt721CoreContract public artblocksContract;

    address payable public ownerAddress;
    address public defaultMinter;

    mapping(uint256 => address) public minterForProject;

    constructor(address _genArt721Address) public {
        artblocksContract = GenArt721CoreContract(_genArt721Address);
    }

    function setOwnerAddress(address payable _ownerAddress) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        ownerAddress = _ownerAddress;
    }

    function setMinterForProject(uint256 _projectId, address _minterAddress)
        public
    {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        minterForProject[_projectId] = _minterAddress;
    }

    function setDefaultMinter(address _minterAddress)
        public
    {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        defaultMinter = _minterAddress;
    }

    function resetMinterForProjectToDefault(uint256 _projectId) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        minterForProject[_projectId] = address(0);
    }

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) public returns (uint256 _tokenId) {
        require(
            (minterForProject[_projectId] != address(0x0) && msg.sender == minterForProject[_projectId]) ||
            (minterForProject[_projectId] == address(0x0) && msg.sender == defaultMinter),
            "Not sent from correct minter for project"
        );
        uint256 tokenId = artblocksContract.mint(_to, _projectId, sender);
        return tokenId;
    }
}
