// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title ISRHooks
 * @author Art Blocks Inc.
 * @notice This interface defines the custom events and functions for the SRHooks contract.
 * It does not include any of the IPMPV0 events, which are indexed separately.
 */
interface ISRHooks {
    /**
     * @notice Emitted when the contract is initialized
     * @param pmpV0Address The address of the PMPV0 contract.
     * @param coreContractAddress The address of the core contract.
     * @param coreProjectId The project ID of the core contract.
     */
    event Initialized(
        address pmpV0Address,
        address coreContractAddress,
        uint256 coreProjectId
    );

    /**
     * @notice Emitted when a token slot is takedown by a moderator
     * @param tokenNumber The token number.
     * @param slot The slot number.
     * @param moderatorAddress The address of the moderator who takedown the slot.
     */
    event TokenMetadataSlotTakedown(
        uint256 indexed tokenNumber,
        uint256 slot,
        address moderatorAddress
    );

    // struct for the token metadata calldata
    struct TokenMetadataCalldata {
        bool updateImage; // true if updating the image data
        bytes imageDataCompressed; // non-empty if updating the image data
        bool updateSound; // true if updating the sound data
        bytes soundDataCompressed; // may be empty to clear the sound data, non-empty if setting the sound data
    }

    struct TokenLiveData {
        uint256 tokenNumber;
        address ownerAddress;
        bytes imageDataCompressed;
        bytes soundDataCompressed;
    }

    // enum for the different possible states of a token's SR configuration
    enum SendStates {
        Neutral,
        SendGeneral,
        SendTo
    }

    enum ReceiveStates {
        Neutral,
        ReceiveGeneral,
        ReceiveFrom
    }

    /**
     * @notice Updates the state and metadata for a given token.
     * Reverts if the token number is invalid or the msg.sender is not owner or valid delegate.xyz V2 of token owner.
     * Reverts if invalid configuration is provided.
     * Includes two boolean flags to update the send and receive states and token metadata separately, in a single function call.
     * Never allows updating to a slot that has been taken down by the moderator or is invalid.
     * Never allows updating the send or receive state while still in a slot that has been taken down by the moderator.
     * @param tokenNumber The token number to update.
     * @param updateSendState Whether to update the send state.
     * @param sendState The new send state. Valid values are SendGeneral, SendTo, Neutral.
     * @param tokensSendingTo Tokens to send this token to. Only non-empty iff updateSendState is true and sendState is SendTo.
     * @param updateReceiveState Whether to update the receive state.
     * @param receiveState The new receive state. Valid values are ReceiveGeneral, ReceiveFrom, Neutral.
     * @param tokensReceivingFrom Tokens this token is open to receive from. Only non-empty iff updateReceiveState is true and receiveState is ReceiveFrom.
     * @param updateTokenMetadata Whether to update the token metadata.
     * @param updatedActiveSlot The new active slot. If updating token metadata, this is the new active slot.
     * @param tokenMetadataCalldata The new token metadata. If updating token metadata, this is the new token metadata at the updated active slot. Only non-empty iff updateTokenMetadata is true.
     */
    function updateTokenStateAndMetadata(
        uint256 tokenNumber,
        bool updateSendState,
        SendStates sendState,
        uint16[] memory tokensSendingTo,
        bool updateReceiveState,
        ReceiveStates receiveState,
        uint16[] memory tokensReceivingFrom,
        bool updateTokenMetadata,
        uint256 updatedActiveSlot,
        TokenMetadataCalldata memory tokenMetadataCalldata
    ) external;

    /**
     * @notice Gets the live data for a given token.
     * @param tokenNumber The token number to get the live data for.
     * @param blockNumber The block number to get the live data for.
     * @return sendState The send state of the token.
     * @return receiveState The receive state of the token.
     * @return receivedTokensGeneral The received tokens general of the token.
     * @return receivedTokensTo The received tokens to of the token.
     */
    function getLiveData(
        uint256 tokenNumber,
        uint256 blockNumber
    )
        external
        view
        returns (
            SendStates sendState,
            ReceiveStates receiveState,
            TokenLiveData[] memory receivedTokensGeneral,
            TokenLiveData[] memory receivedTokensTo
        );
}
