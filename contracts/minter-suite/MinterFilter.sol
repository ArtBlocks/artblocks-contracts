// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

/**
 * @title Minter filter contract that allows filtered minter contracts 
 * to be set on a per-project basis.
 * @author Art Blocks Inc.
 */
contract MinterFilter is IMinterFilter {
    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContract public artblocksContract;

    /// Default minter contract address
    address public defaultMinter;

    /// projectId => filtered minter contract address
    mapping(uint256 => address) public minterForProject;
    /// minter contract address => is an approved minter contract?
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

    /**
     * @notice Initializes contract to be a Minter for `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address 
     * this contract will be a minter for. Can never be updated.
     */
    constructor(address _genArt721Address) {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
    }

    /**
     * @notice Approves a minter contract, `_minterAddress`.
     * @param _minterAddress Minter contract to be added as an approved minter.
     */
    function addApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = true;
        emit MinterApproved(_minterAddress);
    }

    /**
     * @notice Removes previously approved minter contract, `_minterAddress`.
     * @param _minterAddress Minter contract to remove from approved minters.
     */
    function removeApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = false;
        emit MinterRevoked(_minterAddress);
    }

    /**
     * @notice Sets default minter to minter contract `_minterAddress`.
     * @param _minterAddress Minter contract to be set as default minter.
     */
    function setDefaultMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
        usingApprovedMinter(_minterAddress)
    {
        defaultMinter = _minterAddress;
        emit DefaultMinterRegistered(_minterAddress);
    }

    /**
     * @notice Sets minter for project `_projectId` to minter contract 
     * `_minterAddress`.
     * @param _projectId Project ID to set minter for.
     * @param _minterAddress Minter contract to be the project's minter.
     */
    function setMinterForProject(uint256 _projectId, address _minterAddress)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
        usingApprovedMinter(_minterAddress)
    {
        minterForProject[_projectId] = _minterAddress;
        emit ProjectMinterRegistered(_projectId, _minterAddress);
    }

    /**
     * @notice Updates project `_projectId` to use the default minter.
     * @param _projectId Project ID to have use the default minter.
     */
    function resetMinterForProjectToDefault(uint256 _projectId)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
    {
        minterForProject[_projectId] = address(0);
        emit ProjectMinterRegistered(_projectId, address(0));
    }

    /**
     * @notice Mint a token from project `_projectId` to `_to`, originally
     * requested by sender at address `sender`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a new token on.
     * @param sender Address purchasing a token on the minter contract.
     * @return _tokenId Token ID of minted token
     */
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
