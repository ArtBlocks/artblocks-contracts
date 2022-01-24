// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IFilteredMinter.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

import "../libs/0.8.x/EnumerableMap.sol";

pragma solidity 0.8.9;

/**
 * @title Minter filter contract that allows filtered minters to be set
 * on a per-project basis.
 * @author Art Blocks Inc.
 */
contract MinterFilter is IMinterFilter {
    // add Enumerable Map methods
    using EnumerableMap for EnumerableMap.UintToAddressMap;

    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContract public artblocksContract;

    /// projectId => minter address
    EnumerableMap.UintToAddressMap private minterForProject;

    /// minter address => is an approved minter?
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

    modifier projectExists(uint256 _projectId) {
        require(
            _projectId < artblocksContract.nextProjectId(),
            "Only existing projects"
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
     * @notice Approves minter `_minterAddress`.
     * @param _minterAddress Minter to be added as an approved minter.
     */
    function addApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = true;
        emit MinterApproved(
            _minterAddress,
            IFilteredMinter(_minterAddress).minterType()
        );
    }

    /**
     * @notice Removes previously approved minter `_minterAddress`.
     * @param _minterAddress Minter to remove.
     */
    function removeApprovedMinter(address _minterAddress)
        external
        onlyCoreWhitelisted
    {
        isApprovedMinter[_minterAddress] = false;
        emit MinterRevoked(_minterAddress);
    }

    /**
     * @notice Sets minter for project `_projectId` to minter
     * `_minterAddress`.
     * @param _projectId Project ID to set minter for.
     * @param _minterAddress Minter to be the project's minter.
     */
    function setMinterForProject(uint256 _projectId, address _minterAddress)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
        usingApprovedMinter(_minterAddress)
        projectExists(_projectId)
    {
        minterForProject.set(_projectId, _minterAddress);
        emit ProjectMinterRegistered(_projectId, _minterAddress);
    }

    /**
     * @notice Updates project `_projectId` to have no configured minter.
     * @param _projectId Project ID to remove minter.
     * @dev requires project to have assigned minter (de-clutter event noise)
     */
    function removeMinterForProject(uint256 _projectId)
        external
        onlyCoreWhitelistedOrArtist(_projectId)
    {
        // only projects with assigned minters
        require(
            projectHasMinter(_projectId),
            "Project does not have an assigned minter"
        );
        // remove minter for project and emit
        minterForProject.remove(_projectId);
        emit ProjectMinterRemoved(_projectId);
    }

    /**
     * @notice Mint a token from project `_projectId` to `_to`, originally
     * purchased by `sender`.
     * @param _to The new token's owner.
     * @param _projectId Project ID to mint a new token on.
     * @param sender Address purchasing a new token.
     * @return _tokenId Token ID of minted token
     */
    function mint(
        address _to,
        uint256 _projectId,
        address sender
    ) external returns (uint256 _tokenId) {
        // validate minter
        require(
            msg.sender == getMinterForProject(_projectId),
            "Only assigned minter for project"
        );
        // mint
        uint256 tokenId = artblocksContract.mint(_to, _projectId, sender);
        return tokenId;
    }

    /**
     * @notice Gets the assigned minter for project `_projectId`.
     * @param _projectId Project ID to query.
     * @return address Minter address assigned to project `_projectId`
     * @dev requires project to have an assigned minter
     */
    function getMinterForProject(uint256 _projectId)
        public
        view
        returns (address)
    {
        (bool _hasMinter, address _currentMinter) = minterForProject.tryGet(
            _projectId
        );
        require(_hasMinter, "Project does not have an assigned minter");
        return _currentMinter;
    }

    /**
     * @notice Queries if project `_projectId` has an assigned minter.
     * @param _projectId Project ID to query.
     * @return bool true if project has an assigned minter, else false
     * @dev requires project to have an assigned minter
     */
    function projectHasMinter(uint256 _projectId) public view returns (bool) {
        (bool _hasMinter, ) = minterForProject.tryGet(_projectId);
        return _hasMinter;
    }

    /**
     * @notice Gets quantity of projects that have assigned minters.
     * @return uint256 quantity of projects that have assigned minters
     */
    function getNumProjectsWithMinters() external view returns (uint256) {
        return minterForProject.length();
    }

    /**
     * @notice Get project ID and minter address at index `_index` of
     * enumerable map.
     * @param _index enumerable map index to query.
     * @return projectId project ID at index `_index`
     * @return minterAddress minter address for project at index `_index`
     * @dev index must be < quantity of projects that have assigned minters
     */
    function getProjectAndMinterAt(uint256 _index)
        external
        view
        returns (uint256 projectId, address minterAddress)
    {
        return minterForProject.at(_index);
    }
}
