import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

import "./interfaces/IGenArt721CoreContract.sol";

pragma solidity ^0.5.0;

contract MinterFilter {
    using SafeMath for uint256;

    event DefaultMinterRegistered(address indexed _minterAddress);
    event ProjectMinterRegistered(
        uint256 indexed _projectId,
        address indexed _minterAddress
    );

    IGenArt721CoreContract public artblocksContract;

    address public defaultMinter;

    mapping(uint256 => address) public minterForProject;

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    constructor(address _genArt721Address) public {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
    }

    function setMinterForProject(uint256 _projectId, address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        minterForProject[_projectId] = _minterAddress;
        emit ProjectMinterRegistered(_projectId, _minterAddress);
    }

    function setDefaultMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        defaultMinter = _minterAddress;
        emit DefaultMinterRegistered(_minterAddress);
    }

    function resetMinterForProjectToDefault(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        minterForProject[_projectId] = address(0);
        emit ProjectMinterRegistered(_projectId, address(0));
    }

    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256 _tokenId) {
        require(
            (minterForProject[_projectId] != address(0x0) &&
                msg.sender == minterForProject[_projectId]) ||
                (minterForProject[_projectId] == address(0x0) &&
                    msg.sender == defaultMinter),
            "Not sent from correct minter for project"
        );
        uint256 tokenId = artblocksContract.mint(_to, _projectId, sender);
        return tokenId;
    }
}
