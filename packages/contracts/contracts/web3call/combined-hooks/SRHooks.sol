// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {ISRHooks} from "../../interfaces/v0.8.x/ISRHooks.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IDelegationRegistry as IDelegationRegistryV1} from "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import {IDelegateRegistry as IDelegationRegistryV2} from "../../interfaces/v0.8.x/IDelegateRegistry.sol";
import {IPMPConfigureHook} from "../../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";

import {EnumerableSet} from "@openzeppelin-5.0/contracts/utils/structs/EnumerableSet.sol";
import {SafeCast} from "@openzeppelin-5.0/contracts/utils/math/SafeCast.sol";
import {Initializable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ImmutableUint16Array} from "../../libs/v0.8.x/ImmutableUint16Array.sol";
import {SSTORE2} from "../../libs/v0.8.x/SSTORE2.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {FeistelWalkLib} from "../../libs/v0.8.x/FeistelWalkLib.sol";

/**
 * @title SRHooks
 * @author Art Blocks Inc.
 * @notice This hook tracks the send and receive states of a token, and the metadata for a token.
 * It implements the primary functionality of the SR project, and accepts most calls directly.
 * It acts as a PMPV0 hook, and therefore derives from AbstractPMPAugmentHook.
 * For clear off-chain provenance indexing and efficiency purposes, it emits events as if it were a
 * PMPV0 contract, so it may be indexed directly by off-chain tools, including the Art Blocks subgraph.
 * Some state emit events that may be custom, or may not be directly related to PMPV0, but may still be useful
 * for off-chain indexing and analysis and frontend development.
 * @dev This contract follows the UUPS (Universal Upgradeable Proxy Standard) pattern.
 * It uses OpenZeppelin's upgradeable contracts and must be deployed behind a proxy.
 * Only the owner can authorize upgrades via the _authorizeUpgrade function, which may
 * be eventually disabled in future versions after to lock project functionality.
 */
contract SRHooks is
    Initializable,
    AbstractPMPAugmentHook,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ISRHooks
{
    using EnumerableSet for EnumerableSet.UintSet;
    using ImmutableUint16Array for ImmutableUint16Array.Uint16Array;
    using SafeCast for uint256;

    address public PMPV0_ADDRESS;

    address public CORE_CONTRACT_ADDRESS;

    uint256 public CORE_PROJECT_ID;

    address public MODERATOR_ADDRESS;

    uint256 public constant MAX_IMAGE_DATA_LENGTH = 1024 * 15; // 15 KB, beyond which is unlikely to represent a 64x64 image
    uint256 public constant MAX_SOUND_DATA_LENGTH = 1024 * 10; // 10 KB, beyond which is unlikely to represent a sound

    uint256 internal constant MAX_RECEIVE_RATE_PER_BLOCK = 3 * 12; // 3 tokens per 12s block
    uint256 internal constant BASE_SEND_TO_RATE_PER_MINUTE = 1; // send once per minute, may be diluted by sending to multiple tokens

    uint256 internal constant MAX_SENDING_TO_LENGTH = 25; // 25 tokens, beyond which dilution rate is too low and can inflate live data iteration time
    uint256 internal constant MAX_ITERATIONS_SENDING_TO_ME =
        MAX_RECEIVE_RATE_PER_BLOCK * MAX_SENDING_TO_LENGTH; // cap iterations at dilution rate (25x the receive rate per block) to not meaningfully impact results, but provide a backstop/bounded worst case
    uint256 internal constant MAX_RECEIVING_FROM_ARRAY_LENGTH = 1_000_000; // max receiving from array length is 1k to bound worst case iteration time when getting live data

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
        uint16 imageVersion; // 2 bytes
        bool isTakedown; // 1 byte, true if moderator took down the slot's metadata
        address soundDataAddress; // 20 bytes
        uint16 soundVersion; // 2 bytes
    }

    /// @notice mapping of token numbers to slot to metadata
    mapping(uint256 tokenNumber => mapping(uint256 slot => TokenMetadata slotMetadata))
        private tokensMetadata;

    struct TokenAuxStateData {
        uint8 activeSlot;
        uint16 sendingToLength; // used to calculate dilution rate when sending to multiple tokens
    }

    /// @notice mapping of token numbers to aux state data
    mapping(uint256 tokenNumber => TokenAuxStateData auxStateData)
        private _tokenAuxStateData;

    // ------ SEND/RECEIVE STATE (GLOBAL) ------

    /// @notice Set of token numbers that are currently in state SendGeneral
    // @dev TODO - could develop a custom packed array + index mapping uint16EnumerableSet to improve efficiency vs. OpenZeppelin's EnumerableSet
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    EnumerableSet.UintSet private _sendGeneralTokens;

    /// @notice Set of token numbers that are currently in state ReceiveGeneral
    // @dev TODO - could develop a custom packed array + index mapping uint16EnumerableSet to improve efficiency vs. OpenZeppelin's EnumerableSet
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
     * @notice modifier-like internal function to check if an address is the owner or a valid delegate.xyz V2 of the token owner.
     * @param tokenNumber The token number to check.
     * @param addressToCheck The address to check.
     * @return isOwnerOrDelegate True if the address is the owner or a valid delegate.xyz V2 of the token owner, false otherwise.
     * @return ownerAddress The address of the token owner.
     * @dev This function is used to check if an address is the owner or a valid delegate.xyz V2 of the token owner,
     * and to get the address of the token owner.
     */
    function _isOwnerOrDelegate(
        uint256 tokenNumber,
        address addressToCheck
    ) internal view returns (bool isOwnerOrDelegate, address ownerAddress) {
        ownerAddress = IERC721(CORE_CONTRACT_ADDRESS).ownerOf(tokenNumber);
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        isOwnerOrDelegate =
            addressToCheck == ownerAddress ||
            DELEGATE_V2.checkDelegateForERC721({
                to: addressToCheck,
                from: ownerAddress,
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

        emit Initialized({
            pmpV0Address: _pmpV0Address,
            coreContractAddress: _coreContractAddress,
            coreProjectId: _coreProjectId,
            moderatorAddress: _moderatorAddress
        });
        // emit fake PMPV0 events to be indexed by off-chain tools
        // @dev this allows the contract to be indexed directly by off-chain tools, including the Art Blocks subgraph.
        emit IPMPV0.ProjectHooksConfigured({
            coreContract: _coreContractAddress,
            projectId: _coreProjectId,
            tokenPMPPostConfigHook: IPMPConfigureHook(address(this)),
            tokenPMPReadAugmentationHook: IPMPAugmentHook(address(this))
        });
        emit IPMPV0.ProjectConfigured({
            coreContract: _coreContractAddress,
            projectId: _coreProjectId,
            pmpInputConfigs: _getPMPInputConfigs(),
            projectConfigNonce: 1
        });
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Augments the token parameters by appending the token's active slot's metadata and send/receive states,
     * as well as the token's takedown state.
     * The following fields are appended:
     * - imageData: the hex string of the compressed image data of the token's active slot
     * - soundData: the hex string of the compressed sound data of the token's active slot
     * - isTakedown: the boolean string of the takedown state of the token's active slot
     * - sendState: the string of the send state of the token (SendGeneral, SendTo, Neutral)
     * - receiveState: the string of the receive state of the token (ReceiveGeneral, ReceiveFrom, Neutral)
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address /* coreContract */,
        uint256 tokenId,
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

        // append each token metadata fields (image and sound data addresses) to the augmentedTokenParams array
        // @dev load active slot from storage
        uint256 tokenNumber = ABHelpers.tokenIdToTokenNumber(tokenId);
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        TokenMetadata storage tokenMetadataStorage = tokensMetadata[
            tokenNumber
        ][activeSlot];
        if (tokenMetadataStorage.isTakedown) {
            // if metadata is takedown, return empty strings for both image and sound data
            augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
                key: "imageData",
                value: ""
            });
            augmentedTokenParams[originalLength + 1] = IWeb3Call.TokenParam({
                key: "soundData",
                value: ""
            });
        } else {
            // if metadata is not takedown, return the image and sound data as hex strings
            augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
                key: "imageData",
                value: _getHexStringFromSSTORE2(
                    tokenMetadataStorage.imageDataAddress
                )
            });
            augmentedTokenParams[originalLength + 1] = IWeb3Call.TokenParam({
                key: "soundData",
                value: _getHexStringFromSSTORE2(
                    tokenMetadataStorage.soundDataAddress
                )
            });
        }

        // include takedown state
        augmentedTokenParams[originalLength + 2] = IWeb3Call.TokenParam({
            key: "isTakedown",
            value: tokenMetadataStorage.isTakedown ? "true" : "false"
        });

        // include send and receive states
        // @dev do not use raw variants here, we want to be neutral if in takedown slot
        augmentedTokenParams[originalLength + 3] = IWeb3Call.TokenParam({
            key: "sendState",
            value: _sendStateToString(_getSendState(tokenNumber))
        });
        augmentedTokenParams[originalLength + 4] = IWeb3Call.TokenParam({
            key: "receiveState",
            value: _receiveStateToString(_getReceiveState(tokenNumber))
        });

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    function updateModeratorAddress(
        address newModeratorAddress
    ) external onlyOwner {
        // @dev allow setting to zero address to disable moderator functionality
        // EFFECTS
        MODERATOR_ADDRESS = newModeratorAddress;
        emit ModeratorAddressUpdated(newModeratorAddress);
    }

    /**
     * @notice Takedowns a token metadata slot by a moderator.
     * @param tokenNumber The token number to takedown the metadata slot for.
     * @param slot The slot number to takedown the metadata slot for.
     */
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

        // emit event indicating takedown of token metadata slot by moderator
        emit ISRHooks.TokenMetadataSlotTakedown({
            tokenNumber: tokenNumber,
            slot: slot,
            moderatorAddress: msg.sender
        });
        // emit PMPV0-indexable event for token metadata slot takedown - treat as version bump to sound and image data
        // increment image and sound versions by 1, since takedown is a version bump
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        tokenMetadataStorage.imageVersion += 1;
        tokenMetadataStorage.soundVersion += 1;
        emit IPMPV0.TokenParamsConfigured({
            coreContract: CORE_CONTRACT_ADDRESS,
            tokenId: tokenId,
            pmpInputs: _getPmpInputsForImageDataUpdate({
                slot: slot,
                imageVersion: tokenMetadataStorage.imageVersion
            }),
            authAddresses: _getSingleElementAddressArray(msg.sender)
        });
        emit IPMPV0.TokenParamsConfigured({
            coreContract: CORE_CONTRACT_ADDRESS,
            tokenId: tokenId,
            pmpInputs: _getPmpInputsForSoundDataUpdate({
                slot: slot,
                soundVersion: tokenMetadataStorage.soundVersion
            }),
            authAddresses: _getSingleElementAddressArray(msg.sender)
        });
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
    ) external {
        // CHECKS
        // require token number is valid uint16
        require(tokenNumber < type(uint16).max, "Invalid token number");
        // msg.sender must be owner or valid delegate.xyz V2 of token owner
        // @dev this also checks that the token number is valid (exists and has valid owner)
        (bool isOwnerOrDelegate, address ownerAddress) = _isOwnerOrDelegate(
            tokenNumber,
            msg.sender
        );
        require(
            isOwnerOrDelegate,
            "Only owner or valid delegate.xyz V2 of token owner allowed"
        );
        require(
            updateSendState || updateReceiveState || updateTokenMetadata,
            "At least one update must be provided"
        );

        // CHECKS-AND-EFFECTS (BRANCHED LOGIC)
        // update token metadata FIRST, to lock in slot's takedown state prior to any S/R state updates (dependent on takedown state)
        if (updateTokenMetadata) {
            // EFFECTS
            // update the token metadata
            _updateTokenMetadata({
                tokenNumber: tokenNumber,
                updatedActiveSlot: updatedActiveSlot,
                tokenMetadataCalldata: tokenMetadataCalldata,
                ownerAddress: ownerAddress
            });
        }

        // update send/receive states SECOND, based on any updated takedown state from token metadata update
        if (updateSendState) {
            _updateSendState({
                tokenNumber: tokenNumber,
                sendState: sendState,
                tokensSendingTo: tokensSendingTo,
                ownerAddress: ownerAddress
            });
        }
        if (updateReceiveState) {
            _updateReceiveState({
                tokenNumber: tokenNumber,
                receiveState: receiveState,
                tokensReceivingFrom: tokensReceivingFrom,
                ownerAddress: ownerAddress
            });
        }
    }

    /**
     * @notice Gets the live data for a given token.
     * @param tokenNumber The token number to get the live data for.
     * @param blockNumber The block number to get the live data for. Must be in latest 256 blocks.
     * Treats block number of 0 as latest completed block.
     * Reverts if block number is in future - need block hash to be defined.
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
        )
    {
        // CHECKS
        // treat block number of 0 as latest completed block
        if (blockNumber == 0) {
            blockNumber = block.number - 1; // get previous block hash (latest possible block hash)
        }
        if (blockNumber > block.number - 1) {
            revert("Block number in future - need block hash to be defined");
        }
        // ensure we get a valid block hash (must be in latest 256 blocks)
        bytes32 blockhash_ = blockhash(blockNumber); // returns zero if not in latest 256 blocks
        require(
            blockhash_ != bytes32(0),
            "block hash not available - must be in lastest 256 blocks"
        );

        // populate send and receive states (use functions that account for takedown state)
        sendState = _getSendState(tokenNumber);
        receiveState = _getReceiveState(tokenNumber);

        // case: neutral receiving state - no tokens received
        if (receiveState == ReceiveStates.Neutral) {
            return (
                sendState,
                receiveState,
                new TokenLiveData[](0),
                new TokenLiveData[](0)
            );
        }

        // case: receiveGeneral state - all tokens received - sample from general pool
        if (receiveState == ReceiveStates.ReceiveGeneral) {
            receivedTokensGeneral = _getReceivedTokensGeneral({
                tokenNumber: tokenNumber,
                blockhash_: blockhash_
            });
            receivedTokensTo = _getReceivedTokensTo({
                tokenNumber: tokenNumber,
                blockhash_: blockhash_
            });
            return (
                sendState,
                receiveState,
                receivedTokensGeneral,
                receivedTokensTo
            );
        }

        // case: receiveFrom state - only tokens received from specific tokens
        if (receiveState == ReceiveStates.ReceiveFrom) {
            (receivedTokensGeneral, receivedTokensTo) = _getTokensReceivedFrom({
                tokenNumber: tokenNumber,
                blockhash_: blockhash_
            });
            return (
                sendState,
                receiveState,
                receivedTokensGeneral,
                receivedTokensTo
            );
        }
    }

    /**
     * @notice Gets the received tokens general for a given token.
     * Assumes token is receiving generally.
     * @param tokenNumber The token number to get the received tokens general for.
     * @param blockhash_ The block hash to get the received tokens general for.
     * @return receivedTokensGeneral The received tokens general.
     */
    function _getReceivedTokensGeneral(
        uint256 tokenNumber,
        bytes32 blockhash_
    ) internal view returns (TokenLiveData[] memory) {
        // calculate the general pool's send rate, based on general ratio of sending and receiving tokens
        uint256 generalPoolLength = _sendGeneralTokens.length();
        uint256 receiveRatePerBlock = (generalPoolLength * 12) /
            _receiveGeneralTokens.length(); // 1 per second if equal send/receive rates
        if (receiveRatePerBlock == 0 && generalPoolLength > 0) {
            receiveRatePerBlock = 1; // don't round down to 0
        }
        // sample from general pool, based on send rate
        bytes32 seed = keccak256(abi.encodePacked(blockhash_, tokenNumber));
        uint256 quantity = receiveRatePerBlock;
        return
            _sampleFromGeneralPool({
                seed: seed,
                quantity: quantity,
                generalPoolLength: generalPoolLength
            });
    }

    /**
     * @notice Samples tokens from the general sending pool using an affine walk.
     * @dev Uses AffineWalkLib for efficient pseudo-random sampling over the EnumerableSet.
     * @param seed The seed for pseudo-randomness.
     * @param quantity The number of tokens to sample.
     * @return result Array of TokenLiveData for sampled tokens.
     */
    function _sampleFromGeneralPool(
        bytes32 seed,
        uint256 quantity,
        uint256 generalPoolLength
    ) internal view returns (TokenLiveData[] memory) {
        // perform Feistel walk to sample token numbers from the set
        FeistelWalkLib.Plan memory plan = FeistelWalkLib.makePlan({
            seed: seed,
            N: generalPoolLength
        });
        uint256[] memory sampledTokenIndices = FeistelWalkLib.sample(
            plan,
            quantity
        );
        // populate TokenLiveData for each sampled token
        uint256 sampledCount = sampledTokenIndices.length;
        TokenLiveData[] memory result = new TokenLiveData[](sampledCount);
        // @dev pull project id and core contract address into memory for efficient sload minimization
        uint256 _projectId = CORE_PROJECT_ID;
        address _coreContractAddress = CORE_CONTRACT_ADDRESS;
        for (uint256 i = 0; i < sampledCount; i++) {
            uint256 tokenNumber = _sendGeneralTokens.at(sampledTokenIndices[i]);
            uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
                projectId: _projectId,
                tokenNumber: tokenNumber
            });
            result[i] = _getTokenLiveDataForToken({
                tokenNumber: tokenNumber,
                tokenId: tokenId,
                coreContractAddress: _coreContractAddress
            });
        }
        return result;
    }

    /**
     * @notice Gets the live data for a specific token.
     * @dev Fetches token owner and metadata from storage.
     * @param tokenNumber The token number to get live data for.
     * @return liveData The TokenLiveData struct for the token.
     */
    function _getTokenLiveDataForToken(
        uint256 tokenNumber,
        uint256 tokenId,
        address coreContractAddress
    ) internal view returns (TokenLiveData memory liveData) {
        // get owner address
        address ownerAddress = IERC721(coreContractAddress).ownerOf(tokenId);

        // get active slot and metadata
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        TokenMetadata storage metadata = tokensMetadata[tokenNumber][
            activeSlot
        ];

        // populate live data
        liveData.tokenNumber = tokenNumber;
        liveData.ownerAddress = ownerAddress;

        // get image and sound data if not taken down
        if (!metadata.isTakedown) {
            if (metadata.imageDataAddress != address(0)) {
                liveData.imageDataCompressed = SSTORE2.read(
                    metadata.imageDataAddress
                );
            }
            if (metadata.soundDataAddress != address(0)) {
                liveData.soundDataCompressed = SSTORE2.read(
                    metadata.soundDataAddress
                );
            }
        }

        return liveData;
    }

    /**
     * @notice Gets the received tokens to for a given token.
     * Assumes token is receiving generally.
     * @param tokenNumber The token number to get the received tokens to for.
     * @param blockhash_ The block hash to get the received tokens to for.
     * @return receivedTokensTo The received tokens to.
     */
    function _getReceivedTokensTo(
        uint256 tokenNumber,
        bytes32 blockhash_
    ) internal view returns (TokenLiveData[] memory) {
        // we will iterate continuously over the tokens sending to me, and statistically include it
        // based on dilution rate, as well as if it has been taken down.
        // we do not sample from the general pool, since we are already sampling from it for the general tokens.
        // we perform a Feistel walk to sample token numbers from the set, and then get the live data for each token.
        uint256 sendingToMeLength = _tokensSendingToMe[tokenNumber].length();
        if (sendingToMeLength == 0) {
            return new TokenLiveData[](0); // no tokens sending to me, return empty array
        }
        // iterate over the tokens sending to me, and statistically include it based on dilution rate, as well as if it has been taken down.
        // perform Feistel walk to sample token numbers from the set
        bytes32 seed = keccak256(abi.encodePacked(blockhash_, tokenNumber));
        FeistelWalkLib.Plan memory plan = FeistelWalkLib.makePlan({
            seed: seed,
            N: sendingToMeLength
        });
        // iterate and live pull each next index, since indeterministically sampled from the set
        // optimistically create array of max length of token numbers sending to me, since we don't know the exact length until the end
        uint256[] memory selectedTokenNumbers = new uint256[](
            MAX_RECEIVE_RATE_PER_BLOCK
        );
        uint256 selectedTokenNumbersLength = 0;
        uint256 maxIterations = sendingToMeLength > MAX_ITERATIONS_SENDING_TO_ME
            ? MAX_ITERATIONS_SENDING_TO_ME
            : sendingToMeLength;
        for (uint256 i = 0; i < maxIterations; i++) {
            uint256 sampledTokenIndex = FeistelWalkLib.index(plan, i);
            uint256 sampledTokenNumber = _tokensSendingToMe[tokenNumber].at(
                sampledTokenIndex
            );
            // check if token has been taken down, and if so, skip
            TokenAuxStateData storage tokenAuxStateData_ = _tokenAuxStateData[
                sampledTokenNumber
            ];
            if (
                tokensMetadata[sampledTokenNumber][
                    tokenAuxStateData_.activeSlot
                ].isTakedown
            ) {
                continue;
            }
            // statistically include it based on dilution rate
            uint256 bpsChanceOfInclusion = tokenAuxStateData_.sendingToLength >
                0
                ? (((10_000 * (BASE_SEND_TO_RATE_PER_MINUTE * 12)) /
                    tokenAuxStateData_.sendingToLength) * 60) // 10_000 bps, 12s per block, 60s per minute
                : 0;
            if (
                _randomBps(
                    bpsChanceOfInclusion,
                    keccak256(abi.encodePacked(seed, sampledTokenNumber, i))
                )
            ) {
                // statistically include it
                selectedTokenNumbers[
                    selectedTokenNumbersLength
                ] = sampledTokenNumber;
                selectedTokenNumbersLength++;
            }
            // if we have selected the maximum number of tokens, break
            if (selectedTokenNumbersLength >= MAX_RECEIVE_RATE_PER_BLOCK) {
                break;
            }
        }
        // allocate array of TokenLiveData for the selected token numbers
        TokenLiveData[] memory selectedTokenLiveData = new TokenLiveData[](
            selectedTokenNumbersLength
        );
        // @dev pull project id and core contract address into memory for efficient sload minimization
        uint256 _projectId = CORE_PROJECT_ID;
        address _coreContractAddress = CORE_CONTRACT_ADDRESS;
        // for each selected token number, get the live data
        for (uint256 i = 0; i < selectedTokenNumbersLength; i++) {
            uint256 selectedTokenNumber = selectedTokenNumbers[i];
            uint256 selectedTokenId = ABHelpers
                .tokenIdFromProjectIdAndTokenNumber({
                    projectId: _projectId,
                    tokenNumber: selectedTokenNumber
                });
            selectedTokenLiveData[i] = _getTokenLiveDataForToken({
                tokenNumber: selectedTokenNumber,
                tokenId: selectedTokenId,
                coreContractAddress: _coreContractAddress
            });
        }
        return selectedTokenLiveData;
    }

    /**
     * @notice Randomly determines if an event should occur based on a given BPS chance.
     * @param bps The BPS chance of the event occurring.
     * @param prng prng
     * @return true if the event should occur, false otherwise.
     */
    function _randomBps(
        uint256 bps,
        bytes32 prng
    ) internal pure returns (bool) {
        return uint256(prng) % 10_000 < bps;
    }

    /**
     * @notice Gets the tokens received from a given token.
     * @param tokenNumber The token number to get the tokens received from.
     * @param blockhash_ The blockhash to use for pseudo-randomness.
     * @return tokensReceivedFromGeneral The tokens received from the general pool.
     * @return tokensReceivedFromTo The tokens received to the specific tokens.
     */
    function _getTokensReceivedFrom(
        uint256 tokenNumber,
        bytes32 blockhash_
    )
        internal
        view
        returns (
            TokenLiveData[] memory tokensReceivedFromGeneral,
            TokenLiveData[] memory tokensReceivedFromTo
        )
    {
        // load the tokens receiving from into memory for efficient SSTORE2 load minimization
        uint16[] memory tokensReceivingFrom = _tokensReceivingFrom[tokenNumber]
            .getAll();
        uint256 receivingFromMeLength = tokensReceivingFrom.length;
        // we will iterate continuously over the tokens receiving from me, and include it if from the general pool,
        // or statistically include it if it is a sendingTo token to me.
        // if the token is not sending to me, or not sending generally, we skip it.
        // we perform a Feistel walk to sample token numbers from the set, and then get the live data for each token.
        if (receivingFromMeLength == 0) {
            return (new TokenLiveData[](0), new TokenLiveData[](0)); // no tokens receiving from me, return empty arrays
        }
        // iterate over the tokens receiving from me, and statistically include it based on dilution rate, as well as if it has been taken down.
        // perform Feistel walk to sample token numbers from the set
        bytes32 seed = keccak256(abi.encodePacked(blockhash_, tokenNumber));
        FeistelWalkLib.Plan memory plan = FeistelWalkLib.makePlan({
            seed: seed,
            N: receivingFromMeLength
        });

        // GENERAL TOKEN ITERATION

        // iterate and live pull each next index, since indeterministically sampled from the set
        // stream the results during each iteration
        // @dev receiving from me length is capped at MAX_RECEIVING_FROM_ARRAY_LENGTH to bound worst case iteration time when getting live data
        // optimistically create array of max length of token numbers receiving from, since we don't know the exact length until the end
        uint256[] memory selectedTokenNumbersTo = new uint256[](
            MAX_RECEIVE_RATE_PER_BLOCK
        );
        uint256 selectedTokenNumbersToLength = 0;
        for (uint256 i = 0; i < receivingFromMeLength; i++) {
            uint256 sampledTokenNumber;
            {
                uint256 sampledTokenIndex = FeistelWalkLib.index(plan, i);
                sampledTokenNumber = tokensReceivingFrom[sampledTokenIndex];
            }
            // check if token has been taken down, and if so, skip
            if (
                tokensMetadata[sampledTokenNumber][
                    _tokenAuxStateData[sampledTokenNumber].activeSlot
                ].isTakedown
            ) {
                continue;
            }
            // if sending generally, include it for sure
            if (_sendGeneralTokens.contains(sampledTokenNumber)) {
                // send general tokens are handled in the general token iteration
                continue;
            } else if (
                _tokensSendingToMe[tokenNumber].contains(sampledTokenNumber)
            ) {
                // statistically include it based on dilution rate
                uint256 bpsChanceOfInclusion = _tokenAuxStateData[
                    sampledTokenNumber
                ].sendingToLength > 0
                    ? (((10_000 * (BASE_SEND_TO_RATE_PER_MINUTE * 12)) /
                        _tokenAuxStateData[sampledTokenNumber]
                            .sendingToLength) * 60) // 10_000 bps, 12s per block, 60s per minute
                    : 0;
                if (
                    _randomBps(
                        bpsChanceOfInclusion,
                        keccak256(abi.encodePacked(seed, sampledTokenNumber, i))
                    )
                ) {
                    selectedTokenNumbersTo[
                        selectedTokenNumbersToLength
                    ] = sampledTokenNumber;
                    selectedTokenNumbersToLength++;
                }
            }
            // if we have selected the maximum number of tokens, break
            if (
                // selectedTokenNumbersGeneralLength +
                selectedTokenNumbersToLength >= MAX_RECEIVE_RATE_PER_BLOCK
            ) {
                break;
            }
        }

        // SEND TO TOKEN ITERATION

        // execute same iteration, but for send to tokens
        // @dev cannot simultaneously iterate over general and send to due to stack too deep limitations
        uint256[] memory selectedTokenNumbersGeneral = new uint256[](
            MAX_RECEIVE_RATE_PER_BLOCK
        );
        uint256 selectedTokenNumbersGeneralLength = 0;
        for (uint256 i = 0; i < receivingFromMeLength; i++) {
            uint256 sampledTokenNumber;
            {
                uint256 sampledTokenIndex = FeistelWalkLib.index(plan, i);
                sampledTokenNumber = tokensReceivingFrom[sampledTokenIndex];
            }
            // check if token has been taken down, and if so, skip
            if (
                tokensMetadata[sampledTokenNumber][
                    _tokenAuxStateData[sampledTokenNumber].activeSlot
                ].isTakedown
            ) {
                continue;
            }
            // if sending generally, include it for sure
            if (_sendGeneralTokens.contains(sampledTokenNumber)) {
                selectedTokenNumbersGeneral[
                    selectedTokenNumbersGeneralLength
                ] = sampledTokenNumber;
                selectedTokenNumbersGeneralLength++;
            }
            // if we have selected the maximum number of tokens, break
            if (
                selectedTokenNumbersGeneralLength >= MAX_RECEIVE_RATE_PER_BLOCK
            ) {
                break;
            }
        }

        // allocate array of TokenLiveData for the selected general token numbers
        tokensReceivedFromGeneral = new TokenLiveData[](
            selectedTokenNumbersGeneralLength
        );
        // @dev pull project id and core contract address into memory for efficient sload minimization
        uint256 _projectId = CORE_PROJECT_ID;
        address _coreContractAddress = CORE_CONTRACT_ADDRESS;
        // for each selected general token number, get the live data
        for (uint256 i = 0; i < selectedTokenNumbersGeneralLength; i++) {
            uint256 selectedTokenNumber = selectedTokenNumbersGeneral[i];
            tokensReceivedFromGeneral[i] = _getTokenLiveDataForToken({
                tokenNumber: selectedTokenNumber,
                tokenId: ABHelpers.tokenIdFromProjectIdAndTokenNumber({
                    projectId: _projectId,
                    tokenNumber: selectedTokenNumber
                }),
                coreContractAddress: _coreContractAddress
            });
        }
        // allocate array of TokenLiveData for the selected to token numbers
        tokensReceivedFromTo = new TokenLiveData[](
            selectedTokenNumbersToLength
        );
        // for each selected to token number, get the live data
        for (uint256 i = 0; i < selectedTokenNumbersToLength; i++) {
            uint256 selectedTokenNumber = selectedTokenNumbersTo[i];
            tokensReceivedFromTo[i] = _getTokenLiveDataForToken({
                tokenNumber: selectedTokenNumber,
                tokenId: ABHelpers.tokenIdFromProjectIdAndTokenNumber({
                    projectId: _projectId,
                    tokenNumber: selectedTokenNumber
                }),
                coreContractAddress: _coreContractAddress
            });
        }
        return (tokensReceivedFromGeneral, tokensReceivedFromTo);
    }

    /**
     * @notice Updates the token metadata for a given token.
     * Internal function - assumes token is valid
     * @param tokenNumber The token number to update.
     * @param updatedActiveSlot The new active slot.
     * @param tokenMetadataCalldata The new token metadata.
     * @param ownerAddress The address of the token owner.
     */
    function _updateTokenMetadata(
        uint256 tokenNumber,
        uint256 updatedActiveSlot,
        TokenMetadataCalldata memory tokenMetadataCalldata,
        address ownerAddress
    ) internal {
        // CHECKS
        // updatedActiveSlot must be valid
        require(updatedActiveSlot < NUM_METADATA_SLOTS, "Invalid active slot");
        // never allow updating to a takedown slot
        TokenMetadata storage tokenMetadataStorage = tokensMetadata[
            tokenNumber
        ][updatedActiveSlot];
        require(!tokenMetadataStorage.isTakedown, "Slot is takedown");

        // EFFECTS
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        // update the token metadata
        // image data
        if (tokenMetadataCalldata.updateImage) {
            require(
                tokenMetadataCalldata.imageDataCompressed.length > 0,
                "Image data must be provided when updating"
            );
            require(
                tokenMetadataCalldata.imageDataCompressed.length <=
                    MAX_IMAGE_DATA_LENGTH,
                "Image data must be less than or equal to MAX_IMAGE_DATA_LENGTH"
            );
            // @dev image data, compressed + use sstore2 for efficient
            tokenMetadataStorage.imageDataAddress = SSTORE2.write(
                tokenMetadataCalldata.imageDataCompressed
            );
            tokenMetadataStorage.imageVersion += 1;
            // emit PMPV0-indexable event for image data update
            emit IPMPV0.TokenParamsConfigured({
                coreContract: CORE_CONTRACT_ADDRESS,
                tokenId: tokenId,
                pmpInputs: _getPmpInputsForImageDataUpdate({
                    slot: updatedActiveSlot,
                    imageVersion: tokenMetadataStorage.imageVersion
                }),
                authAddresses: _getSingleElementAddressArray(ownerAddress)
            });
        } else {
            require(
                tokenMetadataCalldata.imageDataCompressed.length == 0,
                "Image data must be empty when not updating"
            );
        }
        // sound data
        if (tokenMetadataCalldata.updateSound) {
            // allow "clearing" the sound data by providing an empty bytes array
            if (tokenMetadataCalldata.soundDataCompressed.length == 0) {
                tokenMetadataStorage.soundDataAddress = address(0);
                tokenMetadataStorage.soundVersion += 1;
                // emit PMPV0-indexable event for sound data update
                emit IPMPV0.TokenParamsConfigured({
                    coreContract: CORE_CONTRACT_ADDRESS,
                    tokenId: tokenId,
                    pmpInputs: _getPmpInputsForSoundDataUpdate({
                        slot: updatedActiveSlot,
                        soundVersion: tokenMetadataStorage.soundVersion
                    }),
                    authAddresses: _getSingleElementAddressArray(ownerAddress)
                });
            } else {
                require(
                    tokenMetadataCalldata.soundDataCompressed.length <=
                        MAX_SOUND_DATA_LENGTH,
                    "Sound data must be less than or equal to MAX_SOUND_DATA_LENGTH"
                );
                // @dev sound data, compressed + use sstore2 for efficient
                tokenMetadataStorage.soundDataAddress = SSTORE2.write(
                    tokenMetadataCalldata.soundDataCompressed
                );
                tokenMetadataStorage.soundVersion += 1;
                // emit PMPV0-indexable event for sound data update
                emit IPMPV0.TokenParamsConfigured({
                    coreContract: CORE_CONTRACT_ADDRESS,
                    tokenId: tokenId,
                    pmpInputs: _getPmpInputsForSoundDataUpdate({
                        slot: updatedActiveSlot,
                        soundVersion: tokenMetadataStorage.soundVersion
                    }),
                    authAddresses: _getSingleElementAddressArray(ownerAddress)
                });
            }
        } else {
            require(
                tokenMetadataCalldata.soundDataCompressed.length == 0,
                "Sound data must be empty when not updating"
            );
        }
        // update the token's active slot if it has changed
        if (_tokenAuxStateData[tokenNumber].activeSlot != updatedActiveSlot) {
            // update value and emit PMPV0-indexable event for active slot update
            _tokenAuxStateData[tokenNumber].activeSlot = updatedActiveSlot
                .toUint8();
            emit IPMPV0.TokenParamsConfigured({
                coreContract: CORE_CONTRACT_ADDRESS,
                tokenId: tokenId,
                pmpInputs: _getPmpInputsForActiveSlotUpdate(updatedActiveSlot),
                authAddresses: _getSingleElementAddressArray(ownerAddress)
            });
        }
    }

    /**
     * @notice Updates the send state for a given token.
     * Internal function - assumes token is valid
     * Assumes any interactions with send state and receive state are handled by the parent function.
     * @param tokenNumber The token number to update.
     * @param sendState The new send state. Valid values are SendGeneral, SendTo, Neutral.
     * @param tokensSendingTo Tokens to send this token to. Only non-empty iff sendState is SendTo.
     * @param ownerAddress The address of the token owner.
     */
    function _updateSendState(
        uint256 tokenNumber,
        SendStates sendState,
        uint16[] memory tokensSendingTo,
        address ownerAddress
    ) internal {
        // CHECKS
        // enforce SendTo arrays length
        (sendState == SendStates.SendTo)
            ? require(
                tokensSendingTo.length > 0,
                "tokensSendingTo must be non-empty"
            )
            : require(
                tokensSendingTo.length == 0,
                "tokensSendingTo must be empty"
            );
        // enforce tokensSendingTo length is not too long
        require(
            tokensSendingTo.length <= MAX_SENDING_TO_LENGTH,
            "tokensSendingTo must be less than or equal to MAX_SENDING_TO_LENGTH"
        );
        // never allow updating a takedown slot
        // @dev load active slot from storage
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        require(
            !tokensMetadata[tokenNumber][activeSlot].isTakedown,
            "Slot is takedown - cannot update send state while in takedown slot"
        );

        // EFFECTS
        // Step 1. clear previous send state, based on storage's send state
        // @dev use raw variant to avoid expense of double checking takedown state, since we already checked it above
        SendStates previousSendState = _getSendStateRaw(tokenNumber);
        if (previousSendState == SendStates.SendGeneral) {
            // simply remove the token from the send general set
            _sendGeneralTokens.remove(tokenNumber);
        } else if (previousSendState == SendStates.SendTo) {
            // pop from every previous token's "sending to me" set, which is a O(n) operation for n tokens previously sent to
            // @dev pull into memory for efficient sload minimization
            uint16[] memory previousTokensSendingTo = _tokensSendingTo[
                tokenNumber
            ].getAll();
            uint256 previousTokensSendingToLength = previousTokensSendingTo
                .length;
            for (uint256 i = 0; i < previousTokensSendingToLength; i++) {
                uint256 sendingToTokenNumber = previousTokensSendingTo[i];
                _tokensSendingToMe[sendingToTokenNumber].remove(tokenNumber);
            }
            // clear my previous send to array
            _tokensSendingTo[tokenNumber].clear();
            _tokenAuxStateData[tokenNumber].sendingToLength = 0; // wipe the sending to length to 0
        }
        // case: neutral state - no-op

        // Step 2. populate the new send state
        if (sendState == SendStates.SendGeneral) {
            _sendGeneralTokens.add(tokenNumber);
        } else if (sendState == SendStates.SendTo) {
            // push the tokens to my send to array
            _tokensSendingTo[tokenNumber].store(tokensSendingTo);
            // push me into every token's "sending to me" set
            uint256 tokensSendingToLength = tokensSendingTo.length;
            for (uint256 i = 0; i < tokensSendingToLength; i++) {
                uint256 sendingToTokenNumber = tokensSendingTo[i];
                _tokensSendingToMe[sendingToTokenNumber].add(tokenNumber);
            }
            _tokenAuxStateData[tokenNumber]
                .sendingToLength = tokensSendingToLength.toUint16(); // update the sending to length for dilution rate calculations
        }
        // case: neutral state - no-op

        // emit PMPV0-indexable event for send state update
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        emit IPMPV0.TokenParamsConfigured({
            coreContract: CORE_CONTRACT_ADDRESS,
            tokenId: tokenId,
            pmpInputs: _getPmpInputsForSendStateUpdate(sendState),
            authAddresses: _getSingleElementAddressArray(ownerAddress)
        });
    }

    /**
     * @notice Updates the receive state for a given token.
     * Internal function - assumes token is valid
     * Assumes any interactions with send state and receive state are handled by the parent function.
     * @param tokenNumber The token number to update.
     * @param receiveState The new receive state. Valid values are ReceiveGeneral, ReceiveFrom, Neutral.
     * @param tokensReceivingFrom Tokens this token is open to receive from. Only non-empty iff receiveState is ReceiveFrom.
     * @param ownerAddress The address of the token owner.
     */
    function _updateReceiveState(
        uint256 tokenNumber,
        ReceiveStates receiveState,
        uint16[] memory tokensReceivingFrom,
        address ownerAddress
    ) internal {
        // CHECKS
        // enforce ReceiveFrom arrays length
        (receiveState == ReceiveStates.ReceiveFrom)
            ? require(
                tokensReceivingFrom.length > 0,
                "tokensReceivingFrom must be non-empty"
            )
            : require(
                tokensReceivingFrom.length == 0,
                "tokensReceivingFrom must be empty"
            );
        // enforce tokensReceivingFrom length is not too long
        require(
            tokensReceivingFrom.length <= MAX_RECEIVING_FROM_ARRAY_LENGTH,
            "tokensReceivingFrom must be less than or equal to MAX_RECEIVING_FROM_ARRAY_LENGTH"
        );
        // never allow updating a takedown slot
        // @dev load active slot from storage
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        require(
            !tokensMetadata[tokenNumber][activeSlot].isTakedown,
            "Slot is takedown - cannot update receive state while in takedown slot"
        );

        // EFFECTS
        // Step 1. clear previous receive state, based on storage's receive state
        // @dev use raw variant to avoid expense of double checking takedown state, since we already checked it above
        ReceiveStates previousReceiveState = _getReceiveStateRaw(tokenNumber);
        if (previousReceiveState == ReceiveStates.ReceiveGeneral) {
            // simply remove the token from the receive general set
            _receiveGeneralTokens.remove(tokenNumber);
        } else if (previousReceiveState == ReceiveStates.ReceiveFrom) {
            // simple removal of my receive from array - we don't have a reverse mapping of the array across other tokens
            _tokensReceivingFrom[tokenNumber].clear();
        }
        // case: neutral state - no-op

        // Step 2. populate the new receive state
        if (receiveState == ReceiveStates.ReceiveGeneral) {
            _receiveGeneralTokens.add(tokenNumber);
        } else if (receiveState == ReceiveStates.ReceiveFrom) {
            _tokensReceivingFrom[tokenNumber].store(tokensReceivingFrom);
        }
        // case: neutral state - no-op

        // emit PMPV0-indexable event for receive state update
        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        emit IPMPV0.TokenParamsConfigured({
            coreContract: CORE_CONTRACT_ADDRESS,
            tokenId: tokenId,
            pmpInputs: _getPmpInputsForReceiveStateUpdate(receiveState),
            authAddresses: _getSingleElementAddressArray(ownerAddress)
        });
    }

    /**
     * @notice Gets the send state for a given token, accounting for takedown state.
     * Internal function - assumes token is valid
     * @param tokenNumber The token number to get the send state for.
     * @return sendState The send state.
     */
    function _getSendState(
        uint256 tokenNumber
    ) internal view returns (SendStates) {
        // @dev load active slot from storage
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        // if slot is takedown, return neutral state
        if (tokensMetadata[tokenNumber][activeSlot].isTakedown) {
            return SendStates.Neutral;
        }
        return _getSendStateRaw(tokenNumber);
    }

    /**
     * @notice Gets the send state for a given token, not accounting for takedown state.
     * Provides cheaper access to derived send state if takedown state was already checked.
     * Internal function - assumes token is valid
     * @dev uses derived state to prefer SLOAD over SSTORE for efficiency
     * @param tokenNumber The token number to get the send state for.
     * @return sendState The send state.
     */
    function _getSendStateRaw(
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
     * @notice Converts a send state to a string.
     * Internal function - assumes send state is valid
     * @param sendState The send state to convert to a string.
     * @return string The string representation of the send state.
     */
    function _sendStateToString(
        SendStates sendState
    ) internal pure returns (string memory) {
        return
            sendState == SendStates.SendGeneral
                ? "SendGeneral"
                : sendState == SendStates.SendTo
                ? "SendTo"
                : "Neutral";
    }

    /**
     * @notice Converts a receive state to a string.
     * Internal function - assumes receive state is valid
     * @param receiveState The receive state to convert to a string.
     * @return string The string representation of the receive state.
     */
    function _receiveStateToString(
        ReceiveStates receiveState
    ) internal pure returns (string memory) {
        return
            receiveState == ReceiveStates.ReceiveGeneral
                ? "ReceiveGeneral"
                : receiveState == ReceiveStates.ReceiveFrom
                ? "ReceiveFrom"
                : "Neutral";
    }

    /**
     * @notice Gets the receive state for a given token, accounting for takedown state.
     * Internal function - assumes token is valid
     * @param tokenNumber The token number to get the receive state for.
     * @return receiveState The receive state.
     */
    function _getReceiveState(
        uint256 tokenNumber
    ) internal view returns (ReceiveStates) {
        // @dev load active slot from storage
        uint256 activeSlot = _tokenAuxStateData[tokenNumber].activeSlot;
        // if slot is takedown, return neutral state
        if (tokensMetadata[tokenNumber][activeSlot].isTakedown) {
            return ReceiveStates.Neutral;
        }
        return _getReceiveStateRaw(tokenNumber);
    }

    /**
     * @notice Gets the receive state for a given token, not accounting for takedown state.
     * Provides cheaper access to derived receive state if takedown state was already checked.
     * Internal function - assumes token is valid
     * @dev uses derived state to prefer SLOAD over SSTORE for efficiency
     * @param tokenNumber The token number to get the receive state for.
     * @return receiveState The receive state.
     */
    function _getReceiveStateRaw(
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

    function _getHexStringFromSSTORE2(
        address sstore2Address
    ) internal view returns (string memory) {
        // case: empty sstore2 address
        if (sstore2Address == address(0)) {
            return "";
        }
        // case: non-empty sstore2 address
        return toHexString(SSTORE2.read(sstore2Address));
    }

    /**
     * @notice Checks if the contract supports an interface.
     * @dev This function is required by the ERC165 interface detection pattern.
     * @param interfaceId The interface identifier to check.
     * @return bool True if the contract supports the interface, false otherwise.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AbstractPMPAugmentHook) returns (bool) {
        return
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Gets the PMP input configs for the project.
     * @return pmpInputConfigs The PMP input configs for the project.
     * @dev This function is used to get the PMP input configs for the project, based on what this hook uses.
     */
    function _getPMPInputConfigs()
        internal
        pure
        returns (IPMPV0.PMPInputConfig[] memory)
    {
        // build PMPInputConfigs for the project, based on what this hook uses
        string[] memory sendStateSelectOptions = new string[](3);
        sendStateSelectOptions[0] = "Neutral";
        sendStateSelectOptions[1] = "SendGeneral";
        sendStateSelectOptions[2] = "SendTo";
        string[] memory receiveStateSelectOptions = new string[](3);
        receiveStateSelectOptions[0] = "Neutral";
        receiveStateSelectOptions[1] = "ReceiveGeneral";
        receiveStateSelectOptions[2] = "ReceiveFrom";

        IPMPV0.PMPInputConfig[]
            memory pmpInputConfigs = new IPMPV0.PMPInputConfig[](13); // 13 slots (2 for s/r state, 1 for active slot, 5 for image, 5 for sound)

        // SendState config
        pmpInputConfigs[0] = IPMPV0.PMPInputConfig({
            key: "SendState",
            pmpConfig: IPMPV0.PMPConfig({
                authOption: IPMPV0.AuthOption.TokenOwner,
                paramType: IPMPV0.ParamType.Select,
                pmpLockedAfterTimestamp: 0,
                authAddress: address(0),
                selectOptions: sendStateSelectOptions,
                minRange: 0,
                maxRange: 0
            })
        });

        // ReceiveState config
        pmpInputConfigs[1] = IPMPV0.PMPInputConfig({
            key: "ReceiveState",
            pmpConfig: IPMPV0.PMPConfig({
                authOption: IPMPV0.AuthOption.TokenOwner,
                paramType: IPMPV0.ParamType.Select,
                pmpLockedAfterTimestamp: 0,
                authAddress: address(0),
                selectOptions: receiveStateSelectOptions,
                minRange: 0,
                maxRange: 0
            })
        });

        // ActiveSlot config
        pmpInputConfigs[2] = IPMPV0.PMPInputConfig({
            key: "ActiveSlot",
            pmpConfig: IPMPV0.PMPConfig({
                authOption: IPMPV0.AuthOption.TokenOwner,
                paramType: IPMPV0.ParamType.Uint256Range,
                pmpLockedAfterTimestamp: 0,
                authAddress: address(0),
                selectOptions: new string[](0),
                minRange: 0,
                maxRange: bytes32(uint256(NUM_METADATA_SLOTS - 1))
            })
        });

        // Iteratively build ImageVersionSlot[0-4] configs
        for (uint256 i = 0; i < NUM_METADATA_SLOTS; i++) {
            string memory imageKey = string(
                bytes.concat(
                    bytes("ImageVersionSlot"),
                    bytes(Strings.toString(i))
                )
            );
            pmpInputConfigs[3 + i] = IPMPV0.PMPInputConfig({
                key: imageKey,
                pmpConfig: IPMPV0.PMPConfig({
                    authOption: IPMPV0.AuthOption.TokenOwner,
                    paramType: IPMPV0.ParamType.Uint256Range,
                    pmpLockedAfterTimestamp: 0,
                    authAddress: address(0),
                    selectOptions: new string[](0),
                    minRange: 0,
                    maxRange: bytes32(uint256(99999999))
                })
            });
        }

        // Iteratively build SoundVersionSlot[0-4] configs
        for (uint256 i = 0; i < NUM_METADATA_SLOTS; i++) {
            string memory soundKey = string(
                bytes.concat(
                    bytes("SoundVersionSlot"),
                    bytes(Strings.toString(i))
                )
            );
            pmpInputConfigs[8 + i] = IPMPV0.PMPInputConfig({
                key: soundKey,
                pmpConfig: IPMPV0.PMPConfig({
                    authOption: IPMPV0.AuthOption.TokenOwner,
                    paramType: IPMPV0.ParamType.Uint256Range,
                    pmpLockedAfterTimestamp: 0,
                    authAddress: address(0),
                    selectOptions: new string[](0),
                    minRange: 0,
                    maxRange: bytes32(uint256(99999999))
                })
            });
        }

        return pmpInputConfigs;
    }

    /**
     * @notice Gets the PMP inputs for the receive state update.
     * @param receiveState The receive state to update.
     * @return pmpInputs The PMP inputs for the receive state update.
     * @dev This function is used to get the PMP inputs for the receive state update, based on what this hook uses.
     */
    function _getPmpInputsForReceiveStateUpdate(
        ReceiveStates receiveState
    ) internal pure returns (IPMPV0.PMPInput[] memory) {
        // build PMPInputs for the receive state update, based on what this hook uses
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "ReceiveState",
            configuredParamType: IPMPV0.ParamType.Select,
            configuredValue: bytes32(uint256(receiveState)), // @dev enums are aligned with select options
            configuringArtistString: false,
            configuredValueString: ""
        });
        return pmpInputs;
    }

    /**
     * @notice Gets the PMP inputs for the send state update.
     * @param sendState The send state to update.
     * @return pmpInputs The PMP inputs for the send state update.
     * @dev This function is used to get the PMP inputs for the send state update, based on what this hook uses.
     */
    function _getPmpInputsForSendStateUpdate(
        SendStates sendState
    ) internal pure returns (IPMPV0.PMPInput[] memory) {
        // build PMPInputs for the send state update, based on what this hook uses
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "SendState",
            configuredParamType: IPMPV0.ParamType.Select,
            configuredValue: bytes32(uint256(sendState)), // @dev enums are aligned with select options
            configuringArtistString: false,
            configuredValueString: ""
        });
        return pmpInputs;
    }

    /**
     * @notice Gets the PMP inputs for the active slot update.
     * @param activeSlot The active slot to update.
     * @return pmpInputs The PMP inputs for the active slot update.
     * @dev This function is used to get the PMP inputs for the active slot update, based on what this hook uses.
     */
    function _getPmpInputsForActiveSlotUpdate(
        uint256 activeSlot
    ) internal pure returns (IPMPV0.PMPInput[] memory) {
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "ActiveSlot",
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(uint256(activeSlot)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        return pmpInputs;
    }

    /**
     * @notice Gets the PMP inputs for the image data update.
     * @param slot The slot to update.
     * @param imageVersion The image version to update.
     * @return pmpInputs The PMP inputs for the image data update.
     * @dev This function is used to get the PMP inputs for the image data update, based on what this hook uses.
     */
    function _getPmpInputsForImageDataUpdate(
        uint256 slot,
        uint16 imageVersion
    ) internal pure returns (IPMPV0.PMPInput[] memory) {
        string memory key = string(
            bytes.concat(
                bytes("ImageVersionSlot"),
                bytes(Strings.toString(slot))
            )
        );
        // build PMPInputs for the image data update, based on what this hook uses
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: key,
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(uint256(imageVersion)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        return pmpInputs;
    }

    /**
     * @notice Gets the PMP inputs for the sound data update.
     * @param slot The slot to update.
     * @param soundVersion The sound version to update.
     * @return pmpInputs The PMP inputs for the sound data update.
     * @dev This function is used to get the PMP inputs for the sound data update, based on what this hook uses.
     */
    function _getPmpInputsForSoundDataUpdate(
        uint256 slot,
        uint16 soundVersion
    ) internal pure returns (IPMPV0.PMPInput[] memory) {
        string memory key = string(
            bytes.concat(
                bytes("SoundVersionSlot"),
                bytes(Strings.toString(slot))
            )
        );
        // build PMPInputs for the sound data update, based on what this hook uses
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: key,
            configuredParamType: IPMPV0.ParamType.Uint256Range,
            configuredValue: bytes32(uint256(soundVersion)),
            configuringArtistString: false,
            configuredValueString: ""
        });
        return pmpInputs;
    }

    /**
     * @notice Gets a single element address array.
     * @param address_ The address to include in the array.
     * @return addressArray The single element address array containing the address.
     */
    function _getSingleElementAddressArray(
        address address_
    ) internal pure returns (address[] memory) {
        address[] memory addressArray = new address[](1);
        addressArray[0] = address_;
        return addressArray;
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
        // in future versions, we may choose to disable this functionality and lock project functionality permanently
    }

    // --- HELPER FUNCTIONS FROM SOLADY https://github.com/Vectorized/solady/blob/main/src/utils/LibString.sol ---

    /// @dev Returns the hex encoded string from the raw bytes.
    /// The output is encoded using 2 hexadecimal digits per byte.
    function toHexString(
        bytes memory raw
    ) internal pure returns (string memory result) {
        result = toHexStringNoPrefix(raw);
        /// @solidity memory-safe-assembly
        assembly {
            let n := add(mload(result), 2) // Compute the length.
            mstore(result, 0x3078) // Store the "0x" prefix.
            result := sub(result, 2) // Move the pointer.
            mstore(result, n) // Store the length.
        }
    }

    /// @dev Returns the hex encoded string from the raw bytes.
    /// The output is encoded using 2 hexadecimal digits per byte.
    function toHexStringNoPrefix(
        bytes memory raw
    ) internal pure returns (string memory result) {
        /// @solidity memory-safe-assembly
        assembly {
            let n := mload(raw)
            result := add(mload(0x40), 2) // Skip 2 bytes for the optional prefix.
            mstore(result, add(n, n)) // Store the length of the output.

            mstore(0x0f, 0x30313233343536373839616263646566) // Store the "0123456789abcdef" lookup.
            let o := add(result, 0x20)
            let end := add(raw, n)
            for {

            } iszero(eq(raw, end)) {

            } {
                raw := add(raw, 1)
                mstore8(add(o, 1), mload(and(mload(raw), 15)))
                mstore8(o, mload(and(shr(4, mload(raw)), 15)))
                o := add(o, 2)
            }
            mstore(o, 0) // Zeroize the slot after the string.
            mstore(0x40, add(o, 0x20)) // Allocate memory.
        }
    }
}
