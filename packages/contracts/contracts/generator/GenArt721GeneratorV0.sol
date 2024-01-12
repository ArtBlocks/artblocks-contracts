// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

import "../DependencyRegistryV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreProjectScriptV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreProjectScriptV1.sol";
import "../interfaces/v0.8.x/IGenArt721CoreTokenHashProviderV0.sol";
import "../interfaces/v0.8.x/IGenArt721CoreTokenHashProviderV1.sol";
import "../libs/v0.8.x/Bytes32Strings.sol";
import "../libs/v0.8.x/BytecodeStorageV1.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";

import {AddressChunks} from "./AddressChunks.sol";
import {IScriptyBuilderV2, HTMLRequest, HTMLTagType, HTMLTag} from "scripty.sol/contracts/scripty/interfaces/IScriptyBuilderV2.sol";

/**
 * @title GenArt721GeneratorV0
 * @author Art Blocks Inc.
 * @notice This contract is used to generate the HTML for Art Blocks tokens
 * by combining the dependency script, project script, token data. It utilizes
 * the ScriptyBuilder contract to generate the HTML.
 */
contract GenArt721GeneratorV0 {
    using Bytes32Strings for bytes32;
    using Bytes32Strings for string;

    uint256 constant ONE_MILLION = 1_000_000;

    DependencyRegistryV0 public dependencyRegistry;
    IScriptyBuilderV2 public scriptyBuilder;
    address public ethFS;

    function _onlySupportedCoreContract(
        address coreContractAddress
    ) internal view {
        require(
            dependencyRegistry.isSupportedCoreContract(coreContractAddress),
            "Unsupported core contract"
        );
    }

    /**
     * @notice Constructor for the GenArt721GeneratorV0 contract.
     * @param _dependencyRegistry The address of the DependencyRegistry
     * contract to be used for retrieving dependency scripts.
     * @param _scriptyBuilder The address of the ScriptyBuilderV2 contract
     * to be used for generating the HTML for tokens.
     * @param _ethFS The address of the EthFSFileStorage contract to retrieve
     * the gunzipScripts-0.0.1.js script from used to gunzip the dependency
     * scripts.
     */
    constructor(
        address _dependencyRegistry,
        address _scriptyBuilder,
        address _ethFS
    ) {
        dependencyRegistry = DependencyRegistryV0(_dependencyRegistry);
        scriptyBuilder = IScriptyBuilderV2(_scriptyBuilder);
        ethFS = _ethFS;
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
    function getDependencyScript(
        bytes32 dependencyNameAndVersion
    ) external view returns (bytes memory) {
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

        bytes32 storageVersion = BytecodeStorageReader
            .getLibraryVersionForBytecode(scriptBytecodeAddresses[0]);

        uint256 offset;
        if (storageVersion == BytecodeStorageReader.V0_VERSION_STRING) {
            offset = 104;
        } else if (storageVersion == BytecodeStorageReader.V1_VERSION_STRING) {
            offset = 65;
        } else {
            revert("Unsupported storage version");
        }

        return AddressChunks.mergeChunks(scriptBytecodeAddresses, offset);
    }

    /**
     * @notice Get the project script for a given core contract address and
     * project ID.
     * @param coreContractAddress The address of the core contract to retrieve
     * the project script from.
     * @param projectId The ID of the project to retrieve the script for.
     * @return The project script stiched together from all of the script chunks.
     * @dev This function will revert if the core contract address is not
     * supported by the DependencyRegistry or if the contract at the address
     * does not implement the IGenArt721CoreProjectScriptV0 or IGenArt721CoreProjectScriptV1.
     */
    function getProjectScript(
        address coreContractAddress,
        uint256 projectId
    ) external view returns (bytes memory) {
        _onlySupportedCoreContract(coreContractAddress);

        try
            IGenArt721CoreProjectScriptV1(coreContractAddress)
                .projectScriptDetails(projectId)
        returns (string memory, string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            address[] memory scriptBytecodeAddresses = new address[](
                scriptCount
            );

            for (uint256 i = 0; i < scriptCount; i++) {
                scriptBytecodeAddresses[i] = IGenArt721CoreProjectScriptV1(
                    coreContractAddress
                ).projectScriptBytecodeAddressByIndex(projectId, i);
            }

            bytes32 storageVersion = BytecodeStorageReader
                .getLibraryVersionForBytecode(scriptBytecodeAddresses[0]);

            uint256 offset;
            if (storageVersion == BytecodeStorageReader.V0_VERSION_STRING) {
                offset = 104;
            } else if (
                storageVersion == BytecodeStorageReader.V1_VERSION_STRING
            ) {
                offset = 65;
            } else {
                revert("Unsupported storage version");
            }

            return AddressChunks.mergeChunks(scriptBytecodeAddresses, offset);
        } catch {
            // Noop try again for older contracts.
        }

        try
            IGenArt721CoreProjectScriptV0(coreContractAddress)
                .projectScriptInfo(projectId)
        returns (string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            string memory script;
            for (uint256 i = 0; i < scriptCount; i++) {
                string memory scriptChunk = IGenArt721CoreProjectScriptV0(
                    coreContractAddress
                ).projectScriptByIndex(projectId, i);
                script = string.concat(script, scriptChunk);
            }

            return abi.encodePacked(script);
        } catch {
            revert("Unable to retrieve project script info");
        }
    }

    /**
     * @notice Get the HTMLRequest for a given token.
     * @param coreContractAddress The core contract address the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTMLRequest for.
     * @return The HTMLRequest for the token.
     */
    function getTokenHtmlRequest(
        address coreContractAddress,
        uint256 tokenId
    ) internal view returns (HTMLRequest memory) {
        _onlySupportedCoreContract(coreContractAddress);

        uint256 projectId = tokenId / ONE_MILLION;
        // This will revert for older contracts that do not have an override set.
        bytes32 dependencyNameAndVersion = dependencyRegistry
            .getDependencyNameAndVersionForProject(
                coreContractAddress,
                projectId
            )
            .stringToBytes32();

        bytes32 tokenHash;
        if (tokenHash == bytes32(0)) {
            try
                IGenArt721CoreTokenHashProviderV1(coreContractAddress)
                    .tokenIdToHash(tokenId)
            returns (bytes32 _tokenHash) {
                tokenHash = _tokenHash;
            } catch {
                // Noop try again for older contracts.
            }
        }

        if (tokenHash == bytes32(0)) {
            try
                IGenArt721CoreTokenHashProviderV0(coreContractAddress)
                    .showTokenHashes(tokenId)
            returns (bytes32[] memory tokenHashes) {
                tokenHash = tokenHashes[0];
            } catch {
                revert("Unable to retrieve token hash.");
            }
        }

        HTMLTag[] memory headTags = new HTMLTag[](2);
        headTags[0].tagOpen = "<style>";
        headTags[0]
            .tagContent = "html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}";
        headTags[0].tagClose = "</style>";

        headTags[1].tagContent = abi.encodePacked(
            'let tokenData = {"tokenId":"',
            Strings.toString(tokenId),
            '"',
            ',"hash":"',
            Strings.toHexString(uint256(tokenHash)),
            '"}'
        );
        headTags[1].tagType = HTMLTagType.script;

        HTMLTag[] memory bodyTags = new HTMLTag[](3);
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
            bodyTags[0].tagOpen = abi.encodePacked(
                '<script type="text/javascript" src="',
                preferredCDN,
                '">'
            );
            bodyTags[0].tagContent = "// Noop"; // ScriptyBuilder requires scriptContent for this to work
            bodyTags[0].tagClose = "</script>";
        } else {
            bytes memory dependencyScript = this.getDependencyScript(
                dependencyNameAndVersion
            );
            bodyTags[0].tagContent = dependencyScript;
            bodyTags[0].tagType = HTMLTagType.scriptGZIPBase64DataURI; // <script type="text/javascript+gzip" src="data:text/javascript;base64,[script]"></script>
        }

        bodyTags[1].name = "gunzipScripts-0.0.1.js";
        bodyTags[1].tagType = HTMLTagType.scriptBase64DataURI; // <script src="data:text/javascript;base64,[script]"></script>
        bodyTags[1].contractAddress = ethFS;

        bytes memory projectScript = this.getProjectScript(
            coreContractAddress,
            projectId
        );
        bodyTags[2].tagContent = projectScript;
        bodyTags[2].tagType = HTMLTagType.script; // <script>[script]</script>

        HTMLRequest memory htmlRequest;
        htmlRequest.headTags = headTags;
        htmlRequest.bodyTags = bodyTags;

        return htmlRequest;
    }

    /**
     * @notice Get the data URI for the HTML for a given token (e.g. data:text/html;base64,[html])
     * @param coreContractAddress The address of the core contract the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTML for.
     * @return The data URI for the HTML for the token.
     */
    function getTokenHtmlBase64EncodedDataUri(
        address coreContractAddress,
        uint256 tokenId
    ) external view returns (string memory) {
        HTMLRequest memory htmlRequest = getTokenHtmlRequest(
            coreContractAddress,
            tokenId
        );
        string memory base64EncodedHTMLDataURI = scriptyBuilder
            .getEncodedHTMLString(htmlRequest);

        return base64EncodedHTMLDataURI;
    }

    /**
     * @notice Get the HTML for a given token.
     * @param coreContractAddress The address of the core contract the token belongs to.
     * @param tokenId The ID of the token to retrieve the HTML for.
     * @return The HTML for the token.
     */
    function getTokenHtml(
        address coreContractAddress,
        uint256 tokenId
    ) external view returns (string memory) {
        HTMLRequest memory htmlRequest = getTokenHtmlRequest(
            coreContractAddress,
            tokenId
        );
        string memory html = scriptyBuilder.getHTMLString(htmlRequest);

        return html;
    }
}
