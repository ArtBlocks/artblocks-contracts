// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

import "./DependencyRegistryV1.sol";
import "../interfaces/0.8.x/IGenArt721CoreProjectScript.sol";
import "../interfaces/0.8.x/IGenArt721CoreTokenHashProviderV0.sol";
import "../interfaces/0.8.x/IGenArt721CoreTokenHashProviderV1.sol";
import "../interfaces/0.8.x/IDependencyRegistryCompatibleV0.sol";
import "../libs/0.8.x/Bytes32Strings.sol";

import "@openzeppelin-4.7/contracts/utils/Strings.sol";

import {AddressChunks} from "./AddressChunks.sol";
import {IScriptyBuilder, WrappedScriptRequest} from "scripty.sol/contracts/scripty/IScriptyBuilder.sol";
import {IContractScript} from "scripty.sol/contracts/scripty/IContractScript.sol";

contract GenArt721GeneratorV0 {
    using Bytes32Strings for bytes32;
    using Bytes32Strings for string;

    uint256 constant ONE_MILLION = 1_000_000;

    DependencyRegistryV1 public dependencyRegistry;
    IScriptyBuilder public scriptyBuilder;
    IContractScript public ethFS;

    constructor(
        address _dependencyRegistry,
        address _scriptyBuilder,
        address _ethFS
    ) {
        dependencyRegistry = DependencyRegistryV1(_dependencyRegistry);
        scriptyBuilder = IScriptyBuilder(_scriptyBuilder);
        ethFS = IContractScript(_ethFS);
    }

    function _onlySupportedCoreContract(
        address _contractAddress
    ) internal view {
        require(
            dependencyRegistry.isSupportedCoreContract(_contractAddress),
            "Unsupported core contract"
        );
    }

    function getDependencyScript(
        bytes32 _dependencyType
    ) external view returns (bytes memory) {
        uint256 scriptCount = dependencyRegistry.getDependencyScriptCount(
            _dependencyType
        );

        if (scriptCount == 0) {
            return "";
        }

        address[] memory scriptBytecodeAddresses = new address[](scriptCount);

        for (uint256 i = 0; i < scriptCount; i++) {
            scriptBytecodeAddresses[i] = dependencyRegistry
                .getDependencyScriptBytecodeAddressAtIndex(_dependencyType, i);
        }

        return AddressChunks.mergeChunks(scriptBytecodeAddresses);
    }

    function getProjectScript(
        address _contractAddress,
        uint256 _projectId
    ) external view returns (bytes memory) {
        _onlySupportedCoreContract(_contractAddress);

        try
            IDependencyRegistryCompatibleV0(_contractAddress)
                .projectScriptDetails(_projectId)
        returns (string memory, string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            address[] memory scriptBytecodeAddresses = new address[](
                scriptCount
            );

            for (uint256 i = 0; i < scriptCount; i++) {
                scriptBytecodeAddresses[i] = IDependencyRegistryCompatibleV0(
                    _contractAddress
                ).projectScriptBytecodeAddressByIndex(_projectId, i);
            }

            return AddressChunks.mergeChunks(scriptBytecodeAddresses);
        } catch {
            // Noop try again for older contracts.
        }

        try
            IGenArt721CoreProjectScript(_contractAddress).projectScriptInfo(
                _projectId
            )
        returns (string memory, uint256 scriptCount) {
            if (scriptCount == 0) {
                return "";
            }

            string memory script;
            for (uint256 i = 0; i < scriptCount; i++) {
                string memory scriptChunk = IGenArt721CoreProjectScript(
                    _contractAddress
                ).projectScriptByIndex(_projectId, i);
                script = string.concat(script, scriptChunk);
            }

            return abi.encodePacked(script);
        } catch {
            revert("Unable to retrieve project script info");
        }
    }

    function getTokenHtmlScriptRequests(
        address _contractAddress,
        uint256 _tokenId
    )
        internal
        view
        returns (WrappedScriptRequest[] memory, uint256 bufferSize)
    {
        _onlySupportedCoreContract(_contractAddress);

        uint256 projectId = _tokenId / ONE_MILLION;
        // This will revert for older contracts that do not have an override set.
        bytes32 dependencyType = dependencyRegistry
            .getDependencyTypeForProject(_contractAddress, projectId)
            .stringToBytes32();

        bytes32 tokenHash;
        try
            IDependencyRegistryCompatibleV0(_contractAddress).tokenIdToHash(
                _tokenId
            )
        returns (bytes32 _tokenHash) {
            tokenHash = _tokenHash;
        } catch {
            // Noop try again for older contracts.
        }

        if (tokenHash == bytes32(0)) {
            try
                IGenArt721CoreTokenHashProviderV1(_contractAddress)
                    .tokenIdToHash(_tokenId)
            returns (bytes32 _tokenHash) {
                tokenHash = _tokenHash;
            } catch {
                // Noop try again for older contracts.
            }
        }

        if (tokenHash == bytes32(0)) {
            try
                IGenArt721CoreTokenHashProviderV0(_contractAddress)
                    .showTokenHashes(_tokenId)
            returns (bytes32[] memory tokenHashes) {
                tokenHash = tokenHashes[0];
            } catch {
                revert("Unable to retrieve token hash.");
            }
        }

        WrappedScriptRequest[] memory requests = new WrappedScriptRequest[](5);

        requests[0]
            .scriptContent = 'let css="html{height:100%}body{min-height:100%;margin:0;padding:0}canvas{padding:0;margin:auto;display:block;position:absolute;top:0;bottom:0;left:0;right:0}",head=document.head,style=document.createElement("style");head.appendChild(style),style.type="text/css",style.appendChild(document.createTextNode(css));';

        requests[1].scriptContent = abi.encodePacked(
            'let tokenData = {"tokenId":"',
            Strings.toString(_tokenId),
            '"',
            ',"hash":"',
            Strings.toHexString(uint256(tokenHash)),
            '"}'
        );

        (
            ,
            string memory preferredCDN,
            ,
            ,
            ,
            ,
            ,
            uint24 scriptCount
        ) = dependencyRegistry.getDependencyDetails(dependencyType);
        if (scriptCount == 0) {
            requests[2].wrapPrefix = abi.encodePacked(
                '<script type="text/javascript" src="',
                preferredCDN,
                '">'
            );
            requests[2].scriptContent = "// Noop"; // ScriptyBuilder requires scriptContent for this to work
            requests[2].wrapSuffix = "</script>";
            requests[2].wrapType = 4; // [wrapPrefix][scriptContent][wrapSuffix]
        } else {
            bytes memory dependencyScript = this.getDependencyScript(
                dependencyType
            );
            requests[2].scriptContent = dependencyScript;
            requests[2].wrapType = 2; // <script type="text/javascript+gzip" src="data:text/javascript;base64,[script]"></script>
        }

        bytes memory gunzipScript = ethFS.getScript(
            "gunzipScripts-0.0.1.js",
            ""
        );
        requests[3].wrapType = 1; // <script src="data:text/javascript;base64,[script]"></script>
        requests[3].scriptContent = gunzipScript;

        bytes memory projectScript = this.getProjectScript(
            _contractAddress,
            projectId
        );
        requests[4].scriptContent = projectScript;
        requests[4].wrapType = 0; // <script>[script]</script>

        bufferSize = scriptyBuilder.getBufferSizeForHTMLWrapped(requests);

        return (requests, bufferSize);
    }

    function getTokenHtmlBase64EncodedDataUri(
        address _contractAddress,
        uint256 _tokenId
    ) external view returns (string memory) {
        (
            WrappedScriptRequest[] memory requests,
            uint256 bufferSize
        ) = getTokenHtmlScriptRequests(_contractAddress, _tokenId);
        bytes memory base64EncodedHTMLDataURI = scriptyBuilder
            .getEncodedHTMLWrapped(requests, bufferSize);

        return string(base64EncodedHTMLDataURI);
    }

    function getTokenHtml(
        address _contractAddress,
        uint256 _tokenId
    ) external view returns (string memory) {
        (
            WrappedScriptRequest[] memory requests,
            uint256 bufferSize
        ) = getTokenHtmlScriptRequests(_contractAddress, _tokenId);
        bytes memory html = scriptyBuilder.getHTMLWrapped(requests, bufferSize);

        return string(html);
    }
}
