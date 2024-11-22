// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import "../interfaces/v0.8.x/IDependencyRegistryV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreProjectScriptV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreProjectScriptV1.sol";
import "../interfaces/v0.8.x/IGenArt721CoreTokenHashProviderV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreTokenHashProviderV1.sol";
import "../interfaces/v0.8.x/IGenArt721GeneratorV0.sol";
import {IGenArt721CoreContractV3_Engine_Flex} from "../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine_Flex.sol";
import {IUniversalBytecodeStorageReader} from "../interfaces/v0.8.x/IUniversalBytecodeStorageReader.sol";
import "../libs/v0.8.x/Bytes32Strings.sol";
import {JsonStatic} from "../libs/v0.8.x/JsonStatic.sol";
import {ABHelpers} from "../libs/v0.8.x/ABHelpers.sol";
import {AddressChunks} from "./AddressChunks.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";
import "@openzeppelin-4.8/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IScriptyBuilderV2, HTMLRequest, HTMLTagType, HTMLTag} from "scripty.sol/contracts/scripty/interfaces/IScriptyBuilderV2.sol";

// @dev legacy interface for V2 flex contracts - used to get external legacy asset dependencies
interface ILegacyGenArt721CoreV2_PBAB_Flex {
    enum LegacyExternalAssetDependencyType {
        IPFS,
        ARWEAVE
    }
    // legacy struct for V2 flex contracts
    struct LegacyExternalAssetDependencyWithoutData {
        string cid;
        LegacyExternalAssetDependencyType dependencyType;
    }

    function projectExternalAssetDependencyByIndex(
        uint256 _projectId,
        uint256 _index
    ) external view returns (LegacyExternalAssetDependencyWithoutData memory);
}

/**
 * @title GenArt721GeneratorV0
 * @author Art Blocks Inc.
 * @notice This contract is used to generate the HTML for Art Blocks tokens
 * by combining the dependency script, project script, token data. It utilizes
 * the ScriptyBuilder contract to generate the HTML.
 */
contract GenArt721GeneratorV0 is Initializable, IGenArt721GeneratorV0 {
    using Bytes32Strings for bytes32;
    using Bytes32Strings for string;
    using JsonStatic for JsonStatic.Json;

    // @dev This is an upgradable contract so we need to maintain
    // the order of the variables to ensure we don't overwrite
    // storage when upgrading.
    IDependencyRegistryV0 public dependencyRegistry;
    IScriptyBuilderV2 public scriptyBuilder;
    address public gunzipScriptBytecodeAddress;
    IUniversalBytecodeStorageReader public universalBytecodeStorageReader;

    function _onlySupportedCoreContract(address coreContract) internal view {
        require(
            dependencyRegistry.isSupportedCoreContract(coreContract),
            "Unsupported core contract"
        );
    }

    function _onlyDependencyRegistryAdminACL(bytes4 selector) internal {
        require(
            dependencyRegistry.adminACLAllowed({
                sender: msg.sender,
                contract_: address(this),
                selector: selector
            }),
            "Only DependencyRegistry AdminACL"
        );
    }

    /**
     * @notice Initializer for the GenArt721GeneratorV0 contract.
     * @param _dependencyRegistry The address of the DependencyRegistry
     * contract to be used for retrieving dependency scripts.
     * @param _scriptyBuilder The address of the ScriptyBuilderV2 contract
     * to be used for generating the HTML for tokens.
     * @param _gunzipScriptBytecodeAddress The address of the gunzip script bytecode
     * storage contract used to gunzip the dependency scripts in the browser.
     * @param _universalBytecodeStorageReader The address of the universal bytecode storage reader contract.
     */
    function initialize(
        address _dependencyRegistry,
        address _scriptyBuilder,
        address _gunzipScriptBytecodeAddress,
        address _universalBytecodeStorageReader
    ) public initializer {
        dependencyRegistry = IDependencyRegistryV0(_dependencyRegistry);
        scriptyBuilder = IScriptyBuilderV2(_scriptyBuilder);
        gunzipScriptBytecodeAddress = _gunzipScriptBytecodeAddress;
        universalBytecodeStorageReader = IUniversalBytecodeStorageReader(
            _universalBytecodeStorageReader
        );

        emit DependencyRegistryUpdated(_dependencyRegistry);
        emit ScriptyBuilderUpdated(_scriptyBuilder);
        emit GunzipScriptBytecodeAddressUpdated(_gunzipScriptBytecodeAddress);
        emit UniversalBytecodeStorageReaderUpdated(
            _universalBytecodeStorageReader
        );
    }

    /**
     * @notice Set the DependencyRegistry contract address.
     * @param _dependencyRegistry The address of the DependencyRegistry
     * contract to be used for retrieving dependency scripts.
     * @dev This function is gated to only the DependencyRegistry AdminACL.
     * If an address is passed that does not implement the adminACLAllowed
     * function, we will lose access to the write functions on this contract.
     */
    function updateDependencyRegistry(address _dependencyRegistry) external {
        _onlyDependencyRegistryAdminACL(this.updateDependencyRegistry.selector);

        dependencyRegistry = IDependencyRegistryV0(_dependencyRegistry);
        emit DependencyRegistryUpdated(_dependencyRegistry);
    }

    /**
     * @notice Set the ScriptyBuilder contract address.
     * @param _scriptyBuilder The address of the ScriptyBuilderV2 contract
     * to be used for generating the HTML for tokens.
     * @dev This function is gated to only the DependencyRegistry AdminACL.
     */
    function updateScriptyBuilder(address _scriptyBuilder) external {
        _onlyDependencyRegistryAdminACL(this.updateScriptyBuilder.selector);

        scriptyBuilder = IScriptyBuilderV2(_scriptyBuilder);
        emit ScriptyBuilderUpdated(_scriptyBuilder);
    }

    /**
     * @notice Set the gunzip script address.
     * @param _gunzipScriptBytecodeAddress The address of the gunzip script bytecode
     * storage contract used to gunzip the dependency scripts in the browser.
     * @dev This function is gated to only the DependencyRegistry AdminACL.
     */
    function updateGunzipScriptBytecodeAddress(
        address _gunzipScriptBytecodeAddress
    ) external {
        _onlyDependencyRegistryAdminACL(
            this.updateGunzipScriptBytecodeAddress.selector
        );

        gunzipScriptBytecodeAddress = _gunzipScriptBytecodeAddress;
        emit GunzipScriptBytecodeAddressUpdated(_gunzipScriptBytecodeAddress);
    }

    /**
     * @notice Set the universalBytecodeStorageReader contract address.
     * @param _universalBytecodeStorageReader The address of the universal bytecode storage reader contract.
     * @dev This function is gated to only the DependencyRegistry AdminACL.
     */
    function updateUniversalBytecodeStorageReader(
        address _universalBytecodeStorageReader
    ) external {
        _onlyDependencyRegistryAdminACL(
            this.updateUniversalBytecodeStorageReader.selector
        );

        universalBytecodeStorageReader = IUniversalBytecodeStorageReader(
            _universalBytecodeStorageReader
        );
        emit UniversalBytecodeStorageReaderUpdated(
            _universalBytecodeStorageReader
        );
    }

    /**
     * @notice Get the dependency script for a given dependency name and version string.
     * @param dependencyNameAndVersion The name and version of the dependency
     * to retrieve the script for.
     * @return The dependency script stiched together from all of the script chunks as a string.
     * @dev This function will revert if the dependency name and version is not
     * supported by the DependencyRegistry or if the script storage version is
     * not supported.
     */
    function getDependencyScript(
        string memory dependencyNameAndVersion
    ) external view returns (string memory) {
        bytes memory dependencyScript = _getDependencyScriptBytes(
            dependencyNameAndVersion.stringToBytes32()
        );

        return string(dependencyScript);
    }

    /**
     * @notice Get the project script for a given core contract address and
     * project ID.
     * @param coreContract The address of the core contract to retrieve
     * the project script from.
     * @param projectId The ID of the project to retrieve the script for.
     * @return The project script stiched together from all of the script chunks as a string.
     * @dev This function will revert if the core contract address is not
     * supported by the DependencyRegistry or if the contract at the address
     * does not implement the IGenArt721CoreProjectScriptV0 or IGenArt721CoreProjectScriptV1.
     */
    function getProjectScript(
        address coreContract,
        uint256 projectId
    ) external view returns (string memory) {
        bytes memory projectScript = _getProjectScriptBytes(
            coreContract,
            projectId
        );

        return string(projectScript);
    }

    /**
     * @notice Get the data URI for the HTML for a given token (e.g. data:text/html;base64,[html])
     * @param coreContract The address of the core contract the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTML for.
     * @return The data URI for the HTML for the token.
     */
    function getTokenHtmlBase64EncodedDataUri(
        address coreContract,
        uint256 tokenId
    ) external view returns (string memory) {
        HTMLRequest memory htmlRequest = _getTokenHtmlRequest(
            coreContract,
            tokenId
        );
        string memory base64EncodedHTMLDataURI = scriptyBuilder
            .getEncodedHTMLString(htmlRequest);

        return base64EncodedHTMLDataURI;
    }

    /**
     * @notice Get the HTML for a given token.
     * @param coreContract The address of the core contract the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTML for.
     * @return The HTML for the token.
     */
    function getTokenHtml(
        address coreContract,
        uint256 tokenId
    ) external view returns (string memory) {
        HTMLRequest memory htmlRequest = _getTokenHtmlRequest(
            coreContract,
            tokenId
        );
        string memory html = scriptyBuilder.getHTMLString(htmlRequest);

        return html;
    }

    /**
     * @notice Get the dependency script for a given dependency name and version.
     * @param dependencyNameAndVersion The name and version of the dependency
     * to retrieve the script for.
     * @return The dependency script stiched together from all of the script chunks.
     * @dev This function will revert if the dependency name and version is not
     * supported by the DependencyRegistry or if the script storage version is
     * not supported.
     */
    function _getDependencyScriptBytes(
        bytes32 dependencyNameAndVersion
    ) internal view returns (bytes memory) {
        uint256 scriptCount = dependencyRegistry.getDependencyScriptCount(
            dependencyNameAndVersion
        );

        if (scriptCount == 0) {
            return "";
        }

        address[] memory scriptBytecodeAddresses = new address[](scriptCount);

        for (uint256 i = 0; i < scriptCount; i++) {
            scriptBytecodeAddresses[i] = dependencyRegistry
                .getDependencyScriptBytecodeAddress(
                    dependencyNameAndVersion,
                    i
                );
        }

        // @dev We concatenate the script chunks together with assembly
        // in AddressChunks for gas efficiency.
        return
            AddressChunks.mergeChunks(
                scriptBytecodeAddresses,
                address(universalBytecodeStorageReader)
            );
    }

    /**
     * @notice Get the project script for a given core contract address and
     * project ID.
     * @param coreContract The address of the core contract to retrieve
     * the project script from.
     * @param projectId The ID of the project to retrieve the script for.
     * @return The project script stiched together from all of the script chunks.
     * @dev This function will revert if the core contract address is not
     * supported by the DependencyRegistry or if the contract at the address
     * does not implement the IGenArt721CoreProjectScriptV0 or IGenArt721CoreProjectScriptV1.
     */
    function _getProjectScriptBytes(
        address coreContract,
        uint256 projectId
    ) internal view returns (bytes memory) {
        _onlySupportedCoreContract(coreContract);

        // @dev Attempt to get project script info from V3 and up core contracts first.
        try
            IGenArt721CoreProjectScriptV1(coreContract).projectScriptDetails(
                projectId
            )
        returns (string memory, string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            address[] memory scriptBytecodeAddresses = new address[](
                scriptCount
            );

            for (uint256 i = 0; i < scriptCount; i++) {
                scriptBytecodeAddresses[i] = IGenArt721CoreProjectScriptV1(
                    coreContract
                ).projectScriptBytecodeAddressByIndex(projectId, i);
            }

            // @dev We concatenate the script chunks together with assembly
            // in AddressChunks for gas efficiency.
            return
                AddressChunks.mergeChunks(
                    scriptBytecodeAddresses,
                    address(universalBytecodeStorageReader)
                );
        } catch {
            // Noop try again for older contracts.
        }

        // @dev If we failed to get the project script info try again using the interface
        // for V2 and older core contracts.
        try
            IGenArt721CoreProjectScriptV0(coreContract).projectScriptInfo(
                projectId
            )
        returns (string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            string memory script;
            for (uint256 i = 0; i < scriptCount; i++) {
                string memory scriptChunk = IGenArt721CoreProjectScriptV0(
                    coreContract
                ).projectScriptByIndex(projectId, i);
                script = string.concat(script, scriptChunk);
            }

            return bytes(script);
        } catch {
            revert("Unable to retrieve project script info");
        }
    }

    /**
     * @notice Get the isFlex status for a given core contract.
     * @dev uses the existence of preferredIPFSGateway function as indicator for flex contracts.
     * @param coreContract The core contract address to check if it is a flex contract.
     */
    function _getIsFlex(address coreContract) internal view returns (bool) {
        try
            // @dev all flex (V2, V3) contracts have this function, so use as isFlex indicator
            IGenArt721CoreContractV3_Engine_Flex(coreContract)
                .preferredIPFSGateway()
        returns (string memory) {
            // if contract did not revert, interpret it is a flex contract
            return true;
        } catch {
            // if contract reverted, interpret it is not a flex contract
            return false;
        }
    }

    function _getProjectExternalAssetDependencyByIndex(
        address coreContract,
        uint256 projectId,
        uint256 index
    )
        internal
        view
        returns (
            IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData
                memory
        )
    {
        // check if a V2 flex contract
        // @dev acknowledge that this could be function input parameter to avoid one call per dependency, but
        // stack to deep error limits memoization opportunity in functions calling this function
        // @dev all flex (V2, V3) contracts have the function coreType(),
        // and all V2 flex contracts have the coreType "GenArt721CoreV2_ENGINE_FLEX"
        string memory coreType = IGenArt721CoreContractV3_Engine_Flex(
            coreContract
        ).coreType();
        bool isV2Flex = keccak256(abi.encodePacked(coreType)) ==
            keccak256(abi.encodePacked("GenArt721CoreV2_ENGINE_FLEX"));

        // pre-allocate generic externalAssetDependencyWithData to avoid dynamic memory allocation
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData
            memory externalAssetDependencyWithData = IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyWithData({
                    cid: "",
                    dependencyType: IGenArt721CoreContractV3_Engine_Flex
                        .ExternalAssetDependencyType
                        .IPFS, // default to IPFS, index 0 of enum
                    bytecodeAddress: address(0),
                    data: ""
                });
        // @dev flex V2 and V3 have different return types for the function projectExternalAssetDependencyByIndex - must branch logic
        // @dev reference change in return type between V2 and V3 here: https://github.com/ArtBlocks/artblocks-contracts/pull/450
        if (isV2Flex) {
            ILegacyGenArt721CoreV2_PBAB_Flex.LegacyExternalAssetDependencyWithoutData
                memory legacyExternalAssetDependencyWithoutData = ILegacyGenArt721CoreV2_PBAB_Flex(
                    coreContract
                ).projectExternalAssetDependencyByIndex({
                        _projectId: projectId,
                        _index: index
                    });
            // populate external asset dependency json object
            externalAssetDependencyWithData
                .cid = legacyExternalAssetDependencyWithoutData.cid;
            // @dev legacy external asset dependency types are a subset of V3 external asset dependency types,
            // so we can safely cast the legacy type to the V3 type
            externalAssetDependencyWithData
                .dependencyType = IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType(
                    uint256(
                        legacyExternalAssetDependencyWithoutData.dependencyType
                    )
                );
            // leave data as empty string - V2 contracts do not support data
        } else {
            externalAssetDependencyWithData = IGenArt721CoreContractV3_Engine_Flex(
                coreContract
            ).projectExternalAssetDependencyByIndex({
                    _projectId: projectId,
                    _index: index
                });
        }
        return externalAssetDependencyWithData;
    }

    /**
     * @notice Get the token data for a given token.
     * @param coreContract The core contract address the token belongs to.
     * @param tokenId The ID of the token to retrieve the data for.
     * @return tokenDataJson The token data as a JSON string as bytes.
     */
    function _getTokenData(
        address coreContract,
        uint256 tokenId
    ) internal view returns (bytes memory tokenDataJson) {
        // @dev Attempt to get token hash from V1 and up core contracts first.
        (bytes32 tokenHash, bool isV0CoreContract) = _getTokenHash(
            coreContract,
            tokenId
        );
        // get any flex assets
        bool isFlex = _getIsFlex({coreContract: coreContract});

        // build tokenData json object
        string[] memory tokenDataKeys = isFlex
            ? JsonStatic.newKeysArray(5)
            : JsonStatic.newKeysArray(2);
        JsonStatic.Json[] memory tokenDataValues = isFlex
            ? JsonStatic.newValuesArray(5)
            : JsonStatic.newValuesArray(2);

        // token id
        tokenDataKeys[0] = "tokenId";
        tokenDataValues[0] = JsonStatic.newStringElement({
            value: Strings.toString(tokenId),
            stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
        });

        // token hash
        if (isV0CoreContract) {
            // @dev V0 contracts return an array of hashes, with only one hash
            tokenDataKeys[1] = "hashes";
            JsonStatic.Json[] memory tokenDataValuesHashes = JsonStatic
                .newValuesArray(1);
            tokenDataValuesHashes[0] = JsonStatic.newStringElement({
                value: Strings.toHexString(uint256(tokenHash)),
                stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
            });
            tokenDataValues[1] = JsonStatic.newArrayElement({
                values: tokenDataValuesHashes
            });
        } else {
            tokenDataKeys[1] = "hash";
            tokenDataValues[1] = JsonStatic.newStringElement({
                value: Strings.toHexString(uint256(tokenHash)),
                stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
            });
        }

        // flex contracts have additional fields
        if (isFlex) {
            // preferredIPFSGateway
            tokenDataKeys[2] = "preferredArweaveGateway";
            // @dev all flex (V2, V3) contracts have the function preferredArweaveGateway()
            tokenDataValues[2] = JsonStatic.newStringElement({
                value: IGenArt721CoreContractV3_Engine_Flex(coreContract)
                    .preferredArweaveGateway(),
                stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
            });

            // preferredArweaveGateway
            tokenDataKeys[3] = "preferredIPFSGateway";
            // @dev all flex (V2, V3) contracts have the function preferredIPFSGateway()
            tokenDataValues[3] = JsonStatic.newStringElement({
                value: IGenArt721CoreContractV3_Engine_Flex(coreContract)
                    .preferredIPFSGateway(),
                stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
            });

            // externalAssetDependencies (variable length array)
            tokenDataKeys[4] = "externalAssetDependencies";
            // @dev pre-allocate array to avoid dynamic memory allocation of variable-length array
            uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
            // @dev all flex (V2, V3) contracts have the function projectExternalAssetDependencyCount()
            uint256 externalAssetDependencyCount = IGenArt721CoreContractV3_Engine_Flex(
                    coreContract
                ).projectExternalAssetDependencyCount(projectId);
            JsonStatic.Json[] memory externalAssetDependencies = JsonStatic
                .newValuesArray(externalAssetDependencyCount);
            for (uint256 i = 0; i < externalAssetDependencyCount; i++) {
                // each external asset dependency has 3 fields, so pre-allocate array to avoid dynamic memory allocation
                JsonStatic.Json[] memory dependencyValues = JsonStatic
                    .newValuesArray(3);
                string[] memory dependencyKeys = JsonStatic.newKeysArray(3);
                // get external asset dependency with data
                IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData
                    memory externalAssetDependencyWithData = _getProjectExternalAssetDependencyByIndex({
                        coreContract: coreContract,
                        projectId: projectId,
                        index: i
                    });
                // populate external asset dependency json object
                dependencyKeys[0] = "dependency_type";
                dependencyValues[0] = JsonStatic.newStringElement({
                    value: _dependencyTypeToString(
                        externalAssetDependencyWithData.dependencyType
                    ),
                    stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
                });
                dependencyKeys[1] = "cid";
                dependencyValues[1] = JsonStatic.newStringElement({
                    value: externalAssetDependencyWithData.cid,
                    stringEncodingFlag: JsonStatic.StringEncodingFlag.NONE
                });
                dependencyKeys[2] = "data";
                if (
                    externalAssetDependencyWithData.dependencyType ==
                    IGenArt721CoreContractV3_Engine_Flex
                        .ExternalAssetDependencyType
                        .ONCHAIN
                ) {
                    dependencyValues[2] = JsonStatic.newStringElement({
                        value: externalAssetDependencyWithData.data, // assign data for ONCHAIN dependencies
                        stringEncodingFlag: JsonStatic.StringEncodingFlag.BASE64
                    });
                } else {
                    dependencyValues[2] = JsonStatic.newStringElement({
                        value: "", // empty string for non-ONCHAIN dependencies
                        stringEncodingFlag: JsonStatic.StringEncodingFlag.BASE64
                    });
                }
                // TODO: handle ART_BLOCKS_DEPENDENCY_REGISTRY dependency type

                externalAssetDependencies[i] = JsonStatic.newObjectElement({
                    keys: dependencyKeys,
                    values: dependencyValues
                });
            }
            // assign externalAssetDependencies array to tokenDataValues
            tokenDataValues[4] = JsonStatic.newArrayElement(
                externalAssetDependencies
            );
        }

        // build tokenData json object
        JsonStatic.Json memory tokenData = JsonStatic.newObjectElement({
            keys: tokenDataKeys,
            values: tokenDataValues
        });

        // return tokenData as JSON string via write function
        return bytes(tokenData.write());
    }

    /**
     * @notice Get the HTMLRequest for a given token.
     * @param coreContract The core contract address the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTMLRequest for.
     * @return The HTMLRequest for the token.
     */
    function _getTokenHtmlRequest(
        address coreContract,
        uint256 tokenId
    ) internal view returns (HTMLRequest memory) {
        _onlySupportedCoreContract(coreContract);

        uint256 projectId = ABHelpers.tokenIdToProjectId(tokenId);
        // This will revert for older contracts that do not have an override set.
        bytes32 dependencyNameAndVersion = dependencyRegistry
            .getDependencyNameAndVersionForProject(coreContract, projectId)
            .stringToBytes32();

        // Create head tags

        HTMLTag[] memory headTags = new HTMLTag[](3);
        headTags[0].tagOpen = "<style>";
        headTags[0]
            .tagContent = "html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}";
        headTags[0].tagClose = "</style>";

        // @dev decode any base64 encoded flex data in the browser while parsing the json
        headTags[1].tagContent = abi.encodePacked(
            "let tokenData = JSON.parse(`",
            _getTokenData({coreContract: coreContract, tokenId: tokenId}),
            '`, (key, value) => key === "data" && value !== null ? atob(value) : value);'
        );
        headTags[1].tagType = HTMLTagType.script;

        // Create body tags
        HTMLTag[] memory bodyTags = new HTMLTag[](4);

        // Dependency script tag
        // Get script count and preferred CDN for the dependency.
        (
            ,
            ,
            string memory preferredCDN,
            ,
            ,
            ,
            ,
            ,
            uint24 scriptCount
        ) = dependencyRegistry.getDependencyDetails(dependencyNameAndVersion);

        // If no scripts on-chain, load the script from the preferred CDN.
        if (scriptCount == 0) {
            bool cdnAvailable = bytes(preferredCDN).length > 0;
            // If no CDN is available, we don't need to add any tags.
            // Expected for dependencies like "js@na" and "svg@na".
            bodyTags[0].tagOpen = cdnAvailable
                ? abi.encodePacked(
                    '<script type="text/javascript" src="',
                    preferredCDN,
                    '">'
                )
                : bytes("");
            bodyTags[0].tagClose = bytes(cdnAvailable ? "</script>" : "");
        } else {
            bytes memory dependencyScript = _getDependencyScriptBytes(
                dependencyNameAndVersion
            );
            bodyTags[0].tagContent = dependencyScript;
            bodyTags[0].tagType = HTMLTagType.scriptGZIPBase64DataURI; // <script type="text/javascript+gzip" src="data:text/javascript;base64,[script]"></script>
        }

        // @dev We expect all of our dependencies to be added gzip'd and base64 encoded
        // so we need to include this so we can gunzip them in the browser.
        bodyTags[1].name = "gunzipScripts-0.0.1.js";
        bodyTags[1].tagType = HTMLTagType.scriptBase64DataURI; // <script src="data:text/javascript;base64,[script]"></script>
        bodyTags[1].tagContent = bytes(
            universalBytecodeStorageReader.readFromBytecode(
                gunzipScriptBytecodeAddress
            )
        );

        HTMLTag memory canvasTag = _createCanvasTagIfNeeded(
            dependencyNameAndVersion
        );

        bool isProcessingDep = dependencyNameAndVersion ==
            bytes32("processing-js@1.4.6");

        bytes memory projectScript = _getProjectScriptBytes(
            coreContract,
            projectId
        );

        HTMLTag memory projectScriptTag = HTMLTag({
            tagOpen: isProcessingDep
                ? bytes("<script type='application/processing'>")
                : bytes("<script>"),
            tagClose: bytes("</script>"),
            tagType: HTMLTagType.useTagOpenAndClose,
            name: "",
            contractAddress: address(0),
            contractData: "",
            tagContent: projectScript
        });

        if (isProcessingDep) {
            bodyTags[2] = projectScriptTag;
            bodyTags[3] = canvasTag;
        } else {
            bodyTags[3] = projectScriptTag;
            bodyTags[2] = canvasTag;
        }

        HTMLRequest memory htmlRequest;
        htmlRequest.headTags = headTags;
        htmlRequest.bodyTags = bodyTags;

        return htmlRequest;
    }

    /**
     * @dev Helper function to get token hash with fallback support
     * @return tokenHash The hash for the token
     * @return isV0CoreContract Whether the contract is a V0 core contract
     */
    function _getTokenHash(
        address coreContract,
        uint256 tokenId
    ) private view returns (bytes32 tokenHash, bool isV0CoreContract) {
        // Try V1+ contracts first
        try
            IGenArt721CoreTokenHashProviderV1(coreContract).tokenIdToHash(
                tokenId
            )
        returns (bytes32 hash) {
            if (hash != bytes32(0)) {
                return (hash, false);
            }
        } catch {}

        // Fallback to V0 contracts
        try
            IGenArt721CoreTokenHashProviderV0(coreContract).showTokenHashes(
                tokenId
            )
        returns (bytes32[] memory hashes) {
            require(hashes[0] != bytes32(0), "Invalid token hash");
            return (hashes[0], true);
        } catch {
            revert("Unable to retrieve token hash");
        }
    }

    /**
     * @dev Helper function to get a canvas tag or an empty tag depending on the dependency name.
     * @return The canvas tag or an empty tag.
     */
    function _createCanvasTagIfNeeded(
        bytes32 dependencyNameAndVersion
    ) internal pure returns (HTMLTag memory) {
        // Extract dependency name before @ symbol
        uint atSignIndex;
        for (uint i = 0; i < dependencyNameAndVersion.length; i++) {
            if (dependencyNameAndVersion[i] == "@") {
                atSignIndex = i;
                break;
            }
        }

        bytes memory nameBeforeAt = new bytes(atSignIndex);
        for (uint i = 0; i < atSignIndex; i++) {
            nameBeforeAt[i] = dependencyNameAndVersion[i];
        }
        string memory depNameStr = string(nameBeforeAt);

        // Check if dependency needs canvas
        bytes32 nameHash = keccak256(nameBeforeAt);
        if (
            nameHash == keccak256(bytes("js")) ||
            nameHash == keccak256(bytes("babylon")) ||
            nameHash == keccak256(bytes("tone")) ||
            nameHash == keccak256(bytes("zdog")) ||
            nameHash == keccak256(bytes("processing-js"))
        ) {
            return
                HTMLTag({
                    tagOpen: abi.encodePacked(
                        "<canvas id='",
                        depNameStr,
                        "-canvas'>"
                    ),
                    tagClose: bytes("</canvas>"),
                    tagType: HTMLTagType.useTagOpenAndClose,
                    name: "",
                    contractAddress: address(0),
                    contractData: "",
                    tagContent: ""
                });
        } else {
            return
                HTMLTag({
                    tagOpen: "",
                    tagClose: "",
                    tagType: HTMLTagType.useTagOpenAndClose,
                    name: "",
                    contractAddress: address(0),
                    contractData: "",
                    tagContent: ""
                });
        }
    }

    function _dependencyTypeToString(
        IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType dependencyType
    ) internal pure returns (string memory) {
        if (
            dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .IPFS
        ) {
            return "IPFS";
        } else if (
            dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ARWEAVE
        ) {
            return "ARWEAVE";
        } else if (
            dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ONCHAIN
        ) {
            return "ONCHAIN";
        } else if (
            dependencyType ==
            IGenArt721CoreContractV3_Engine_Flex
                .ExternalAssetDependencyType
                .ART_BLOCKS_DEPENDENCY_REGISTRY
        ) {
            return "ART_BLOCKS_DEPENDENCY_REGISTRY";
        } else {
            return "UNKNOWN"; // never expected to happen
        }
    }
}
