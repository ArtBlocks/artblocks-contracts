// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";
import "./IGenArt721CoreContractV3_Engine.sol";

/**
 * @title This interface is intended to house interface items that are common
 * across all GenArt721CoreContractV3 Engine Flex and derivative implementations.
 * @author Art Blocks Inc.
 */
interface IGenArt721CoreContractV3_Engine_Flex is
    IGenArt721CoreContractV3_Engine
{
    /**
     * @notice When an external asset dependency is updated or added, this event is emitted.
     * @param _projectId The project ID of the project that was updated.
     * @param _index The index of the external asset dependency that was updated.
     * @param _cid Field that contains the CID of the dependency if IPFS or ARWEAVE, empty string of ONCHAIN, or a string representation
     * of the Art Blocks Dependency Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType The type of the external asset dependency.
     * @param _externalAssetDependencyCount The number of external asset dependencies.
     */
    event ExternalAssetDependencyUpdated(
        uint256 indexed _projectId,
        uint256 indexed _index,
        string _cid,
        ExternalAssetDependencyType _dependencyType,
        uint24 _externalAssetDependencyCount
    );

    /**
     * @notice The project id `_projectId` has had an external asset dependency removed at index `_index`.
     */
    event ExternalAssetDependencyRemoved(
        uint256 indexed _projectId,
        uint256 indexed _index
    );

    /**
     * @notice The preferred gateway for dependency type `_dependencyType` has been updated to `_gatewayAddress`.
     */
    event GatewayUpdated(
        ExternalAssetDependencyType indexed _dependencyType,
        string _gatewayAddress
    );

    /**
     * @notice The project id `_projectId` has had all external asset dependencies locked.
     * @dev This is a one-way operation. Once locked, the external asset dependencies cannot be updated.
     */
    event ProjectExternalAssetDependenciesLocked(uint256 indexed _projectId);

    /**
     * @notice An external asset dependency type. Can be one of IPFS, ARWEAVE, ONCHAIN, or ART_BLOCKS_DEPENDENCY_REGISTRY.
     */
    enum ExternalAssetDependencyType {
        IPFS,
        ARWEAVE,
        ONCHAIN,
        ART_BLOCKS_DEPENDENCY_REGISTRY
    }

    /**
     * @notice Project storage that relate to Flex data.
     */
    struct ProjectFlex {
        bool externalAssetDependenciesLocked;
        uint24 externalAssetDependencyCount;
        mapping(uint256 => ExternalAssetDependency) externalAssetDependencies;
    }

    /**
     * @notice An external asset dependency, without the retrieved data of any ONCHAIN assets. This reflects what is
     * stored in this contract's storage.
     * @param CID field that contains the CID of the dependency if IPFS or ARWEAVE, empty string of ONCHAIN, or a string representation
     * of the Art Blocks Dependency Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param dependencyType field that contains the type of the dependency.
     * @param bytecodeAddress field that contains the address of the bytecode for this dependency if ONCHAIN, null address otherwise.
     */
    struct ExternalAssetDependency {
        string cid;
        ExternalAssetDependencyType dependencyType;
        address bytecodeAddress;
    }

    /**
     * @notice An external asset dependency with data. This is a convenience struct.
     * @param CID field that contains the CID of the dependency if IPFS or ARWEAVE, empty string of ONCHAIN, or a string representation
     * of the Art Blocks Dependency Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param dependencyType field that contains the type of the dependency.
     * @param bytecodeAddress field that contains the address of the bytecode for this dependency if ONCHAIN, null address otherwise.
     * @param data field that contains the data retrieved from this bytecode address if ONCHAIN, empty string otherwise.
     */
    struct ExternalAssetDependencyWithData {
        string cid;
        ExternalAssetDependencyType dependencyType;
        address bytecodeAddress;
        string data;
    }

    // preferredIPFSGateway is a url string
    function preferredIPFSGateway() external view returns (string memory);

    // preferredArweaveGateway is a url string
    function preferredArweaveGateway() external view returns (string memory);

    // updates the preferred IPFS gateway
    function updateIPFSGateway(string calldata _gateway) external;

    // updates the preferred Arweave gateway
    function updateArweaveGateway(string calldata _gateway) external;

    // locks the external asset dependencies for a project
    function lockProjectExternalAssetDependencies(uint256 _projectId) external;

    // updates the external asset dependency for a project at a given index
    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) external;

    // adds an external asset dependency for a project
    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) external;

    // removes an external asset dependency for a project at a given index
    function removeProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index
    ) external;

    // getter function for project external asset dependencies
    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (ExternalAssetDependencyWithData memory);

    // getter function project external asset dependency count
    function projectExternalAssetDependencyCount(
        uint256 _projectId
    ) external view returns (uint256);
}
