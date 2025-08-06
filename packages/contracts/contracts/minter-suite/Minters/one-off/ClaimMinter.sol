// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISharedMinterRequired} from "../../../interfaces/v0.8.x/ISharedMinterRequired.sol";
import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";
import {IPMPV0} from "../../../interfaces/v0.8.x/IPMPV0.sol";
import {IGenArt721CoreContractV3} from "../../../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";
import {IPseudorandomAtomic} from "../../../interfaces/v0.8.x/IPseudorandomAtomic.sol";
import {IClaimMinter} from "../../../interfaces/v0.8.x/IClaimMinter.sol";

import {ReentrancyGuard} from "@openzeppelin-5.0/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";

import {AuthLib} from "../../../libs/v0.8.x/AuthLib.sol";
import {MaxInvocationsLib} from "../../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {SplitFundsLib} from "../../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {BitMaps256} from "../../../libs/v0.8.x/BitMap.sol";

/**
 * @title ClaimMinter contract that enables admin to pre-mint tokens for a project
 * and allows collectors to claim tokens in an arbitrary order with configurable
 * pricing. Compatible with shared minter suite, but only allows minting with
 * a single core contract. This is designed to be used with a GenArt721CoreContractV3
 * flagship contract.
 * This is a one-off contract that has not been audited, but follows established
 * patterns from other Art Blocks minters.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the project's artist and
 * contract's Admin ACL contract. Both of these roles hold extensive power
 * and can modify minter details and control the claiming process.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the core contract's Admin ACL:
 * - preMint: Allows admin to pre-mint tokens to this contract for later claiming
 * - configurePricePerTokenInWei: Sets the base price for token 0 of a project
 * - configureTimestampStart: Sets when claiming can begin for a project
 * ----------------------------------------------------------------------------
 * The following functions are available to any user:
 * - claimToken: Allows users to claim pre-minted tokens by paying the required price
 * ----------------------------------------------------------------------------
 * Pricing Model:
 * - Base price is set per project for token 0
 * - Each subsequent token costs base price + (tokenId * PRICE_INCREMENT_IN_WEI)
 * ----------------------------------------------------------------------------
 * Workflow:
 * 1. Admin pre-mints tokens using preMint function
 * 2. Admin configures pricing and timestamp start for the project
 * 3. Users can claim tokens once timestamp start is reached, in any order
 * 4. Each claim requires exact payment amount and marks token as claimed
 * 5. Token is transferred to claimant and revenue is split automatically
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter, but they will not be able to mint tokens due to
 * checks performed by this minter's Minter Filter.
 */

contract ClaimMinter is ISharedMinterRequired, IClaimMinter, ReentrancyGuard {
    /// minterType for this minter
    // @dev no version due to no plan of indexing the minter in AB subgraph
    string public constant minterType = "ClaimMinter";

    /// The project ID for the Art Blocks project.
    uint256 public immutable projectId;

    /// Core contract address for this minter.
    address public immutable coreContractAddress;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// PMP contract address this minter interacts with
    address public immutable pmpContractAddress;

    /// Pseudorandom atomic contract address this minter interacts with
    address public immutable pseudorandomAtomicContractAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 public immutable minterFilter;

    /// PMP contract this minter may interact with.
    IPMPV0 public immutable pmpContract;

    /// Pseudorandom atomic contract this minter may interact with.
    IPseudorandomAtomic public immutable pseudorandomAtomicContract;

    // claimed tokens using bitmaps (bitmapIndex => bitmap)
    mapping(uint256 => uint256) public claimedBitmaps;

    // pre-minted tokens using bitmaps (bitmapIndex => bitmap)
    mapping(uint256 => uint256) public preMintedBitmaps;

    uint256 public timestampStart;

    // price configuration
    uint256 public basePriceInWei;
    uint256 public priceIncrementInWei;

    // default price increment in wei for each token
    uint256 public constant DEFAULT_PRICE_INCREMENT_IN_WEI = 500000000000000;

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter.
     * @param minterFilter_ Minter filter for which this will be a
     * filtered minter.
     * @param coreContract_ The only core contract address this minter will
     * interact with.
     * @param pmpContract_ The PMP contract address this minter will
     * interact with.
     * @param pseudorandomAtomicContract_ The pseudorandom atomic contract address this minter will
     * interact with.
     * @param projectId_ The project ID for the Art Blocks project.
     */
    constructor(
        address minterFilter_,
        address coreContract_,
        address pmpContract_,
        address pseudorandomAtomicContract_,
        uint256 projectId_
    ) ReentrancyGuard() {
        minterFilterAddress = minterFilter_;
        minterFilter = IMinterFilterV1(minterFilter_);
        coreContractAddress = coreContract_;
        pmpContractAddress = pmpContract_;
        pmpContract = IPMPV0(pmpContract_);
        pseudorandomAtomicContractAddress = pseudorandomAtomicContract_;
        pseudorandomAtomicContract = IPseudorandomAtomic(
            pseudorandomAtomicContract_
        );
        projectId = projectId_;
    }

    /**
     * @notice Returns all claimed bitmaps
     * @return An array of all claimed bitmaps
     */
    function getAllClaimedBitmaps() external view returns (uint256[] memory) {
        // For 500 tokens, we need 2 bitmap indices (0 and 1)
        uint256[] memory bitmaps = new uint256[](2);
        bitmaps[0] = claimedBitmaps[0];
        bitmaps[1] = claimedBitmaps[1];
        return bitmaps;
    }

    /**
     * @notice Returns all pre-minted bitmaps
     * @return An array of all pre-minted bitmaps
     */
    function getAllPreMintedBitmaps() external view returns (uint256[] memory) {
        // For 500 tokens, we need 2 bitmap indices (0 and 1)
        uint256[] memory bitmaps = new uint256[](2);
        bitmaps[0] = preMintedBitmaps[0];
        bitmaps[1] = preMintedBitmaps[1];
        return bitmaps;
    }

    /**
     * @notice Sets the base price in wei for token 0 and the price increment in wei.
     * Only callable by the core contract's Admin ACL.
     * @dev This function sets the base price for the first token (token 0).
     * The price for subsequent tokens is calculated as base price + (tokenId * priceIncrementInWei).
     * This allows for incremental pricing.
     * The base price must be set before users can claim tokens.
     * @param basePriceInWei_ Base price in wei for token 0.
     * @param priceIncrementInWei_ Price increment in wei.
     */
    function configurePricePerTokenInWei(
        uint256 basePriceInWei_,
        uint256 priceIncrementInWei_
    ) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.configurePricePerTokenInWei.selector
        });

        // EFFECTS
        basePriceInWei = basePriceInWei_;
        priceIncrementInWei = priceIncrementInWei_;
    }

    /**
     * @notice Sets the timestamp when claiming can begin.
     * Only callable by the core contract's Admin ACL.
     * @dev This function sets the earliest time when users can claim tokens.
     * The timestamp should be provided in Unix timestamp format (seconds since epoch).
     * @param timestampStart_ Unix timestamp when claiming can begin.
     */
    function configureTimestampStart(uint256 timestampStart_) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.configureTimestampStart.selector
        });

        // EFFECTS
        timestampStart = timestampStart_;
    }

    /**
     * @notice Pre-mints `amount` tokens to this contract
     * for later claiming by collectors. Only callable by the core contract's Admin ACL.
     * @dev This function mints tokens directly to this contract address, marking them
     * as pre-minted but not yet claimed. The tokens remain in this contract's possession
     * until claimed by users through the claimToken function. This allows for controlled
     * distribution of tokens with arbitrary claiming order.
     * @param amount Number of tokens to pre-mint.
     */
    function preMint(uint256 amount) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.preMint.selector
        });

        MaxInvocationsLib.preMintChecks({
            projectId: projectId,
            coreContract: coreContractAddress
        });

        // EFFECTS
        // Mint tokens to this contract
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = minterFilter.mint_joo({
                to: address(this),
                projectId: projectId,
                coreContract: coreContractAddress,
                sender: msg.sender
            });

            MaxInvocationsLib.validateMintEffectsInvocations({
                tokenId: tokenId,
                coreContract: coreContractAddress
            });
            // Mark token as pre-minted
            _markTokenPreMinted(tokenId);
        }
    }

    /**
     * @notice Claims token `tokenId` by paying the required price.
     * Available once claiming has started.
     * @dev This function allows users to claim pre-minted tokens by paying the exact price
     * calculated by priceByTokenIdInWei. The function checks that the token is not already
     * claimed, that claiming has started, and that the exact payment
     * amount is provided. Upon successful claim, the token is marked as claimed, configured
     * with a pseudorandom hash seed via PMP, revenue is split automatically, and the token
     * is transferred to the claimant. This enables arbitrary claiming order where users can
     * claim any available token ID in any sequence.
     * @param tokenId Token ID to claim.
     */
    function claimToken(uint256 tokenId) external payable {
        // check that token id is unclaimed
        require(!isTokenClaimed(tokenId), "Token already claimed");
        // check that claiming has started
        require(block.timestamp >= timestampStart, "Claiming not yet started");
        // check value of msg.value
        uint256 requiredPrice = _priceByTokenIdInWei(tokenId);
        require(msg.value == requiredPrice, "Only send price per token");

        // EFFECTS
        // mark token as claimed
        _markTokenClaimed(tokenId);

        bytes32 hashSeed = _getPseudorandomAtomic(coreContractAddress, tokenId);

        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "claimHash",
            configuredParamType: IPMPV0.ParamType.String,
            configuredValue: bytes32(0),
            configuringArtistString: false,
            configuredValueString: _bytes32ToString(hashSeed)
        });
        // this contract must be configured to be permitted to configure token params
        pmpContract.configureTokenParams(
            coreContractAddress,
            tokenId,
            pmpInputs
        );

        // split revenue from sale
        // @dev no refund because previously verified msg.value == pricePerTokenInWei
        // @dev no effect on project balance, splitting same amount received
        SplitFundsLib.splitRevenuesETHNoRefund({
            projectId: projectId,
            valueInWei: requiredPrice,
            coreContract: coreContractAddress
        });

        // transfer token id to collector
        IERC721(coreContractAddress).safeTransferFrom(
            address(this),
            msg.sender,
            tokenId
        );
    }

    /**
     * @notice Checks if a token is claimed using bitmap storage
     * @param tokenId The token ID
     * @return True if the token is claimed
     */
    function isTokenClaimed(uint256 tokenId) public view returns (bool) {
        (uint256 bitmapIndex, uint8 bitPosition) = _getBitmapPosition(tokenId);
        uint256 bitmap = claimedBitmaps[bitmapIndex];
        return BitMaps256.get(bitmap, bitPosition);
    }

    /**
     * @notice Internal function to calculate the price in wei for token `tokenId`.
     * @param tokenId Token ID to get the price for.
     * @return Price in wei for the specified token.
     */
    function _priceByTokenIdInWei(
        uint256 tokenId
    ) internal view returns (uint256) {
        uint256 basePrice = basePriceInWei;
        uint256 priceIncrement = priceIncrementInWei;

        // Use configured increment if set, otherwise use default
        if (priceIncrement == 0) {
            priceIncrement = DEFAULT_PRICE_INCREMENT_IN_WEI;
        }

        return basePrice + (tokenId * priceIncrement);
    }

    /**
     * @notice Syncs project's max invocations to core contract value.
     * Only callable by the core contract's Admin ACL.
     */
    function syncProjectMaxInvocationsToCore() external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.syncProjectMaxInvocationsToCore.selector
        });

        // EFFECTS
        MaxInvocationsLib.syncProjectMaxInvocationsToCore({
            projectId: projectId,
            coreContract: coreContractAddress
        });
    }

    /**
     * @notice Converts a bytes32 value to a string.
     * @dev This function converts a bytes32 value to a string representation.
     * @param _bytes32 The bytes32 value to convert.
     * @return The string representation of the bytes32 value.
     */
    function _bytes32ToString(
        bytes32 _bytes32
    ) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(66); // 0x + 64 hex chars
        bytesArray[0] = "0";
        bytesArray[1] = "x";

        for (uint256 i = 0; i < 32; i++) {
            bytes1 b = bytes1(uint8(uint256(_bytes32) / (2 ** (8 * (31 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            bytesArray[2 + 2 * i] = _char(hi);
            bytesArray[2 + 2 * i + 1] = _char(lo);
        }
        return string(bytesArray);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    /**
     * @notice Internal function to atomically obtain a pseudorandom number
     * from the configured pseudorandom contract.
     * @param coreContract - The core contract that is requesting an atomic
     * pseudorandom number.
     * @param tokenId - The token ID on `coreContract` that is associated
     * with the pseudorandom number request.
     */
    function _getPseudorandomAtomic(
        address coreContract,
        uint256 tokenId
    ) internal returns (bytes32) {
        return
            pseudorandomAtomicContract.getPseudorandomAtomic(
                keccak256(abi.encodePacked(coreContract, tokenId))
            );
    }

    /**
     * @notice Internal function that gets the bitmap index and bit position for a token ID
     * @param tokenId The token ID
     * @return bitmapIndex The index in the bitmap array (0, 1, 2, etc.)
     * @return bitPosition The position within that bitmap (0-255)
     */
    function _getBitmapPosition(
        uint256 tokenId
    ) internal pure returns (uint256 bitmapIndex, uint8 bitPosition) {
        bitmapIndex = tokenId / 256;
        bitPosition = uint8(tokenId % 256);
    }

    /**
     * @notice Internal function that marks a token as claimed using bitmap storage
     * @param tokenId The token ID
     */
    function _markTokenClaimed(uint256 tokenId) internal {
        (uint256 bitmapIndex, uint8 bitPosition) = _getBitmapPosition(tokenId);
        uint256 currentBitmap = claimedBitmaps[bitmapIndex];
        claimedBitmaps[bitmapIndex] = BitMaps256.set(
            currentBitmap,
            bitPosition
        );
    }

    /**
     * @notice Marks a token as pre-minted using bitmap storage
     * @param tokenId The token ID
     */
    function _markTokenPreMinted(uint256 tokenId) internal {
        (uint256 bitmapIndex, uint8 bitPosition) = _getBitmapPosition(tokenId);
        uint256 currentBitmap = preMintedBitmaps[bitmapIndex];
        preMintedBitmaps[bitmapIndex] = BitMaps256.set(
            currentBitmap,
            bitPosition
        );
    }
}
