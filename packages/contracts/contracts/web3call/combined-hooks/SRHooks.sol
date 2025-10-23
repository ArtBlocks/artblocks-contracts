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
    using Strings for uint256;

    address public PMPV0_ADDRESS;

    // ------ TOKEN METADATA STATE VARIABLES ------

    enum TokenMetadataType {
        NORMAL, // hand-drawn, ai-generated, etc. - not authentically tied to any specific asset
        ERC721_TOKEN // authentically tied to a specific ERC721 token (signed off-chain by artist-approved system)
    }

    struct TokenMetadata {
        address bitmapImageAddress; // 20 bytes
        TokenMetadataType metadataType; // 1 byte
        address soundDataAddress; // 20 bytes
        address thoughtBubbleTextAddress; // 20 bytes
        bytes auxData; // uncapped bytes, may be used in conjunction with metadataType to store auxiliary, relevant signed data.
    }

    /// @notice mapping of token ids to their metadata
    mapping(uint256 tokenId => TokenMetadata) private tokensMetadata;

    // ------ SEND/RECEIVE STATE (GLOBAL) ------

    // enum for the different possible states of a token's SR configuration
    enum SendStates {
        SendGeneral,
        SendTo,
        Neutral
    }

    enum ReceiveStates {
        ReceiveGeneral,
        ReceiveFrom,
        Neutral
    }

    /// @notice Set of token ids that are currently in state SendGeneral
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    EnumerableSet.UintSet private _sendGeneralTokens;

    /// @notice Set of token ids that are currently in state ReceiveGeneral
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    EnumerableSet.UintSet private _receiveGeneralTokens;

    // ------ SEND/RECEIVE STATE (PER TOKEN) ------

    /// @notice Set of token ids that are sending to a specific token
    // @dev need O(1) access and O(1) insertion/removal for both sending and receiving tokens, so use an EnumerableSet
    mapping(uint256 receivingTokenId => EnumerableSet.UintSet) private _tokensSendingToMe;

    /// @notice Array of token ids that a given token is sending to (when in state SendTo)
    // TODO - use an immutable string array here for storage efficiency!
    // @dev need only O(1) access (not insertion/removal) for sending tokens, so use an array
    mapping(uint256 sendingTokenId => uint256[] receivingTokenIds) private _tokensSendingTo;

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
     */
    function initialize(
        address _pmpV0Address,
        address _owner
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        PMPV0_ADDRESS = _pmpV0Address;
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

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @dev This function is required by the UUPS pattern and can only be called by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

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
