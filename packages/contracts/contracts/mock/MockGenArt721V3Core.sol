// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine_Flex.sol";

/**
 * @title Mock GenArt721V3 Core Contract for E2E Testing
 * @author Art Blocks Inc.
 * @notice This is a minimal mock implementation of GenArt721CoreV3_Engine_Flex
 * for e2e integration testing on testnets.
 * @dev This contract simulates a single project (project 0) with 10 tokens (0-9)
 * that return deterministic hashes based on token ID.
 */
contract MockGenArt721V3Core {
    // Constants
    uint256 constant ONE_MILLION = 1_000_000;
    uint256 constant PROJECT_ID = 0;
    uint256 constant MAX_TOKENS = 10;

    // Core type and version - simulating v3.2.5 Engine Flex
    string public constant coreVersion = "v3.2.5";
    string public constant coreType = "GenArt721CoreV3_Engine_Flex";

    // Gateway preferences
    string private _preferredIPFSGateway = "https://ipfs.io/ipfs/";
    string private _preferredArweaveGateway = "https://arweave.net/";

    // Mock project script data
    string private _scriptTypeAndVersion = "p5js@1.0.0";
    string private _aspectRatio = "1";
    string[] private _projectScripts;

    // Mock external asset dependencies
    ExternalAssetDependency[] private _externalAssetDependencies;

    // External asset dependency struct (matching IGenArt721CoreContractV3_Engine_Flex)
    // @dev For ONCHAIN type: cid is empty string, data contains the bytecode content
    struct ExternalAssetDependency {
        string cid;
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType dependencyType;
        address bytecodeAddress;
        string data; // For ONCHAIN type, this holds the data (e.g., "#web3call_contract#")
    }

    constructor() {
        // Initialize with a sample script
        _projectScripts.push("// Sample p5.js script\nfunction setup() { createCanvas(400, 400); }\nfunction draw() { background(tokenData.hash); }");
        
        // Initialize with a sample ONCHAIN external asset dependency
        // This simulates having a PMP contract as an external dependency
        // @dev For ONCHAIN type: cid is empty string, data is "#web3call_contract#"
        _externalAssetDependencies.push(ExternalAssetDependency({
            cid: "", // Empty string for ONCHAIN type per interface spec
            dependencyType: IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType.ONCHAIN,
            bytecodeAddress: address(0), // Will be set during deployment if needed
            data: "#web3call_contract#" // The web3call marker for ONCHAIN dependencies
        }));
    }

    // =========================================================================
    // Token Hash Functions
    // =========================================================================

    /**
     * @notice Returns deterministic hash for token ID.
     * @param _tokenId Token ID to query.
     * @return bytes32 Deterministic hash based on token ID.
     * @dev Hash is keccak256 of ("MockGenArt721V3Core", tokenId) for determinism.
     */
    function tokenIdToHash(uint256 _tokenId) external pure returns (bytes32) {
        // Validate token exists (project 0, tokens 0-9)
        require(_tokenId < MAX_TOKENS, "Token does not exist");
        // Return deterministic hash
        return keccak256(abi.encode("MockGenArt721V3Core", _tokenId));
    }

    /**
     * @notice Returns the project ID for a given token ID.
     * @param _tokenId Token ID to query.
     * @return uint256 Project ID (always 0 for this mock).
     */
    function tokenIdToProjectId(uint256 _tokenId) external pure returns (uint256) {
        return _tokenId / ONE_MILLION;
    }

    // =========================================================================
    // Project Script Functions
    // =========================================================================

    /**
     * @notice Returns script details for a project.
     * @param _projectId Project ID to query.
     * @return scriptTypeAndVersion Script type and version string.
     * @return aspectRatio Project aspect ratio.
     * @return scriptCount Number of scripts in the project.
     */
    function projectScriptDetails(
        uint256 _projectId
    )
        external
        view
        returns (
            string memory scriptTypeAndVersion,
            string memory aspectRatio,
            uint256 scriptCount
        )
    {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return (_scriptTypeAndVersion, _aspectRatio, _projectScripts.length);
    }

    /**
     * @notice Returns script information for a project.
     * @param _projectId Project ID to query.
     * @return scriptTypeAndVersion Script type and version string.
     * @return aspectRatio Project aspect ratio.
     * @return scriptCount Number of scripts in the project.
     * @dev This is an alias for projectScriptDetails for backwards compatibility.
     */
    function projectScriptInfo(
        uint256 _projectId
    )
        external
        view
        returns (
            string memory scriptTypeAndVersion,
            string memory aspectRatio,
            uint256 scriptCount
        )
    {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return (_scriptTypeAndVersion, _aspectRatio, _projectScripts.length);
    }

    /**
     * @notice Returns script at a given index for a project.
     * @param _projectId Project ID to query.
     * @param _index Script index.
     * @return string Script content.
     */
    function projectScriptByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (string memory) {
        require(_projectId == PROJECT_ID, "Project does not exist");
        require(_index < _projectScripts.length, "Script index out of bounds");
        return _projectScripts[_index];
    }

    /**
     * @notice Returns bytecode address for script at a given index.
     * @param _projectId Project ID to query.
     * @param _index Script index.
     * @return address Bytecode address (returns address(0) for this mock).
     */
    function projectScriptBytecodeAddressByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (address) {
        require(_projectId == PROJECT_ID, "Project does not exist");
        require(_index < _projectScripts.length, "Script index out of bounds");
        // Mock doesn't use bytecode storage
        return address(0);
    }

    // =========================================================================
    // External Asset Dependency Functions
    // =========================================================================

    /**
     * @notice Returns count of external asset dependencies for a project.
     * @param _projectId Project ID to query.
     * @return uint256 Count of external asset dependencies.
     */
    function projectExternalAssetDependencyCount(
        uint256 _projectId
    ) external view returns (uint256) {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return _externalAssetDependencies.length;
    }

    /**
     * @notice Returns external asset dependency at a given index for a project.
     * @param _projectId Project ID to query.
     * @param _index Dependency index.
     * @return ExternalAssetDependencyWithData The external asset dependency data.
     * @dev For ONCHAIN type: cid is empty string, data contains the bytecode content
     * (e.g., "#web3call_contract#" for web3call contracts)
     */
    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData memory) {
        require(_projectId == PROJECT_ID, "Project does not exist");
        require(_index < _externalAssetDependencies.length, "Dependency index out of bounds");
        
        ExternalAssetDependency storage dep = _externalAssetDependencies[_index];
        return IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData({
            cid: dep.cid, // Empty string for ONCHAIN type
            dependencyType: dep.dependencyType,
            bytecodeAddress: dep.bytecodeAddress,
            data: dep.data // "#web3call_contract#" for ONCHAIN web3call dependencies
        });
    }

    // =========================================================================
    // Gateway Preference Functions
    // =========================================================================

    /**
     * @notice Returns the preferred IPFS gateway URL.
     * @return string The preferred IPFS gateway.
     */
    function preferredIPFSGateway() external view returns (string memory) {
        return _preferredIPFSGateway;
    }

    /**
     * @notice Returns the preferred Arweave gateway URL.
     * @return string The preferred Arweave gateway.
     */
    function preferredArweaveGateway() external view returns (string memory) {
        return _preferredArweaveGateway;
    }

    // =========================================================================
    // Admin Functions (for testing setup)
    // =========================================================================

    /**
     * @notice Sets the external asset dependency bytecode address.
     * @param _index Index of the dependency to update.
     * @param _bytecodeAddress The bytecode address (e.g., PMP contract address).
     * @dev This is used during testing to link the mock PMP contract.
     */
    function setExternalAssetDependencyBytecodeAddress(
        uint256 _index,
        address _bytecodeAddress
    ) external {
        require(_index < _externalAssetDependencies.length, "Index out of bounds");
        _externalAssetDependencies[_index].bytecodeAddress = _bytecodeAddress;
    }

    /**
     * @notice Adds a new external asset dependency.
     * @param _cid CID or identifier for the dependency (empty for ONCHAIN type).
     * @param _dependencyType Type of the dependency.
     * @param _bytecodeAddress Bytecode address if ONCHAIN type.
     * @param _data Data content for ONCHAIN type (e.g., "#web3call_contract#").
     */
    function addExternalAssetDependency(
        string memory _cid,
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType _dependencyType,
        address _bytecodeAddress,
        string memory _data
    ) external {
        _externalAssetDependencies.push(ExternalAssetDependency({
            cid: _cid,
            dependencyType: _dependencyType,
            bytecodeAddress: _bytecodeAddress,
            data: _data
        }));
    }

    /**
     * @notice Adds a project script.
     * @param _script The script content to add.
     */
    function addProjectScript(string memory _script) external {
        _projectScripts.push(_script);
    }

    /**
     * @notice Sets the preferred IPFS gateway.
     * @param _gateway The new gateway URL.
     */
    function setPreferredIPFSGateway(string memory _gateway) external {
        _preferredIPFSGateway = _gateway;
    }

    /**
     * @notice Sets the preferred Arweave gateway.
     * @param _gateway The new gateway URL.
     */
    function setPreferredArweaveGateway(string memory _gateway) external {
        _preferredArweaveGateway = _gateway;
    }

    // =========================================================================
    // Additional Interface Functions (commonly expected)
    // =========================================================================

    /**
     * @notice Returns the starting project ID for this contract.
     * @return uint256 Starting project ID (always 0 for this mock).
     */
    function startingProjectId() external pure returns (uint256) {
        return 0;
    }

    /**
     * @notice Returns the next project ID for this contract.
     * @return uint256 Next project ID (always 1 for this mock, since we have project 0).
     */
    function nextProjectId() external pure returns (uint256) {
        return 1;
    }

    /**
     * @notice Returns project details.
     * @param _projectId Project ID to query.
     * @return projectName Project name.
     * @return artist Artist name.
     * @return description Project description.
     * @return website Project website.
     * @return license Project license.
     */
    function projectDetails(
        uint256 _projectId
    )
        external
        pure
        returns (
            string memory projectName,
            string memory artist,
            string memory description,
            string memory website,
            string memory license
        )
    {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return (
            "Mock Project",
            "Mock Artist",
            "A mock project for e2e testing",
            "https://artblocks.io",
            "MIT"
        );
    }

    /**
     * @notice Returns project state data.
     * @param _projectId Project ID to query.
     * @return invocations Current invocation count.
     * @return maxInvocations Maximum invocations.
     * @return active Whether project is active.
     * @return paused Whether project is paused.
     * @return completedTimestamp Completion timestamp.
     * @return locked Whether project is locked.
     */
    function projectStateData(
        uint256 _projectId
    )
        external
        pure
        returns (
            uint256 invocations,
            uint256 maxInvocations,
            bool active,
            bool paused,
            uint256 completedTimestamp,
            bool locked
        )
    {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return (
            MAX_TOKENS, // invocations
            MAX_TOKENS, // maxInvocations
            true,       // active
            false,      // paused
            0,          // completedTimestamp (not completed)
            false       // locked
        );
    }

    /**
     * @notice Returns the artist address for a project.
     * @param _projectId Project ID to query.
     * @return address The artist address (returns address(0) for mock).
     */
    function projectIdToArtistAddress(
        uint256 _projectId
    ) external pure returns (address payable) {
        require(_projectId == PROJECT_ID, "Project does not exist");
        return payable(address(0));
    }
}
