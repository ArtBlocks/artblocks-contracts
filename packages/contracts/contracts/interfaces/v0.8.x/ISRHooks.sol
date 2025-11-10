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
     * @notice Emitted when the tokens sending to a token are updated
     * @param coreContract The address of the core contract.
     * @param tokenId The ID of the token.
     * @param tokensSendingTo The tokens sending to the token.
     */
    event TokenSendingToUpdated(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint16[] tokensSendingTo
    );

    /**
     * @notice Emitted when the tokens sending to a token are updated
     * @param coreContract The address of the core contract.
     * @param tokenId The ID of the token.
     * @param tokensReceivingFrom The tokens receiving from the token.
     */
    event TokenReceivingFromUpdated(
        address indexed coreContract,
        uint256 indexed tokenId,
        uint16[] tokensReceivingFrom
    );

    /**
     * @notice Struct for the token metadata calldata.
     * @param updateImage Whether to update the image data.
     * @param imageDataCompressed The compressed image data.
     * @param updateSound Whether to update the sound data.
     * @param soundDataCompressed The compressed sound data.
     */
    struct TokenMetadataCalldata {
        bool updateImage; // true if updating the image data
        bytes imageDataCompressed; // non-empty if updating the image data
        bool updateSound; // true if updating the sound data
        bytes soundDataCompressed; // may be empty to clear the sound data, non-empty if setting the sound data
    }

    /**
     * @notice Struct for the token metadata view.
     * @param imageDataCompressed The compressed image data.
     * @param imageVersion The version of the image data.
     * @param soundDataCompressed The compressed sound data.
     * @param soundVersion The version of the sound data.
     */
    struct TokenMetadataView {
        bytes imageDataCompressed;
        uint16 imageVersion;
        bytes soundDataCompressed;
        uint16 soundVersion;
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
        ReceiveFrom,
        ReceiveTo
    }

    /**
     * @notice Updates the state and metadata for a given token.
     * Reverts if the token number is invalid or the msg.sender is not owner or valid delegate.xyz V2 of token owner.
     * Reverts if invalid configuration is provided.
     * Includes two boolean flags to update the send and receive states and token metadata separately, in a single function call.
     * Never allows updating to a slot that is invalid.
     * @param tokenNumber The token number to update.
     * @param updateSendState Whether to update the send state.
     * @param sendState The new send state. Valid values are SendGeneral, SendTo, Neutral.
     * @param tokensSendingTo Tokens to send this token to. Only non-empty iff updateSendState is true and sendState is SendTo.
     * Duplicates are automatically deduplicated when calculating dilution rates.
     * @param updateReceiveState Whether to update the receive state.
     * @param receiveState The new receive state. Valid values are ReceiveGeneral, ReceiveFrom, Neutral.
     * @param tokensReceivingFrom Tokens this token is open to receive from. Only non-empty iff updateReceiveState is true and receiveState is ReceiveFrom.
     * Duplicates and self-referential entries are automatically filtered in getLiveData results.
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
     * @param blockNumber The block number to get the live data for. Must be in latest 256 blocks.
     * @param maxReceive The maximum number of tokens to receive, in each array of receivedTokensGeneral and receivedTokensTo.
     * maxReceive must be less than or equal to MAX_RECEIVE_RATE_PER_BLOCK.
     * Treats block number of 0 as latest completed block.
     * Reverts if block number is in future - need block hash to be defined.
     * NOTE: Each array of receivedTokensGeneral and receivedTokensTo has a maximum length of maxReceive,
     * but their combined length may be greater than maxReceive. The art script should handle this by
     * deterministically shuffling/sampling from the arrays if desired.
     * WARNING: This function is designed for off-chain view calls only and may exceed block gas limits in cases where
     * a token has many senders or is receiving from many tokens. It is not intended to be called within transactions.
     * WARNING: Self-referential SendGeneral and SendTo tokens may be included in the results.
     * @return sendState The send state of the token.
     * @return receiveState The receive state of the token.
     * @return receivedTokensGeneral The received tokens general of the token.
     * @return receivedTokensTo The received tokens to of the token.
     * @return numSendGeneral The number of tokens in the send general pool.
     * @return numReceiveGeneral The number of tokens in the receive general pool.
     * @return numSendingToMe The number of tokens sending to me.
     * @return usedBlockNumber The block number used to generate the random numbers.
     */
    function getLiveData(
        uint256 tokenNumber,
        uint256 blockNumber,
        uint256 maxReceive
    )
        external
        view
        returns (
            SendStates sendState,
            ReceiveStates receiveState,
            TokenLiveData[] memory receivedTokensGeneral,
            TokenLiveData[] memory receivedTokensTo,
            uint256 numSendGeneral,
            uint256 numReceiveGeneral,
            uint256 numSendingToMe,
            uint256 usedBlockNumber
        );

    /**
     * @notice Gets the state of the general pools.
     * @return sendGeneralTokensLength The length of the send general tokens.
     * @return receiveGeneralTokensLength The length of the receive general tokens.
     */
    function getGeneralPoolState()
        external
        view
        returns (
            uint256 sendGeneralTokensLength,
            uint256 receiveGeneralTokensLength
        );

    /**
     * @notice Gets the state of a given token.
     * @param tokenNumber The token number to get the state for.
     * @return sendState The send state.
     * @return receiveState The receive state.
     * @return tokensSendingTo The tokens sending to the token.
     * @return tokensReceivingFrom The tokens receiving from the token.
     * @return activeSlot The active slot.
     * @return activeSlotTokenMetadata The token metadata at the active slot.
     * @return ownerAddress The address of the token owner.
     */
    function getTokenState(
        uint256 tokenNumber
    )
        external
        view
        returns (
            SendStates sendState,
            ReceiveStates receiveState,
            uint16[] memory tokensSendingTo,
            uint16[] memory tokensReceivingFrom,
            uint256 activeSlot,
            TokenMetadataView memory activeSlotTokenMetadata,
            address ownerAddress
        );

    /**
     * @notice Gets the token metadata at a given slot.
     * @param tokenNumber The token number to get the token metadata for.
     * @param slot The slot to get the token metadata for.
     * @return tokenMetadata The token metadata at the given slot.
     */
    function getTokenMetadataAtSlot(
        uint256 tokenNumber,
        uint256 slot
    ) external view returns (TokenMetadataView memory tokenMetadata);

    /**
     * @notice Gets the tokens sending to a given token.
     * WARNING: This function is unbounded in gas cost, and is designed to be used by view accessors only. Use with caution.
     * @param tokenNumber The token number to get the tokens sending to for.
     * @return tokensSendingTo The token numbers sending to the given token.
     */
    function getTokensSendingToToken(
        uint256 tokenNumber
    ) external view returns (uint256[] memory tokensSendingTo);
}
