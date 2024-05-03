// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IGenArt721CoreContractV3_Engine_Flex} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine_Flex.sol";

import {BytecodeStorageWriter, BytecodeStorageReader} from "./BytecodeStorageV2.sol";

/**
 * @title Art Blocks V3 Engine Flex - External Helper Library
 * @notice This library is designed to offload bytecode from the V3 Engine
 * Flex contract. It implements logic that may be accessed via DELEGATECALL for
 * operations related to the V3 Engine Flex contract.
 * @author Art Blocks Inc.
 */

library V3FlexLib {
    using BytecodeStorageWriter for string;
    using BytecodeStorageWriter for bytes;
    // For the purposes of this implementation, due to the limited scope and
    // existing legacy infrastructure, the library emits the events
    // defined in IGenArt721CoreContractV3_Engine_Flex.sol. The events are
    // manually duplicated here
    /**
     * @notice When an external asset dependency is updated or added, this event is emitted.
     * @param _projectId The project ID of the project that was updated.
     * @param _index The index of the external asset dependency that was updated.
     * @param _cid Field that contains the CID of the dependency if IPFS or ARWEAVE,
     * empty string of ONCHAIN, or a string representation of the Art Blocks Dependency
     * Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType The type of the external asset dependency.
     * @param _externalAssetDependencyCount The number of external asset dependencies.
     */
    event ExternalAssetDependencyUpdated(
        uint256 indexed _projectId,
        uint256 indexed _index,
        string _cid,
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType _dependencyType,
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
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType indexed _dependencyType,
        string _gatewayAddress
    );

    /**
     * @notice The project id `_projectId` has had all external asset dependencies locked.
     * @dev This is a one-way operation. Once locked, the external asset dependencies cannot be updated.
     */
    event ProjectExternalAssetDependenciesLocked(uint256 indexed _projectId);

    // position of V3 Flex Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant V3_FLEX_LIB_STORAGE_POSITION =
        keccak256("v3flexlib.storage");

    // project-level variables
    /**
     * Struct used to store a project's currently configured price, and
     * whether or not the price has been configured.
     */
    struct FlexProjectData {
        bool externalAssetDependenciesLocked;
        uint24 externalAssetDependencyCount;
        mapping(uint256 => IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency) externalAssetDependencies;
    }

    // Diamond storage pattern is used in this library
    struct V3FlexLibStorage {
        string preferredIPFSGateway;
        string preferredArweaveGateway;
        mapping(uint256 projectId => FlexProjectData) flexProjectsData;
    }

    /**
     * @notice Updates preferredIPFSGateway to `_gateway`.
     */
    function updateIPFSGateway(string calldata _gateway) external {
        s().preferredIPFSGateway = _gateway;
        emit GatewayUpdated(
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .IPFS,
            _gateway
        );
    }

    /**
     * @notice Updates preferredArweaveGateway to `_gateway`.
     */
    function updateArweaveGateway(string calldata _gateway) external {
        s().preferredArweaveGateway = _gateway;
        emit GatewayUpdated(
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ARWEAVE,
            _gateway
        );
    }

    /**
     * @notice Locks external asset dependencies for project `_projectId`.
     */
    function lockProjectExternalAssetDependencies(uint256 _projectId) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);
        flexProjectData.externalAssetDependenciesLocked = true;
        emit ProjectExternalAssetDependenciesLocked(_projectId);
    }

    /**
     * @notice Updates external asset dependency for project `_projectId`.
     * @dev Making this an external function adds roughly 1% to the gas cost of adding an asset, but
     * significantly reduces the bytecode of contracts using this library.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _cidOrData Field that contains the CID of the dependency if IPFS or ARWEAVE,
     * empty string of ONCHAIN, or a string representation of the Art Blocks Dependency
     * Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType Asset dependency type.
     *  0 - IPFS
     *  1 - ARWEAVE
     *  2 - ONCHAIN
     *  3 - ART_BLOCKS_DEPENDENCY_REGISTRY
     */
    function updateProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index,
        string memory _cidOrData,
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType _dependencyType
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        require(_index < assetCount, "Asset index out of range");
        // @dev dependencyNameAndVersion are not validated against the dependency registry
        // due to limitations of L1 reads on L2 networks at this time

        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency
            storage _oldDependency = flexProjectData.externalAssetDependencies[
                _index
            ];
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType _oldDependencyType = _oldDependency
                .dependencyType;
        // update the asset's dependency type to new value in storage
        flexProjectData
            .externalAssetDependencies[_index]
            .dependencyType = _dependencyType;
        // if the incoming dependency type is onchain, we need to write the data to bytecode
        if (
            _dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN
        ) {
            if (
                _oldDependencyType !=
                IGenArt721CoreContractV3_Engine_Flex
                    .ExternalAssetDependencyType
                    .ONCHAIN
            ) {
                // we only need to set the cid to an empty string if we are replacing an offchain asset
                // an onchain asset will already have an empty cid
                flexProjectData.externalAssetDependencies[_index].cid = "";
            }

            flexProjectData
                .externalAssetDependencies[_index]
                .bytecodeAddress = _cidOrData.writeToBytecode();
            // we don't want to emit data, so we emit the cid as an empty string
            _cidOrData = "";
        } else {
            // incoming dependency type is not ONCHAIN, so we set the cid directly with either
            // the incoming cid or string representation of the dependencyNameAndVersion
            flexProjectData.externalAssetDependencies[_index].cid = _cidOrData;
            // clear any previously populated bytecode address
            // @dev temporarily commented out to confirm that this new test exposes previous bug
            // flexProjectData
            //     .externalAssetDependencies[_index]
            //     .bytecodeAddress = address(0);
        }
        emit ExternalAssetDependencyUpdated(
            _projectId,
            _index,
            _cidOrData,
            _dependencyType,
            assetCount
        );
    }

    /**
     * @notice Updates external asset dependency for project `_projectId` of type
     * ONCHAIN using on-chain compression. This function stores the string
     * in a compressed format on-chain. For reads, the compressed script is
     * decompressed on-chain, ensuring the original text is reconstructed without
     * external dependencies.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _compressedString Pre-compressed string asset to be added.
     */
    function updateProjectExternalAssetDependencyOnChainCompressed(
        uint256 _projectId,
        uint256 _index,
        bytes memory _compressedString
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);

        // check that the index is within the range of the asset count
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        require(_index < assetCount, "Asset index out of range");

        // EFFECTS
        // overwrite the relevant fields of the previous asset, assigning bytecodeAddress directly
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency
            storage currentDependency = flexProjectData
                .externalAssetDependencies[_index];
        currentDependency.cid = "";
        currentDependency.dependencyType = IGenArt721CoreContractV3_Engine_Flex
            .ExternalAssetDependencyType
            .ONCHAIN;
        currentDependency.bytecodeAddress = _compressedString
            .writeToBytecodeCompressed();

        // emit the event
        emit ExternalAssetDependencyUpdated({
            _projectId: _projectId,
            _index: _index,
            _cid: "",
            _dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            _externalAssetDependencyCount: assetCount
        });
    }

    /**
     * @notice Updates external asset dependency for project `_projectId` at
     * index `_index`, with data at BytecodeStorage-compatible address
     * `_assetAddress`.
     * @param _projectId Project to be updated.
     * @param _index Asset index.
     * @param _assetAddress Address of the on-chain asset.
     */
    function updateProjectAssetDependencyOnChainAtAddress(
        uint256 _projectId,
        uint256 _index,
        address _assetAddress
    ) external {
        // CHECKS
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        require(_index < assetCount, "Asset index out of range");

        // EFFECTS
        // overwrite the relevant fields of the previous asset
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency
            storage currentDependency = flexProjectData
                .externalAssetDependencies[_index];
        currentDependency.cid = "";
        currentDependency.dependencyType = IGenArt721CoreContractV3_Engine_Flex
            .ExternalAssetDependencyType
            .ONCHAIN;
        currentDependency.bytecodeAddress = _assetAddress;

        // emit the event
        emit ExternalAssetDependencyUpdated({
            _projectId: _projectId,
            _index: _index,
            _cid: "",
            _dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            _externalAssetDependencyCount: assetCount
        });
    }

    /**
     * @notice Removes external asset dependency for project `_projectId` at index `_index`.
     * Removal is done by swapping the element to be removed with the last element in the array, then deleting this last element.
     * Assets with indices higher than `_index` can have their indices adjusted as a result of this operation.
     * @param _projectId Project to be updated.
     * @param _index Asset index
     */
    function removeProjectExternalAssetDependency(
        uint256 _projectId,
        uint256 _index
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);
        // ensure the index is within the range of the asset count
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        require(_index < assetCount, "Asset index out of range");
        // @dev solidity underflow will revert on the following statement if assetCount is 0
        uint24 lastElementIndex = assetCount - 1;
        // for UX purposes, only allow removal of the last lastElementIndex
        require(_index == lastElementIndex, "Only removal of last asset");

        // @dev simply delete last element; no need to copy last to deleted index due to require statement above

        delete flexProjectData.externalAssetDependencies[lastElementIndex];

        flexProjectData.externalAssetDependencyCount = lastElementIndex;

        emit ExternalAssetDependencyRemoved(_projectId, _index);
    }

    /**
     * @notice Adds external asset dependency for project `_projectId`.
     * @dev Making this an external function adds roughly 1% to the gas cost of adding an asset, but
     * significantly reduces the bytecode of contracts using this library.
     * @param _projectId Project to be updated.
     * @param _cidOrData Field that contains the CID of the dependency if IPFS or ARWEAVE,
     * empty string of ONCHAIN, or a string representation of the Art Blocks Dependency
     * Registry's `dependencyNameAndVersion` if ART_BLOCKS_DEPENDENCY_REGISTRY.
     * @param _dependencyType Asset dependency type.
     *  0 - IPFS
     *  1 - ARWEAVE
     *  2 - ONCHAIN
     *  3 - ART_BLOCKS_DEPENDENCY_REGISTRY
     */
    function addProjectExternalAssetDependency(
        uint256 _projectId,
        string memory _cidOrData,
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType _dependencyType
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);
        // @dev dependencyNameAndVersion are not validated against the dependency registry
        // due to limitations of L1 reads on L2 networks at this time

        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        address _bytecodeAddress = address(0);
        // if the incoming dependency type is onchain, we need to write the data to bytecode
        if (
            _dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN
        ) {
            _bytecodeAddress = _cidOrData.writeToBytecode();
            // we don't want to emit data, so we emit the cid as an empty string
            _cidOrData = "";
        }
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency
            memory asset = IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependency({
                    cid: _cidOrData,
                    dependencyType: _dependencyType,
                    bytecodeAddress: _bytecodeAddress
                });
        flexProjectData.externalAssetDependencies[assetCount] = asset;
        flexProjectData.externalAssetDependencyCount = assetCount + 1;

        emit ExternalAssetDependencyUpdated(
            _projectId,
            assetCount,
            _cidOrData,
            _dependencyType,
            assetCount + 1
        );
    }

    /**
     * @notice Adds external asset dependency for project `_projectId` of type
     * ONCHAIN using on-chain compression. This function stores the string
     * in a compressed format on-chain. For reads, the compressed script is
     * decompressed on-chain, ensuring the original text is reconstructed without
     * external dependencies.
     * @param _projectId Project to be updated.
     * @param _compressedString Pre-compressed string asset to be added.
     */
    function addProjectExternalAssetDependencyOnChainCompressed(
        uint256 _projectId,
        bytes memory _compressedString
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);

        // assign the asset address to the bytecodeAddress directly
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        flexProjectData.externalAssetDependencies[
            assetCount
        ] = IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency({
            cid: "",
            dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            bytecodeAddress: _compressedString.writeToBytecodeCompressed()
        });

        // increment the asset count
        flexProjectData.externalAssetDependencyCount = assetCount + 1;

        // emit event indicating the asset has been added
        emit ExternalAssetDependencyUpdated({
            _projectId: _projectId,
            _index: assetCount,
            _cid: "",
            _dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            _externalAssetDependencyCount: assetCount + 1
        });
    }

    /**
     * @notice Adds an on-chain external asset dependency for project
     * `_projectId`, with data at BytecodeStorage-compatible address
     * `_assetAddress`.
     * @param _projectId Project to be updated.
     * @param _assetAddress  Address of the BytecodeStorageReader-compatible on-chain asset.
     */
    function addProjectAssetDependencyOnChainAtAddress(
        uint256 _projectId,
        address _assetAddress
    ) external {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        _onlyUnlockedProjectExternalAssetDependencies(flexProjectData);

        // assign the asset address to the bytecodeAddress directly
        uint24 assetCount = flexProjectData.externalAssetDependencyCount;
        flexProjectData.externalAssetDependencies[
            assetCount
        ] = IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency({
            cid: "",
            dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            bytecodeAddress: _assetAddress
        });
        // increment the asset count
        flexProjectData.externalAssetDependencyCount = assetCount + 1;
        // emit event indicating the asset has been added
        emit ExternalAssetDependencyUpdated({
            _projectId: _projectId,
            _index: assetCount,
            _cid: "",
            _dependencyType: IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN,
            _externalAssetDependencyCount: assetCount + 1
        });
    }

    /**
     * @notice Returns external asset dependency count for project `_projectId` at index `_index`.
     */
    function projectExternalAssetDependencyCount(
        uint256 _projectId
    ) external view returns (uint256) {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        return uint256(flexProjectData.externalAssetDependencyCount);
    }

    /**
     * @notice Returns external asset dependency for project `_projectId` at index `_index`.
     * If the dependencyType is ONCHAIN, the `data` field will contain the extrated bytecode data and `cid`
     * will be an empty string. Conversly, for any other dependencyType, the `data` field will be an empty string
     * and the `bytecodeAddress` will point to the zero address.
     */
    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    )
        external
        view
        returns (
            IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData
                memory
        )
    {
        FlexProjectData storage flexProjectData = getFlexProjectData(
            _projectId
        );
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependency
            storage _dependency = flexProjectData.externalAssetDependencies[
                _index
            ];
        address _bytecodeAddress = _dependency.bytecodeAddress;

        return
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyWithData({
                    dependencyType: _dependency.dependencyType,
                    cid: _dependency.cid,
                    bytecodeAddress: _bytecodeAddress,
                    data: (_dependency.dependencyType ==
                        IGenArt721CoreContractV3_Engine_Flex
                            .ExternalAssetDependencyType
                            .ONCHAIN)
                        ? BytecodeStorageReader.readFromBytecode(
                            _bytecodeAddress
                        )
                        : ""
                });
    }

    /**
     * @notice Returns the preferred IPFS gateway.
     */
    function preferredIPFSGateway() external view returns (string memory) {
        return s().preferredIPFSGateway;
    }

    /**
     * @notice Returns the preferred Arweave gateway.
     */
    function preferredArweaveGateway() external view returns (string memory) {
        return s().preferredArweaveGateway;
    }

    /**
     * @notice Loads the FlexProjectData for a given project.
     * @param projectId Project Id to get FlexProjectData for
     */
    function getFlexProjectData(
        uint256 projectId
    ) internal view returns (FlexProjectData storage) {
        return s().flexProjectsData[projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The V3FlexLibStorage struct.
     */
    function s()
        internal
        pure
        returns (V3FlexLibStorage storage storageStruct)
    {
        bytes32 position = V3_FLEX_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }

    function _onlyUnlockedProjectExternalAssetDependencies(
        FlexProjectData storage flexProjectData
    ) private view {
        require(
            !flexProjectData.externalAssetDependenciesLocked,
            "External dependencies locked"
        );
    }
}
