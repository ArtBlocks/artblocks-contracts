// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title ISRSimpleHooks
 * @author Art Blocks Inc.
 * @notice Interface for the SRSimpleHooks contract.
 * Simplified variant of ISRHooks: all tokens send generally, all tokens receive generally,
 * single metadata slot (image only, no audio), and no per-token send/receive state management.
 */
interface ISRSimpleHooks {
    /**
     * @notice Emitted when the contract is initialized.
     * @param coreContractAddress The address of the core contract.
     * @param coreProjectId The project ID of the core contract.
     */
    event SRSimpleHooksInitialized(
        address coreContractAddress,
        uint256 coreProjectId
    );

    /**
     * @notice Emitted when image data is configured for a token.
     * @param coreContract The address of the core contract.
     * @param tokenId The ID of the token.
     */
    event ImageConfigured(
        address indexed coreContract,
        uint256 indexed tokenId
    );

    /**
     * @notice Emitted when the image data setter address is updated.
     * @param imageDataSetter The new image data setter address.
     */
    event ImageDataSetterUpdated(address imageDataSetter);

    /**
     * @notice Live data for a single token, returned by getLiveData.
     * @param tokenNumber The token number.
     * @param ownerAddress The current owner of the token.
     * @param imageDataCompressed The compressed image data for the token.
     * @param ownerEnsName The ENS name of the owner (empty string if none).
     */
    struct TokenLiveData {
        uint256 tokenNumber;
        address ownerAddress;
        bytes imageDataCompressed;
        string ownerEnsName;
    }

    /**
     * @notice Sets the address allowed to write image data for tokens.
     * Only callable by the contract owner (artist).
     * @param imageDataSetter The address to grant image data writing permission.
     */
    function setImageDataSetter(address imageDataSetter) external;

    /**
     * @notice Sets the compressed image data for a token.
     * Only callable by the configured imageDataSetter address.
     * @param tokenNumber The token number to set image data for.
     * @param imageDataCompressed The compressed image data bytes.
     */
    function setTokenImageData(
        uint256 tokenNumber,
        bytes calldata imageDataCompressed
    ) external;

    /**
     * @notice Gets the live data for a given token: 19 pseudorandom other tokens
     * sampled via Feistel walk, changing every block.
     * @param tokenNumber The token number to get the live data for.
     * @param blockNumber The block number to seed randomness. 0 = latest completed block.
     * Must be within the latest 256 blocks.
     * @return liveData Array of up to 19 TokenLiveData structs for pseudorandom tokens.
     * @return totalSupply The current total number of minted tokens in the project.
     * @return usedBlockNumber The block number actually used for randomness.
     */
    function getLiveData(
        uint256 tokenNumber,
        uint256 blockNumber
    )
        external
        view
        returns (
            TokenLiveData[] memory liveData,
            uint256 totalSupply,
            uint256 usedBlockNumber
        );

    /**
     * @notice Gets the metadata for a given token.
     * @param tokenNumber The token number to get the metadata for.
     * @return imageDataCompressed The compressed image data.
     * @return ownerAddress The current owner of the token.
     */
    function getTokenMetadata(
        uint256 tokenNumber
    )
        external
        view
        returns (bytes memory imageDataCompressed, address ownerAddress);
}
