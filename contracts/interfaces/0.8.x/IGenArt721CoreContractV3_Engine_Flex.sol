// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import "./IAdminACLV0.sol";
import "./IGenArt721CoreContractV3_Engine.sol";

interface IGenArt721CoreContractV3_Engine_Flex is
    IGenArt721CoreContractV3_Engine
{
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
        ARWEAVE,
        ONCHAIN
    }

    struct ExternalAssetDependency {
        string cid;
        ExternalAssetDependencyType dependencyType;
        address bytecodeAddress;
    }

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

    function updateIPFSGateway(string calldata _gateway) external;

    function updateArweaveGateway(string calldata _gateway) external;

    function lockProjectExternalAssetDependencies(uint256 _projectId) external;

    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string memory _cidOrData,
        ExternalAssetDependencyType _dependencyType
    ) external;

    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string memory _cidOrData,
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
    ) external view returns (ExternalAssetDependencyWithData memory);

    // getter function of public mapping length
    function projectExternalAssetDependencyCount(
        uint256 _projectId
    ) external view returns (uint256);
}
