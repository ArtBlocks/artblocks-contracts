// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {ISRSimpleHooks} from "../../interfaces/v0.8.x/ISRSimpleHooks.sol";
import {IGenArt721CoreContractV3_Base} from "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";

import {Initializable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin-5.0/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {SSTORE2} from "../../libs/v0.8.x/SSTORE2.sol";
import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {FeistelWalkLib} from "../../libs/v0.8.x/FeistelWalkLib.sol";
import {ENSLib} from "../../libs/v0.8.x/ENSLib.sol";

/**
 * @title SRSimpleHooks
 * @author Art Blocks Inc.
 * @notice Simplified send-receive hook contract where all tokens implicitly send and receive
 * generally. There is no per-token send/receive state — every minted token participates.
 * Metadata is image-only (no audio), single slot, and operationally set once during/before mint.
 *
 * Supports up to 1,000,000 invocations per project (token numbers are uint256, not uint16).
 *
 * The hook injects the queried token's compressed image data as a post-param ("imageData").
 * The art script queries `getLiveData` to obtain 19 pseudorandom other tokens per block,
 * sampled via a Feistel walk over the full invocation set.
 *
 * @dev This contract follows the UUPS (Universal Upgradeable Proxy Standard) pattern.
 * It uses OpenZeppelin's upgradeable contracts and must be deployed behind a proxy.
 * Only the owner can authorize upgrades via the _authorizeUpgrade function.
 */
contract SRSimpleHooks is
    Initializable,
    AbstractPMPAugmentHook,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ISRSimpleHooks
{
    address public CORE_CONTRACT_ADDRESS;

    uint256 public CORE_PROJECT_ID;

    uint256 public constant MAX_IMAGE_DATA_LENGTH = 1024 * 15; // 15 KB

    uint256 internal constant NUM_LIVE_DATA_TOKENS = 19;

    /// @notice The address allowed to set image data for tokens.
    address public imageDataSetter;

    /// @notice Mapping of token number to its SSTORE2 image data pointer.
    mapping(uint256 tokenNumber => address imageDataAddress)
        private _tokenImageData;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @param _owner The address that will own this contract (artist) and authorize upgrades.
     * @param _coreContractAddress The address of the Art Blocks core contract.
     * @param _coreProjectId The project ID on the core contract.
     */
    function initialize(
        address _owner,
        address _coreContractAddress,
        uint256 _coreProjectId
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        CORE_CONTRACT_ADDRESS = _coreContractAddress;
        CORE_PROJECT_ID = _coreProjectId;

        emit SRSimpleHooksInitialized({
            coreContractAddress: _coreContractAddress,
            coreProjectId: _coreProjectId
        });
    }

    /**
     * @notice Sets the address allowed to write image data for tokens.
     * Only callable by the contract owner (artist).
     * @param _imageDataSetter The address to grant image data writing permission.
     */
    function setImageDataSetter(
        address _imageDataSetter
    ) external onlyOwner {
        imageDataSetter = _imageDataSetter;
        emit ImageDataSetterUpdated(_imageDataSetter);
    }

    /**
     * @notice Sets the compressed image data for a token.
     * Only callable by the configured imageDataSetter address.
     * @param tokenNumber The token number to set image data for.
     * @param imageDataCompressed The compressed image data bytes. Must be non-empty
     * and not exceed MAX_IMAGE_DATA_LENGTH.
     */
    function setTokenImageData(
        uint256 tokenNumber,
        bytes calldata imageDataCompressed
    ) external {
        require(
            msg.sender == imageDataSetter,
            "Only imageDataSetter allowed"
        );
        require(
            imageDataCompressed.length > 0,
            "Image data must be non-empty"
        );
        require(
            imageDataCompressed.length <= MAX_IMAGE_DATA_LENGTH,
            "Image data exceeds MAX_IMAGE_DATA_LENGTH"
        );

        _tokenImageData[tokenNumber] = SSTORE2.write(imageDataCompressed);

        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        emit ImageConfigured({
            coreContract: CORE_CONTRACT_ADDRESS,
            tokenId: tokenId
        });
    }

    /**
     * @notice Augments token parameters by appending the token's compressed image data
     * as a hex-encoded post-param with key "imageData".
     * @param tokenId The token ID being queried.
     * @param tokenParams The existing token parameters.
     * @return augmentedTokenParams The token parameters with imageData appended.
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
        uint256 originalLength = tokenParams.length;
        augmentedTokenParams = new IWeb3Call.TokenParam[](originalLength + 1);

        for (uint256 i = 0; i < originalLength; i++) {
            augmentedTokenParams[i] = tokenParams[i];
        }

        uint256 tokenNumber = ABHelpers.tokenIdToTokenNumber(tokenId);
        augmentedTokenParams[originalLength] = IWeb3Call.TokenParam({
            key: "imageData",
            value: _getHexStringFromSSTORE2(_tokenImageData[tokenNumber])
        });

        return augmentedTokenParams;
    }

    /**
     * @notice Returns 19 pseudorandom tokens sampled via Feistel walk for the given
     * token and block. The queried token is excluded from results.
     * @param tokenNumber The token number requesting live data.
     * @param blockNumber The block number to seed randomness. 0 = latest completed block.
     * @return liveData Array of up to 19 TokenLiveData structs.
     * @return totalSupply Current number of minted tokens in the project.
     * @return usedBlockNumber The block number used for randomness.
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
        )
    {
        usedBlockNumber = blockNumber == 0 ? block.number - 1 : blockNumber;
        require(
            usedBlockNumber <= block.number - 1,
            "Block number in future"
        );
        bytes32 blockhash_ = blockhash(usedBlockNumber);
        require(
            blockhash_ != bytes32(0),
            "Block hash unavailable - must be within latest 256 blocks"
        );

        (totalSupply, , , , , ) = IGenArt721CoreContractV3_Base(
            CORE_CONTRACT_ADDRESS
        ).projectStateData(CORE_PROJECT_ID);

        if (totalSupply == 0) {
            return (new TokenLiveData[](0), 0, usedBlockNumber);
        }

        // max tokens we can return (exclude self)
        uint256 maxTokens = totalSupply > NUM_LIVE_DATA_TOKENS + 1
            ? NUM_LIVE_DATA_TOKENS
            : (totalSupply > 1 ? totalSupply - 1 : 0);

        if (maxTokens == 0) {
            return (new TokenLiveData[](0), totalSupply, usedBlockNumber);
        }

        bytes32 seed = keccak256(
            abi.encodePacked(blockhash_, tokenNumber)
        );
        FeistelWalkLib.Plan memory plan = FeistelWalkLib.makePlan({
            seed: seed,
            N: totalSupply
        });

        liveData = new TokenLiveData[](maxTokens);
        address _coreContractAddress = CORE_CONTRACT_ADDRESS;
        uint256 _projectId = CORE_PROJECT_ID;
        uint256 collected = 0;

        for (
            uint256 walkIndex = 0;
            walkIndex < totalSupply && collected < maxTokens;
            walkIndex++
        ) {
            uint256 sampledTokenNumber = FeistelWalkLib.index(
                plan,
                walkIndex
            );
            if (sampledTokenNumber == tokenNumber) {
                continue;
            }
            uint256 sampledTokenId = ABHelpers
                .tokenIdFromProjectIdAndTokenNumber({
                    projectId: _projectId,
                    tokenNumber: sampledTokenNumber
                });
            liveData[collected] = _getLiveDataForToken({
                tokenNumber_: sampledTokenNumber,
                tokenId: sampledTokenId,
                coreContractAddress: _coreContractAddress
            });
            collected++;
        }

        // resize if we collected fewer than maxTokens (shouldn't happen, but defensive)
        if (collected < maxTokens) {
            assembly {
                mstore(liveData, collected)
            }
        }

        return (liveData, totalSupply, usedBlockNumber);
    }

    /**
     * @notice Gets the metadata for a given token.
     * @param tokenNumber The token number.
     * @return imageDataCompressed The compressed image data (empty if not set).
     * @return ownerAddress The current owner of the token.
     */
    function getTokenMetadata(
        uint256 tokenNumber
    )
        external
        view
        returns (bytes memory imageDataCompressed, address ownerAddress)
    {
        address imageAddr = _tokenImageData[tokenNumber];
        imageDataCompressed = imageAddr != address(0)
            ? SSTORE2.read(imageAddr)
            : bytes("");

        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber({
            projectId: CORE_PROJECT_ID,
            tokenNumber: tokenNumber
        });
        ownerAddress = IERC721(CORE_CONTRACT_ADDRESS).ownerOf(tokenId);
    }

    /**
     * @notice ERC165 interface detection.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AbstractPMPAugmentHook) returns (bool) {
        return
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Builds a TokenLiveData struct for a single token.
     */
    function _getLiveDataForToken(
        uint256 tokenNumber_,
        uint256 tokenId,
        address coreContractAddress
    ) internal view returns (TokenLiveData memory data) {
        data.tokenNumber = tokenNumber_;
        data.ownerAddress = IERC721(coreContractAddress).ownerOf(tokenId);

        address imageAddr = _tokenImageData[tokenNumber_];
        if (imageAddr != address(0)) {
            data.imageDataCompressed = SSTORE2.read(imageAddr);
        }

        data.ownerEnsName = ENSLib.getEnsName(data.ownerAddress);
    }

    function _getHexStringFromSSTORE2(
        address sstore2Address
    ) internal view returns (string memory) {
        if (sstore2Address == address(0)) {
            return "";
        }
        return toHexString(SSTORE2.read(sstore2Address));
    }

    /**
     * @notice Authorizes an upgrade to a new implementation. Owner only.
     *
     * UPGRADE SAFETY: All existing state variables MUST remain in their current
     * storage slots. New variables MUST be appended, never inserted.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // --- Hex encoding helpers from Solady ---

    function toHexString(
        bytes memory raw
    ) internal pure returns (string memory result) {
        result = toHexStringNoPrefix(raw);
        /// @solidity memory-safe-assembly
        assembly {
            let n := add(mload(result), 2)
            mstore(result, 0x3078)
            result := sub(result, 2)
            mstore(result, n)
        }
    }

    function toHexStringNoPrefix(
        bytes memory raw
    ) internal pure returns (string memory result) {
        /// @solidity memory-safe-assembly
        assembly {
            let n := mload(raw)
            result := add(mload(0x40), 2)
            mstore(result, add(n, n))

            mstore(0x0f, 0x30313233343536373839616263646566)
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
            mstore(o, 0)
            mstore(0x40, add(o, 0x20))
        }
    }
}
