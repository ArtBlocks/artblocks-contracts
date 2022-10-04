// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IGenArt721CoreV2_PBAB.sol";

interface IGenArt721CoreV2_ENGINE_FLEX is IGenArt721CoreV2_PBAB {
    // version and type of the core contract
    // coreVersion is a string of the form "0.x.y"
    function coreVersion() external view returns (string memory);

    // coreType is a string of the form "GenArt721CoreV2_ENGINE_FLEX"
    function coreType() external view returns (string memory);

    // preferredIPFSGateway is a url string
    function preferredIPFSGateway() external view returns (string memory);

    // preferredArweaveGateway is a url string
    function preferredArweaveGateway() external view returns (string memory);

    event ExternalAssetDependencyUpdated(
        uint256 indexed _projectId,
        uint256 indexed _index,
        string _cid,
        ExternalAssetDependencyType _dependencyType,
        uint24 _externalAssetDependencyCount
    );

    event ExternalAssetDependencyRemoved(
        uint256 indexed _projectId,
        uint256 indexed _index
    );

    event GatewayUpdated(
        ExternalAssetDependencyType indexed _dependencyType,
        string _gatewayAddress
    );

    event ProjectExternalAssetDependenciesLocked(uint256 indexed _projectId);

    enum ExternalAssetDependencyType {
        IPFS,
        ARWEAVE
    }
    struct ExternalAssetDependency {
        string cid;
        ExternalAssetDependencyType dependencyType;
    }

    function updateIPFSGateway(string calldata _gateway) external;

    function updateArweaveGateway(string calldata _gateway) external;

    function lockProjectExternalAssetDependencies(uint256 _projectId) external;

    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string calldata _cid,
        ExternalAssetDependencyType _dependencyType
    ) external;

    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string calldata _cid,
        ExternalAssetDependencyType _dependencyType
    ) external;

    function removeProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index
    ) external;

    // getter function of public mapping
    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (ExternalAssetDependency memory);

    // getter function of public mapping length
    function projectExternalAssetDependencyCount(uint256 _projectId)
        external
        view
        returns (uint256);
}
