import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

import "./interfaces/IGenArt721CoreContract.sol";

pragma solidity ^0.5.0;

contract MinterFilter {
    using SafeMath for uint256;

    IGenArt721CoreContract public artblocksContract;

    address public defaultMinter;

    mapping(uint256 => address) public minterForProject;

    constructor(address _genArt721Address) public {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
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

    function setDefaultMinter(address _minterAddress) public {
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
