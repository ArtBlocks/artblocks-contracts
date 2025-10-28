// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";
import {AbstractPMPConfigureHook} from "../configure-hooks/AbstractPMPConfigureHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IDelegationRegistry as IDelegationRegistryV1} from "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import {IDelegateRegistry as IDelegationRegistryV2} from "../../interfaces/v0.8.x/IDelegateRegistry.sol";
import {IPMPConfigureHook} from "../../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";

import {EnumerableSet} from "@openzeppelin-5.0/contracts/utils/structs/EnumerableSet.sol";
import {Initializable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ImmutableUint16Array} from "../../libs/v0.8.x/ImmutableUint16Array.sol";
import {SSTORE2} from "../../libs/v0.8.x/SSTORE2.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";

/**
 * @title SRHooks
 * @author Art Blocks Inc.
 * @notice This hook verifies ownership of any custom squiggle PostParam setting,
 * and injects the squiggle's token hash into the token's PMPs if configured.
 * It supports delegate.xyz V1 and V2, and also allows squiggle #9998 for any address that
 * inscribed the squiggle Relic contract on eth mainnet.
 * It also allows resetting the squiggle token back to default #1981.
 * This hook contract has logic for both the augment and configure hooks.
 * It reverts if the squiggle token id doesn't pass relic or ownership checks during configuring.
 * Ownership checks are performed during configuring, keeping provenance history indexable and preventing
 * effects intuitive during transfers and delegation revocations.
 * If the squiggle token id is configured to be default #1981, the squiggle PostParams will
 * be stripped, allowing the owner to effectively "clear" the squiggle-related PostParams back to default.
 * @dev This contract follows the UUPS (Universal Upgradeable Proxy Standard) pattern.
 * It uses OpenZeppelin's upgradeable contracts and must be deployed behind a proxy.
 * Only the owner can authorize upgrades via the _authorizeUpgrade function, which may
 * be eventually disabled in future versions after to lock project functionality.
 */
contract SRHooks is
    Initializable,
    AbstractPMPAugmentHook,
    AbstractPMPConfigureHook,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using EnumerableSet for EnumerableSet.UintSet;

    address public PMPV0_ADDRESS;

    address public CORE_CONTRACT_ADDRESS;

    uint256 public CORE_PROJECT_ID;

    address public MODERATOR_ADDRESS;

    // constant delegation registry pointers and rights
    IDelegationRegistryV2 public constant DELEGATE_V2 =
        IDelegationRegistryV2(0x00000000000000447e69651d841bD8D104Bed493);
    bytes32 public constant DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS =
        bytes32("postmintparameters");

    // ------ TOKEN METADATA STATE VARIABLES ------

    uint256 public constant NUM_METADATA_SLOTS = 5;

    // struct for the token metadata in storage
    struct TokenMetadata {
        address imageDataAddress; // 20 bytes
        bool isTakedown; // 1 byte, true if moderator took down the slot's metadata
        address soundDataAddress; // 20 bytes
    }

    // struct for the token metadata calldata
    struct TokenMetadataCalldata {
        bool updateImage; // true if updating the image data
        bytes bitmapImageCompressed; // non-empty if updating the image data
        bool updateSound; // true if updating the sound data
        bytes soundDataCompressed; // may be empty to clear the sound data, non-empty if setting the sound data
    }

    /// @notice mapping of token numbers to slot to metadata
    mapping(uint256 tokenNumber => mapping(uint256 slot => TokenMetadata slotMetadata))
        private tokensMetadata;

    /// @notice mapping of token numbers to the active slot
    mapping(uint256 tokenNumber => uint256 activeSlot) private tokensActiveSlot;

    // ------ SEND/RECEIVE STATE (GLOBAL) ------

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

    /// @notice Set of token numbers that are currently in state SendGeneral
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    EnumerableSet.UintSet private _sendGeneralTokens;

    /// @notice Set of token numbers that are currently in state ReceiveGeneral
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    EnumerableSet.UintSet private _receiveGeneralTokens;

    // ------ SEND/RECEIVE STATE (PER TOKEN) ------

    /// @notice Set of token numbers that are sending to a specific token
    // @dev TODO - could develop a custom packed array + index mapping uint16EnumerableSet to improve efficiency vs. OpenZeppelin's EnumerableSet
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    mapping(uint256 receivingTokenNumber => EnumerableSet.UintSet tokensSendingToMe)
        private _tokensSendingToMe;

    /// @notice Array of token numbers that a given token is sending to (when in state SendTo)
    // @dev need only O(1) access (not insertion/removal) for sending tokens, so use an ImmutableUint16Array
    mapping(uint256 sendingTokenNumber => ImmutableUint16Array.Uint16Array tokensSendingTo)
        private _tokensSendingTo;

    /// @notice Array of token numbers that a token is open to receiving from (when in state ReceiveFrom)
    // @dev need only O(1) access (not insertion/removal) for receiving tokens, so use an ImmutableUint16Array
    mapping(uint256 receivingTokenNumber => ImmutableUint16Array.Uint16Array tokensReceivingFrom)
        private _tokensReceivingFrom;

    /**
     * @notice modifier-like internal function to check if an address is the owner or a valid delegate.xyz V2 of the token owner
     */
    function _isOwnerOrDelegate(
        uint256 tokenNumber,
        address addressToCheck
    ) internal view returns (bool) {
        address tokenOwner = IERC721(CORE_CONTRACT_ADDRESS).ownerOf(
            tokenNumber
        );
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        return
            addressToCheck == tokenOwner ||
            DELEGATE_V2.checkDelegateForERC721({
                to: addressToCheck,
                from: tokenOwner,
                contract_: CORE_CONTRACT_ADDRESS,
                tokenId: tokenId,
                rights: DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS
            });
    }

    function _isModerator(address addressToCheck) internal view returns (bool) {
        return addressToCheck == MODERATOR_ADDRESS;
    }

    /// disable initialization in deployed implementation contract for clarity
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the PMPV0 address and sets the owner.
     * @dev This function replaces the constructor for upgradeable contracts.
     * Can only be called once due to the initializer modifier.
     * @param _pmpV0Address The address of the PMPV0 contract.
     * @param _owner The address that will own this contract and authorize upgrades.
     * @param _coreContractAddress The address of the core contract.
     * @param _coreProjectId The project ID of the core contract.
     * @param _moderatorAddress The address of the content moderator.
     */
    function initialize(
        address _pmpV0Address,
        address _owner,
        address _coreContractAddress,
        uint256 _coreProjectId,
        address _moderatorAddress
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        PMPV0_ADDRESS = _pmpV0Address;
        CORE_CONTRACT_ADDRESS = _coreContractAddress;
        CORE_PROJECT_ID = _coreProjectId;
        MODERATOR_ADDRESS = _moderatorAddress;
        // TODO - emit event with relevant state changes
    }

    /**
     * @notice Execution logic to be executed when a token's PMP is configured.
     * Reverts if the squiggle token id is invalid or the liftOwner does not have access to the squiggle token id.
     * @dev This hook is executed after the PMP is configured.
     * @param pmpInput The PMP input that was used to successfully configure the token.
     */
    function onTokenPMPConfigure(
        address /*coreContract*/,
        uint256 /*tokenId*/,
        IPMPV0.PMPInput calldata pmpInput
    ) external view override {
        // only allow PMPV0 to call this hook
        require(msg.sender == PMPV0_ADDRESS, "Only PMPV0 allowed");
        // TODO - only keep this function if we need it for something like locking an image.
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Augments the token parameters as described in the contract natspec doc.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address /* coreContract */,
        uint256 /* tokenId */,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        // create a new augmentedTokenParams array with maximum length of
        // input tokenParams + 1 extra element for the squiggle's token hash
        uint256 originalLength = tokenParams.length;
        uint256 augmentedMaxLength = originalLength + 5; // 5 extra elements for the token metadata fields
        augmentedTokenParams = new IWeb3Call.TokenParam[](augmentedMaxLength);

        // copy original tokenParams to augmentedTokenParams
        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        // append each token metadata field to the augmentedTokenParams array
        // TODO - implement logic (will require SSTORE2 loading from the token metadata stored addresses)

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    function updateModeratorAddress(
        address newModeratorAddress
    ) external onlyOwner {
        // @dev allow setting to zero address to disable moderator functionality
        // EFFECTS
        MODERATOR_ADDRESS = newModeratorAddress;
        // TODO - emit event
    }

    function takedownTokenMetadataSlot(
        uint256 tokenNumber,
        uint256 slot
    ) external {
        // CHECKS
        // msg.sender must be moderator
        require(_isModerator(msg.sender), "Only moderator allowed");
        // slot must be valid
        require(slot < NUM_METADATA_SLOTS, "Invalid slot");
        // slot must not be already takedown
        require(
            !tokensMetadata[tokenNumber][slot].isTakedown,
            "Slot already takedown"
        );
        // EFFECTS
        // takedown the token metadata slot, wiping image and sound data addresses, marking as takedown
        TokenMetadata storage tokenMetadataStorage = tokensMetadata[
            tokenNumber
        ][slot];
        tokenMetadataStorage.isTakedown = true;
        tokenMetadataStorage.imageDataAddress = address(0); // clear the image data address
        tokenMetadataStorage.soundDataAddress = address(0); // clear the sound data address
        // clear the token's send/receive states, only if token is not in SendTo or ReceiveFrom state
        // @dev SendTo and ReceiveFrom states may be expensive for owner to re-build, so we don not clear them,
        // and instead filter on live data viewing accordingly.
        // @dev also mitigates potential moderator abuse by removing potentially large gas usage during SendTo unwinding.
        // send state clearing
        // @dev effectively, this is achieved by removing the token from the general send and receive sets if it is in them
        // and not in SendTo or ReceiveFrom state.
        // @dev okay to optimisitically call remove - it will be a no-op if the token is not in the set
        _sendGeneralTokens.remove(tokenNumber);
        _receiveGeneralTokens.remove(tokenNumber);

        // TODO - emit event
    }

    /**
     * @notice Updates the state and metadata for a given token.
     * Reverts if the token number is invalid or the msg.sender is not owner or valid delegate.xyz V2 of token owner.
     * Reverts if invalid configuration is provided.
     * Includes two boolean flags to update the send and receive states and token metadata separately, in a single function call.
     * @dev This function is used to update the state and metadata for a given token.
     * @param tokenNumber The token number to update.
     * @param updateSendReceiveStates Whether to update the send and receive states.
     * @param sendState The new send state. Valid values are SendGeneral, SendTo, Neutral.
     * @param receiveState The new receive state. Valid values are ReceiveGeneral, ReceiveFrom, Neutral.
     * @param tokensSendingTo Tokens to send this token to. Only non-empty iff sendState is SendTo.
     * @param tokensReceivingFrom Tokens this token is open to receive from. Only non-empty iff receiveState is ReceiveFrom.
     * @param updateTokenMetadata Whether to update the token metadata.
     * @param updatedActiveSlot The new active slot. If updating token metadata, this is the new active slot.
     * @param tokenMetadataCalldata The new token metadata. If updating token metadata, this is the new token metadata at the updated active slot.
     */
    function updateTokenStateAndMetadata(
        uint256 tokenNumber,
        bool updateSendReceiveStates,
        SendStates sendState,
        ReceiveStates receiveState,
        uint16[] memory tokensSendingTo,
        uint16[] memory tokensReceivingFrom,
        bool updateTokenMetadata,
        uint256 updatedActiveSlot,
        TokenMetadataCalldata memory tokenMetadataCalldata
    ) external {
        // CHECKS
        // require token number is valid uint16
        require(tokenNumber < type(uint16).max, "Invalid token number");
        // msg.sender must be owner or valid delegate.xyz V2 of token owner
        // @dev this also checks that the token number is valid (exists and has valid owner)
        require(
            _isOwnerOrDelegate(tokenNumber, msg.sender),
            "Only owner or valid delegate.xyz V2 of token owner allowed"
        );

        // CHECKS-AND-EFFECTS (BRANCHED LOGIC)
        if (updateSendReceiveStates) {
            // CHECKS
            // TODO - add any required checks here (that aren't covered by the internal function)

            // EFFECTS
            // update the token state
            _updateTokenState({
                tokenNumber: tokenNumber,
                sendState: sendState,
                receiveState: receiveState,
                tokensSendingTo: tokensSendingTo,
                tokensReceivingFrom: tokensReceivingFrom
            });
        }
        // CHECKS-AND-EFFECTS (BRANCHED LOGIC)
        if (updateTokenMetadata) {
            // CHECKS
            // @dev internal function validates updated active slot, we already validated token number above

            // EFFECTS
            // update the token metadata
            _updateTokenMetadata({
                tokenNumber: tokenNumber,
                updatedActiveSlot: updatedActiveSlot,
                tokenMetadataCalldata: tokenMetadataCalldata
            });
        }
    }

    /**
     * @notice Updates the token state for a given token.
     * Internal function - assumes token is valid
     * @param tokenNumber The token number to update.
     * @param sendState The new send state. Valid values are SendGeneral, SendTo, Neutral.
     * @param receiveState The new receive state. Valid values are ReceiveGeneral, ReceiveFrom, Neutral.
     * @param tokensSendingTo Tokens to send this token to. Only non-empty iff sendState is SendTo.
     * @param tokensReceivingFrom Tokens this token is open to receive from. Only non-empty iff receiveState is ReceiveFrom.
     */
    function _updateTokenState(
        uint256 tokenNumber,
        SendStates sendState,
        ReceiveStates receiveState,
        uint16[] memory tokensSendingTo,
        uint16[] memory tokensReceivingFrom
    ) internal {
        // CHECKS
        // enforce SendTo arrays
        (sendState == SendStates.SendTo)
            ? require(
                tokensSendingTo.length > 0,
                "Tokens sending to must be non-empty"
            )
            : require(
                tokensSendingTo.length == 0,
                "tokensSendingTo must be empty"
            );
        // enforce ReceiveFrom arrays
        (receiveState == ReceiveStates.ReceiveFrom)
            ? require(
                tokensReceivingFrom.length > 0,
                "Tokens receiving from must be non-empty"
            )
            : require(
                tokensReceivingFrom.length == 0,
                "tokensReceivingFrom must be empty"
            );

        // EFFECTS
        // clear previous send/receive state, based on storage's send/receive state
        // TODO - implement logic
        // populate the new send/receive state
        // TODO - implement logic
        // Call the PMPV0 to update the token state PostParams
        // TODO - emit events for subgraph indexing of any relevant array data
    }

    /**
     * @notice Updates the token metadata for a given token.
     * Internal function - assumes token is valid
     * @param tokenNumber The token number to update.
     * @param updatedActiveSlot The new active slot.
     * @param tokenMetadataCalldata The new token metadata.
     */
    function _updateTokenMetadata(
        uint256 tokenNumber,
        uint256 updatedActiveSlot,
        TokenMetadataCalldata memory tokenMetadataCalldata
    ) internal {
        // CHECKS
        // updatedActiveSlot must be valid
        require(updatedActiveSlot < NUM_METADATA_SLOTS, "Invalid active slot");
        // check that slot is not banned
        TokenMetadata storage tokenMetadataStorage = tokensMetadata[
            tokenNumber
        ][updatedActiveSlot];
        require(!tokenMetadataStorage.isTakedown, "Slot is takedown");

        // EFFECTS
        // update the token metadata
        // image data
        if (tokenMetadataCalldata.updateImage) {
            require(
                tokenMetadataCalldata.bitmapImageCompressed.length > 0,
                "Image data must be provided when updating"
            );
            // @dev image data, compressed + use sstore2 for efficient
            tokenMetadataStorage.imageDataAddress = SSTORE2.write(
                tokenMetadataCalldata.bitmapImageCompressed
            );
        } else {
            require(
                tokenMetadataCalldata.bitmapImageCompressed.length == 0,
                "Image data must be empty when not updating"
            );
        }
        // sound data
        if (tokenMetadataCalldata.updateSound) {
            // allow "clearing" the sound data by providing an empty bytes array
            if (tokenMetadataCalldata.soundDataCompressed.length == 0) {
                tokenMetadataStorage.soundDataAddress = address(0);
                // TODO - emit event
                return;
            } else {
                // @dev sound data, compressed + use sstore2 for efficient
                tokenMetadataStorage.soundDataAddress = SSTORE2.write(
                    tokenMetadataCalldata.soundDataCompressed
                );
            }
        } else {
            require(
                tokenMetadataCalldata.soundDataCompressed.length == 0,
                "Sound data must be empty when not updating"
            );
        }

        // TODO - event
    }

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @dev This function is required by the UUPS pattern and can only be called by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
        // this version allows the owner to upgrade the contract to a new implementation
        // in future versions, we may disable this functionality to lock project functionality
        // to prevent any further upgrades
    }

    /**
     * @notice Gets the send state for a given token.
     * Internal function - assumes token is valid
     * @dev uses derived state to prefer SLOAD over SSTORE for efficiency
     * @param tokenNumber The token number to get the send state for.
     * @return sendState The send state.
     */
    function _getSendState(
        uint256 tokenNumber
    ) internal view returns (SendStates) {
        // check for existence in send general set
        if (_sendGeneralTokens.contains(tokenNumber)) {
            return SendStates.SendGeneral;
        }
        // check for non-empty send to array
        if (!ImmutableUint16Array.isEmpty(_tokensSendingTo[tokenNumber])) {
            return SendStates.SendTo;
        }
        // must be in neutral state
        return SendStates.Neutral;
    }

    /**
     * @notice Gets the receive state for a given token.
     * Internal function - assumes token is valid
     * @dev uses derived state to prefer SLOAD over SSTORE for efficiency
     * @param tokenNumber The token number to get the receive state for.
     * @return receiveState The receive state.
     */
    function _getReceiveState(
        uint256 tokenNumber
    ) internal view returns (ReceiveStates) {
        // check for existence in receive general set
        if (_receiveGeneralTokens.contains(tokenNumber)) {
            return ReceiveStates.ReceiveGeneral;
        }
        // check for non-empty receive from array
        if (!ImmutableUint16Array.isEmpty(_tokensReceivingFrom[tokenNumber])) {
            return ReceiveStates.ReceiveFrom;
        }
        // must be in neutral state
        return ReceiveStates.Neutral;
    }

    /**
     * @notice Checks if the contract supports an interface.
     * @dev This function is required by the ERC165 interface detection pattern.
     * @param interfaceId The interface identifier to check.
     * @return bool True if the contract supports the interface, false otherwise.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AbstractPMPAugmentHook, AbstractPMPConfigureHook)
        returns (bool)
    {
        return
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
