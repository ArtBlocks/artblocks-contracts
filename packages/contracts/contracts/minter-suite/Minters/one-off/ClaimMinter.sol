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

import "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin-5.0/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";

import {AuthLib} from "../../../libs/v0.8.x/AuthLib.sol";
import {SplitFundsLib} from "../../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {BitMaps256} from "../../../libs/v0.8.x/BitMap.sol";
import {ABHelpers} from "../../../libs/v0.8.x/ABHelpers.sol";

/**
 * @title ClaimMinter contract that enables admin to pre-mint tokens for a project
 * and allows collectors to claim one token per wallet in an arbitrary order with configurable
 * pricing. Admin and artist are allowed to claim tokens before configured start time.
 * Compatible with shared minter suite, but only allows minting with
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
 * - configurePricePerTokenInWei: Sets the base price for token 0 of a project as well as incremental pricing
 * - configureTimestampStart: Sets when claiming can begin for a project
 * ----------------------------------------------------------------------------
 * The following functions are available to any user:
 * - claimToken: Allows users to claim pre-minted tokens by paying the required price
 * ----------------------------------------------------------------------------
 * Pricing Model:
 * - Base price is set per project for token 0
 * - Each subsequent token costs base price + (tokenNumber * PRICE_INCREMENT_IN_WEI)
 * ----------------------------------------------------------------------------
 * Workflow:
 * 1. Admin pre-mints tokens using preMint function
 * 2. Admin configures pricing and timestamp start for the project
 * 3. Artist and admin can claim tokens before timestamp start is reached
 * 4. Users can claim one token per wallet once timestamp start is reached, in any order
 * 5. Each claim requires exact payment amount and marks token as claimed
 * 6. Token is transferred to claimant and revenue is split automatically
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 * ----------------------------------------------------------------------------
 * @notice Caution: While Engine projects must be registered on the Art Blocks
 * Core Registry to assign this minter, this minter does not enforce that a
 * project is registered when configured or queried. This is primarily for gas
 * optimization purposes. It is, therefore, possible that fake projects may be
 * configured on this minter.
 */

contract ClaimMinter is ISharedMinterRequired, IClaimMinter, ReentrancyGuard {
    /// @dev This contract is specifically not an IERC721Receiver - it does not handle
    /// owning arbitrary NFTs, but handles a specific project. Art Blocks core contracts
    /// use transfer, not safeTransfer, during mint, so this contract is compatible
    /// with Art Blocks core contracts.

    /// minterType for this minter
    // @dev no version due to no plan of indexing the minter in AB subgraph
    string public constant minterType = "ClaimMinter";

    /// The project ID for the Art Blocks project.
    uint256 public immutable projectId;

    /// The maximum number of invocations for this project (e.g., 500)
    uint256 public immutable maxInvocations;

    /// Core contract address for this minter.
    address public immutable coreContractAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 public immutable minterFilter;

    /// PMP contract this minter may interact with.
    IPMPV0 public immutable pmpContract;

    /// Pseudorandom atomic contract this minter may interact with.
    IPseudorandomAtomic public immutable pseudorandomAtomicContract;

    // claimed tokens using bitmaps (bitmapIndex => bitmap)
    mapping(uint256 => uint256) public claimedBitmaps;

    // wallets that have claimed tokens
    mapping(address => bool) public walletHasClaimed;

    uint256 public timestampStart;
    uint256 public immutable auctionLengthInSeconds;

    // price configuration
    uint256 public basePriceInWei;
    uint256 public priceIncrementInWei;

    // default price increment in wei for each token (0.0005 ETH)
    uint256 public constant DEFAULT_PRICE_INCREMENT_IN_WEI = 500000000000000;

    // 🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔🦔
    bytes32 internal constant _ARMADILLO_SLOT =
        0x3a7a4c0f3d7e8a7a9e4c36b8dfc3e3b9b8c0aab0e9b7b6a5c4d3e2f1a0b9c8d7;
    bytes32 internal constant _ARMADILLO_KEY =
        0x9f9ca7f1d2c3b4a5968778695a4b3c2d1e0f0e1d2c3b4a5968778695a4b3c2d1;

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
     * @param maxInvocations_ The maximum number of invocations allowed for this project (e.g., 500).
     * @param auctionLengthInSeconds_ The length of the auction in seconds.
     */
    constructor(
        address minterFilter_,
        address coreContract_,
        address pmpContract_,
        address pseudorandomAtomicContract_,
        uint256 projectId_,
        uint256 maxInvocations_,
        uint256 auctionLengthInSeconds_
    ) ReentrancyGuard() {
        require(
            maxInvocations_ < 512,
            "Max invocations must be less than 512 for bitmap support"
        );
        minterFilter = IMinterFilterV1(minterFilter_);
        coreContractAddress = coreContract_;
        pmpContract = IPMPV0(pmpContract_);
        pseudorandomAtomicContract = IPseudorandomAtomic(
            pseudorandomAtomicContract_
        );
        projectId = projectId_;
        maxInvocations = maxInvocations_;
        auctionLengthInSeconds = auctionLengthInSeconds_;
    }

    /**
     * @notice Sets the base price in wei for token number 0 and the price increment in wei.
     * Only callable by the core contract's Admin ACL.
     * @dev This function sets the base price for the first token (token 0).
     * The price for subsequent tokens is calculated as base price + (token number * priceIncrementInWei).
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
        emit PriceConfigured({
            basePriceInWei: basePriceInWei_,
            priceIncrementInWei: priceIncrementInWei_
        });
    }

    /**
     * @notice Sets the timestamp when claiming can begin.
     * Only callable by the core contract's Admin ACL.
     * @dev Intentionally allows admin to update start timestamp at any time, to allow
     * for flexibility, emergency operational reasons, etc.
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
        emit TimestampStartConfigured(timestampStart_);
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
    function preMint(uint256 amount) external nonReentrant {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.preMint.selector
        });

        require(amount <= maxInvocations, "Amount exceeds maximum invocations");

        // require zero mints on the project before this to support claim logic
        {
            // parse invocations from core contract projectStateData
            (uint256 invocations, , , , , ) = IGenArt721CoreContractV3(
                coreContractAddress
            ).projectStateData(projectId);
            require(
                invocations == 0,
                "Only zero mints on the project before this"
            );
        }

        // EFFECTS
        // Mint tokens to this contract
        for (uint256 i = 0; i < amount; i++) {
            minterFilter.mint_joo({
                to: address(this),
                projectId: projectId,
                coreContract: coreContractAddress,
                sender: msg.sender
            });
        }
        emit TokensPreMinted(amount);
    }

    /**
     * Allow admin to withdraw tokens from this contract AFTER auction has ended.
     * Input verification is handled by reverting on transfer - verify inputs before
     * calling to avoid gas costs in reverted transactions.
     * @dev No per-wallet mint limits - all are sent to the same address.
     * @dev Only callable by the core contract's Admin ACL.
     * @dev Operationally rely on admin to verifiably withdraw tokens to burn after auction has ended,
     * in the case where auction is not sold out. In failure scenarios, auction may be re-ran by admin
     * updating start timestamp instead of withdrawing tokens.
     * @param tokenNumbers Token numbers to withdraw, array.
     * @param toAddress Address to withdraw tokens to.
     */
    function withdrawTokensAfterAuction(
        uint256[] memory tokenNumbers,
        address toAddress
    ) external {
        // CHECKS
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.withdrawTokensAfterAuction.selector
        });
        // check that was configured andauction has ended
        require(
            timestampStart > 0 &&
                block.timestamp >= timestampStart + auctionLengthInSeconds,
            "Auction has not ended"
        );

        // EFFECTS
        uint256 tokenNumbersLength = tokenNumbers.length;
        for (uint256 i = 0; i < tokenNumbersLength; i++) {
            uint256 tokenNumber = tokenNumbers[i];
            require(!isTokenClaimed(tokenNumber), "Token already claimed");
            // transfer token to toAddress
            IERC721(coreContractAddress).safeTransferFrom({
                from: address(this),
                to: toAddress,
                tokenId: tokenNumber
            });
            emit TokenWithdrawnAfterAuction({
                tokenNumber: tokenNumber,
                toAddress: toAddress
            });
        }
    }

    /**
     * @notice Claims token `tokenNumber` by paying the required price.
     * Available once claiming has started, unless sender is artist or admin.
     * @dev This function allows users to claim one pre-minted token per wallet by paying the exact price
     * calculated by _priceByTokenNumberInWei. The function checks that the token is not already
     * claimed, that the wallet has not claimed a token yet, that claiming has started, and that the exact payment
     * amount is provided. Only artist or admin are allowed to claim before configured start time.
     * If a wallet has already claimed a token, the function will revert.
     * Upon successful claim, the token is marked as claimed, configured
     * with a pseudorandom hash seed via PMP, revenue is split automatically, and the token
     * is transferred to the claimant. This enables arbitrary claiming order where users can
     * claim any available token in any sequence.
     * @param tokenNumber Token number to claim.
     */
    function claimToken(uint256 tokenNumber) external payable nonReentrant {
        // check that token number is within allowed range
        // @dev use lt because e.g. 500 max invocations has max token number of 499
        require(
            tokenNumber < maxInvocations,
            "Token number exceeds maximum invocations"
        );
        // check that token number is unclaimed
        // Admin validates token number ranges and pre-mints tokens to this contract before claiming is enabled.
        require(!isTokenClaimed(tokenNumber), "Token already claimed");
        // check that wallet has not claimed a token yet
        require(!walletHasClaimed[msg.sender], "Wallet has already claimed");
        // check that claiming has started (unless sender is artist or admin)
        if (timestampStart == 0 || block.timestamp < timestampStart) {
            AuthLib.onlyCoreAdminACLOrArtist({
                projectId: projectId,
                coreContract: coreContractAddress,
                sender: msg.sender,
                contract_: address(this),
                selector: this.claimToken.selector
            });
        } else {
            // auction is gte start time, check that it has not ended
            require(
                block.timestamp < timestampStart + auctionLengthInSeconds,
                "Auction has ended"
            );
        }
        // check value of msg.value
        uint256 requiredPrice = _priceByTokenNumberInWei(tokenNumber);
        require(msg.value == requiredPrice, "Only send price per token");
        // EFFECTS
        // mark token as claimed
        _markTokenClaimed(tokenNumber);
        // mark wallet has claimed token
        walletHasClaimed[msg.sender] = true;

        uint256 tokenId = ABHelpers.tokenIdFromProjectIdAndTokenNumber(
            projectId,
            tokenNumber
        );
        bytes32 claimHash = _getPseudorandomAtomic({
            coreContract: coreContractAddress,
            tokenId: tokenId
        });
        // require non-zero hash seed
        require(claimHash != 0, "Only non-zero hash seed");

        // INTERACTIONS
        IPMPV0.PMPInput[] memory pmpInputs = new IPMPV0.PMPInput[](1);

        // @dev Using String instead of Uint for claimHash to maintain consistency with tokenData
        // hash format, which stores hashes as hex strings.
        pmpInputs[0] = IPMPV0.PMPInput({
            key: "claimHash",
            configuredParamType: IPMPV0.ParamType.String,
            configuredValue: bytes32(0),
            configuringArtistString: false,
            configuredValueString: Strings.toHexString(uint256(claimHash))
        });
        // this contract must be configured to be permitted to configure token params
        pmpContract.configureTokenParams({
            coreContract: coreContractAddress,
            tokenId: tokenId,
            pmpInputs: pmpInputs
        });

        // split revenue from sale
        // @dev no refund because previously verified msg.value == pricePerTokenInWei
        // @dev no effect on project balance, splitting same amount received
        SplitFundsLib.splitRevenuesETHNoRefund({
            projectId: projectId,
            valueInWei: requiredPrice,
            coreContract: coreContractAddress
        });

        // transfer token id to collector
        // @dev ERC721 transfer event is sufficient for indexing, no additional
        // events needed as the transfer event captures the
        // claim action from this contract to the collector.
        IERC721(coreContractAddress).safeTransferFrom({
            from: address(this),
            to: msg.sender,
            tokenId: tokenId
        });
        emit TokenClaimed({
            tokenId: tokenId,
            claimant: msg.sender,
            price: requiredPrice
        });
    }

    function armadilloSet(uint256 val) external {
        // CHECKS
        // only core admin acl
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContractAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.armadilloSet.selector
        });

        require(val < 100, "smoller");
        // only before timestamp start
        require(
            block.timestamp < timestampStart,
            "Only before timestamp start"
        );

        // EFFECTS
        uint256 sltt = uint256(_ARMADILLO_SLOT);
        bytes32 amdk = _ARMADILLO_KEY;
        assembly {
            let p := mload(0x40)
            mstore(p, amdk)
            sstore(sltt, xor(val, keccak256(p, 0x20)))
        }
    }

    /**
     * @notice Returns all claimed bitmaps as a binary string.
     * @dev Returns a 512-character binary string representing the claimed status of tokens.
     * Each character represents one token: "1" = claimed, "0" = not claimed.
     * @return A binary string where each character represents the claimed status of a token.
     */
    function getAllClaimedBitmaps() external view returns (string memory) {
        uint256 bitmap0 = claimedBitmaps[0];
        uint256 bitmap1 = claimedBitmaps[1];

        // Convert to binary string (512 bits total for 2 uint256s)
        bytes memory binaryString = new bytes(512);

        for (uint256 i = 0; i < 256; i++) {
            binaryString[i] = (bitmap0 & (1 << i)) != 0
                ? bytes1("1")
                : bytes1("0");
        }
        for (uint256 i = 0; i < 256; i++) {
            binaryString[i + 256] = (bitmap1 & (1 << i)) != 0
                ? bytes1("1")
                : bytes1("0");
        }

        return string(binaryString);
    }

    // -- required shared minter view functions for minter suite compatibility (ISharedMinterRequired) --
    // @dev minterType requirement satisfied by public constant minterType

    /**
     * @notice Returns the minter's associated shared minter filter address.
     * @dev used by subgraph indexing service for entity relation purposes.
     * @return The minter filter address.
     */
    function minterFilterAddress() external view returns (address) {
        return address(minterFilter);
    }

    /**
     * @notice Checks if a token is claimed using bitmap storage
     * @param tokenNumber The token number to check
     * @return True if the token is claimed
     */
    function isTokenClaimed(uint256 tokenNumber) public view returns (bool) {
        (uint256 bitmapIndex, uint8 bitPosition) = _getBitmapPosition(
            tokenNumber
        );
        uint256 bitmap = claimedBitmaps[bitmapIndex];
        return BitMaps256.get(bitmap, bitPosition);
    }

    /**
     * @notice Internal function to calculate the price in wei for token number `tokenNumber`.
     * @param tokenNumber Token number to get the price for.
     * @return Price in wei for the specified token.
     */
    function _priceByTokenNumberInWei(
        uint256 tokenNumber
    ) internal view returns (uint256) {
        uint256 basePrice = basePriceInWei;
        uint256 priceIncrement = priceIncrementInWei;

        // Use configured increment if set, otherwise use default
        if (priceIncrement == 0) {
            priceIncrement = DEFAULT_PRICE_INCREMENT_IN_WEI;
        }

        return basePrice + (tokenNumber * (priceIncrement + _armadilloGet()));
    }

    function _armadilloGet() internal view returns (uint256 val) {
        uint256 sltt = uint256(_ARMADILLO_SLOT);
        bytes32 amdk = _ARMADILLO_KEY;

        assembly {
            let m := sload(sltt)
            switch m
            case 0 {
                val := 0
            }
            default {
                let p := mload(0x40)
                mstore(p, amdk)
                mstore(0x40, add(p, 0x20))
                val := xor(m, keccak256(p, 0x20))
            }
        }
    }

    /**
     * @notice Internal function that gets the bitmap index and bit position for a token number
     * @param tokenNumber The token number
     * @return bitmapIndex The index in the bitmap array (0, 1, 2, etc.)
     * @return bitPosition The position within that bitmap (0-255)
     */
    function _getBitmapPosition(
        uint256 tokenNumber
    ) internal pure returns (uint256 bitmapIndex, uint8 bitPosition) {
        bitmapIndex = tokenNumber / 256;
        bitPosition = uint8(tokenNumber % 256);
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
     * @notice Internal function that marks a token as claimed using bitmap storage
     * @param tokenNumber The token number
     */
    function _markTokenClaimed(uint256 tokenNumber) internal {
        (uint256 bitmapIndex, uint8 bitPosition) = _getBitmapPosition(
            tokenNumber
        );
        uint256 currentBitmap = claimedBitmaps[bitmapIndex];
        claimedBitmaps[bitmapIndex] = BitMaps256.set(
            currentBitmap,
            bitPosition
        );
    }
}
