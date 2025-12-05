// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "./AbstractPMPAugmentHook.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";

import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {EnumerableMap} from "@openzeppelin-5.0/contracts/utils/structs/EnumerableMap.sol";

/**
 * @title InjectBlockHeightAndArtistProjectOverrides
 * @author Art Blocks Inc.
 * @notice This hook appends the current block height, current project invocations, and artist project overrides into a token's PMPs.
 * If an input PMP has a key that matches an artist project override, the artist project override value will be used.
 * If an override value is not in the input PMPs, it will be appended to the output, ensuring that the output always contains all override values.
 * @dev This contract is developed open-source, is lightly tested, and should be used at your own risk.
 * The artist can set and clear overrides for a project via the `artistSetProjectOverride` and `artistClearProjectOverride` functions.
 * The artist can only set and clear overrides for their own projects.
 * This contract is not owned, and intended to integrate with Art Blocks core contracts that conform to IGenArt721CoreContractV3_Base.
 */
contract InjectBlockHeightProjectInvocationsAndArtistProjectOverrides is
    AbstractPMPAugmentHook
{
    using Strings for uint256;
    using EnumerableMap for EnumerableMap.Bytes32ToBytes32Map;

    event ArtistProjectOverrideSet(
        address indexed coreContract,
        uint256 indexed projectId,
        string key,
        string value
    );

    event ArtistProjectOverrideCleared(
        address indexed coreContract,
        uint256 indexed projectId,
        string key
    );

    // enumerable mapping of project to artist pmp overrides
    // @dev key/value pairs are stored as bytes32 values for gas efficiency and standard library compatibility
    mapping(address coreContract => mapping(uint256 projectId => EnumerableMap.Bytes32ToBytes32Map enumerableOverrides))
        private artistProjectOverrides;

    /**
     * @notice Set a project override for a given key.
     * Only the artist of the project can set the project override.
     * @dev intentionally does not emit events - artist overrides are intended to be not indexed.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     * @param key The key to set.
     * @param value The value to set.
     */
    function artistSetProjectOverride(
        address coreContract,
        uint256 projectId,
        string memory key,
        string memory value
    ) external {
        // CHECKS
        _onlyArtist({
            caller: msg.sender,
            coreContract: coreContract,
            projectId: projectId
        });

        // EFFECTS
        EnumerableMap.Bytes32ToBytes32Map
            storage overrides = artistProjectOverrides[coreContract][projectId];
        overrides.set(_toBytes32(key), _toBytes32(value));

        emit ArtistProjectOverrideSet({
            coreContract: coreContract,
            projectId: projectId,
            key: key,
            value: value
        });
    }

    /**
     * @notice Clear a project override for a given key.
     * Only the artist of the project can clear the project override.
     * @dev intentionally does not emit events - artist overrides are intended to be not indexed.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     * @param key The key to clear.
     */
    function artistClearProjectOverride(
        address coreContract,
        uint256 projectId,
        string memory key
    ) external {
        // CHECKS
        _onlyArtist({
            caller: msg.sender,
            coreContract: coreContract,
            projectId: projectId
        });

        // EFFECTS
        EnumerableMap.Bytes32ToBytes32Map
            storage overrides = artistProjectOverrides[coreContract][projectId];
        require(overrides.remove(_toBytes32(key)), "Key not found");

        emit ArtistProjectOverrideCleared({
            coreContract: coreContract,
            projectId: projectId,
            key: key
        });
    }

    /**
     * @notice Get the artist project overrides for a given project.
     * @dev This function is used to get the artist project overrides for a given project.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     * @return projectOverrides The artist project overrides for the given project.
     */
    function getArtistProjectOverrides(
        address coreContract,
        uint256 projectId
    ) external view returns (IWeb3Call.TokenParam[] memory projectOverrides) {
        EnumerableMap.Bytes32ToBytes32Map
            storage overrides = artistProjectOverrides[coreContract][projectId];
        uint256 overrideCount = overrides.length();
        // translate enumerable map to expected output format
        projectOverrides = new IWeb3Call.TokenParam[](overrideCount);
        for (uint256 i = 0; i < overrideCount; i++) {
            (bytes32 key, bytes32 value) = overrides.at(i);
            projectOverrides[i] = IWeb3Call.TokenParam({
                key: _fromBytes32(key),
                value: _fromBytes32(value)
            });
        }
        // @dev implicitly return the projectOverrides array
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Appends the block height and project invocations into a tokens PMPs, and injects artist project overrides.
     * If an input PMP has a key that matches an artist project override, the artist project override value will be used.
     * If an input PMP has a key that does not match an artist project override, the input PMP will be unaffected in the output.
     * All overrides are appended to the output, ensuring that the output always contains all override values.
     * @dev This hook is called when a token's PostParams are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address coreContract,
        uint256 tokenId,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        // get artist project overrides
        EnumerableMap.Bytes32ToBytes32Map storage overrides = artistProjectOverrides[
            coreContract
        ][
            ABHelpers.tokenIdToProjectId({tokenId: tokenId}) // project id
        ];
        uint256 overrideCount = overrides.length();

        // create a new augmentedTokenParams array with maximum length of
        // input tokenParams + overrideCount + 2 extra elements for BlockHeight and project invocations
        uint256 originalLength = tokenParams.length;
        uint256 augmentedMaxLength = originalLength + overrideCount + 2; // +2 for block height and project invocations
        augmentedTokenParams = new IWeb3Call.TokenParam[](augmentedMaxLength);

        // copy the original tokenParams into the new array
        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        // get + inject the block height into the new array
        // @dev block scope to avoid stack too deep error
        {
            uint256 currentBlock = block.number;
            augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
                key: "blockHeight",
                value: currentBlock.toString()
            });
        }

        // get + inject the project invocations into the new array
        {
            uint256 projectId = ABHelpers.tokenIdToProjectId({
                tokenId: tokenId
            });
            (uint256 invocations, , , , , ) = IGenArt721CoreContractV3_Base(
                coreContract
            ).projectStateData(projectId);
            augmentedTokenParams[originalLength + 1] = IWeb3Call.TokenParam({
                key: "projectInvocations",
                value: invocations.toString()
            });
        }

        // get + inject the artist project overrides into the new array, overriding any existing param values
        uint256 nextIndex = originalLength + 2;
        // @dev O(i*n) where i is the number of overrides and n is the number of original tokenParams, okay on read function
        for (uint256 i = 0; i < overrideCount; i++) {
            (bytes32 key, bytes32 value) = overrides.at(i);
            // check if the key exists in the original tokenParams, and if so, override the value with artist override
            bool found = false;
            for (uint256 j = 0; j < originalLength; j++) {
                if (_equalsStringAndBytes32({s: tokenParams[j].key, b: key})) {
                    augmentedTokenParams[j] = IWeb3Call.TokenParam({
                        key: tokenParams[j].key, // @dev key is not changed
                        value: _fromBytes32(value) // @dev value is overridden
                    });
                    found = true;
                    break;
                }
            }
            // if the key did not exist in the original tokenParams, append it to the augmentedTokenParams array
            if (!found) {
                augmentedTokenParams[nextIndex++] = IWeb3Call.TokenParam({
                    key: _fromBytes32(key),
                    value: _fromBytes32(value)
                });
            }
        }

        // shorten the augmentedTokenParams array to the new length (which is nextIndex)
        // @dev use assembly to efficiently modify in place
        if (nextIndex < augmentedMaxLength) {
            assembly {
                mstore(augmentedTokenParams, nextIndex)
            }
        }

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    /**
     * @notice Only the artist of the project can call the function.
     * @dev reverts if the caller is not the artist of the project.
     * @param caller The address of the caller.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project.
     */
    function _onlyArtist(
        address caller,
        address coreContract,
        uint256 projectId
    ) internal view {
        if (
            caller !=
            IGenArt721CoreContractV3_Base(coreContract)
                .projectIdToArtistAddress(projectId)
        ) {
            revert("Only artist of project");
        }
    }

    /**
     * @notice Convert a string to a bytes32 value.
     * Reverts if the string is longer than 32 bytes.
     * @dev This is a helper function to convert a string to a bytes32 value.
     * @param str The string to convert.
     * @return result The bytes32 value of the string.
     */
    function _toBytes32(
        string memory str
    ) internal pure returns (bytes32 result) {
        bytes memory temp = bytes(str);
        if (temp.length > 32) {
            revert("String too long");
        }
        // copy the string directly to the bytes32 result, skipping the first 32 bytes (string length)
        assembly {
            result := mload(add(str, 32))
        }
    }

    /**
     * @notice Convert a bytes32-encoded string value to a string.
     * @dev This is a helper function to convert a bytes32-encoded string value to a string.
     * @param b The bytes32 value to convert.
     * @return The string value of the bytes32 value.
     */
    function _fromBytes32(bytes32 b) internal pure returns (string memory) {
        // determine the length of the string
        uint256 len = 0;
        for (; len < 32; ++len) {
            if (b[len] == 0) break;
        }
        // create a new string with the length of the string
        // @dev solidity reserves 32 bytes for length, rounds up to full word for data portion
        string memory result = new string(len);
        assembly {
            let resultData := add(result, 0x20) // skip length prefix (already populated)
            mstore(resultData, b) // store full 32 bytes (write-ahead optimization, okay due to solidity reserving 32 bytes for data)
        }
        return result;
    }

    /**
     * @notice Compare a string and a bytes32 value, assuming the bytes32 is an encoded string.
     * @dev This is a helper function to compare a string and a bytes32 value.
     * @param s The string to compare.
     * @param b The bytes32 value to compare.
     * @return true if the string and bytes32 value are equal, false otherwise.
     */
    function _equalsStringAndBytes32(
        string memory s,
        bytes32 b
    ) internal pure returns (bool) {
        bytes memory strBytes = bytes(s);
        if (strBytes.length > 32) return false;
        bytes32 strBytes32;
        assembly {
            strBytes32 := mload(add(s, 32))
        }
        return strBytes32 == b;
    }
}
