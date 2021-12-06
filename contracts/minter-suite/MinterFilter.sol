// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

contract MinterFilter is IMinterFilter {
    IGenArt721CoreContract public artblocksContract;

    address public defaultMinter;

    mapping(uint256 => address) public minterForProject;
    mapping(address => bool) public isApprovedMinter;

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    modifier onlyCoreWhitelistedOrArtist(uint256 _projectId) {
        require(
            (artblocksContract.isWhitelisted(msg.sender) ||
                msg.sender ==
                artblocksContract.projectIdToArtistAddress(_projectId)),
            "Only Core whitelisted or Artist"
        );
        _;
    }

    modifier usingApprovedMinter(address _minterAddress) {
        require(
            isApprovedMinter[_minterAddress],
            "Only approved minters are allowed"
        );
        _;
    }

    constructor(address _genArt721Address) {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
    }

    function addApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = true;
        emit MinterApproved(_minterAddress);
    }

    function removeApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = false;
        emit MinterRevoked(_minterAddress);
    }

    function setDefaultMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
        usingApprovedMinter(_minterAddress)
    {
        defaultMinter = _minterAddress;
        emit DefaultMinterRegistered(_minterAddress);
    }

    function setMinterForProject(uint256 _projectId, address _minterAddress)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
        usingApprovedMinter(_minterAddress)
    {
        minterForProject[_projectId] = _minterAddress;
        emit ProjectMinterRegistered(_projectId, _minterAddress);
    }

    function resetMinterForProjectToDefault(uint256 _projectId)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
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
            (msg.sender == minterForProject[_projectId]) ||
                (minterForProject[_projectId] == address(0) &&
                    msg.sender == defaultMinter),
            "Not sent from correct minter for project"
        );
        uint256 tokenId = artblocksContract.mint(_to, _projectId, sender);
        return tokenId;
    }
}
