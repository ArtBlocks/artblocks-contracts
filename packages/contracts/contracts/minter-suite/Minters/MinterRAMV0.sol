// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterRAMV0} from "../../interfaces/v0.8.x/ISharedMinterRAMV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../../libs/v0.8.x/ABHelpers.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";
import {RAMLib} from "../../libs/v0.8.x/minter-libs/RAMLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";

import {ReentrancyGuard} from "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using a fully on-chain ranked auction mechanism.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Bid Front-Running:
 * TODO - update this for RAM
 * Collectors can front-run bids to become the highest bidder by bidding any
 * amount sufficiently higher than the current highest bid, considering the
 * minter-level configured value of `minterMinBidIncrementPercentage`. For
 * instance, if current bid is 1 ETH, and collector A sends a transaction with
 * a bid of 2.50 ETH, collector B may send a transaction with a bid of 2.499
 * ETH, that if successfully front-runs Collector A's transaction, is able to
 * cause collector A's transaction to revert. This is a difficult problem to
 * get around in a decentralized system with public bids, and we have chosen to
 * keep the minter simple and transparent, and leave it up to collectors to
 * understand the risks of front-running and bid accordingly.
 * @notice Token Ownership:
 * TODO - update this for RAM
 * This minter contract may own up to two tokens at a time for a given project.
 * The first possible token owned is the token that is currently being
 * auctioned. During the auction, the token is owned by the minter contract.
 * Once the auction ends, the token is transferred to the winning bidder via a
 * call to "settle" the auction.
 * The second possible token owned is the token that will be auctioned next.
 * This token is minted to and owned by the minter contract whenever possible
 * (i.e. when the project's max invocations has not been reached) when an
 * artist configures their project on this minter, or when a new auction is
 * started. The purpose of this token is to allow users to have a preview of
 * the next token that will be auctioned, even before the auction has started.
 * @notice Privileged Roles and Ownership:
 * TODO: Update this for RAM
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the core contract's Admin
 * ACL contract and a project's artist. Both of these roles hold extensive
 * power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * TODO: update priviliged function info for RAM
 * The following functions are restricted to the core contract's Admin ACL
 * contract:
 * - ejectNextTokenTo
 * ----------------------------------------------------------------------------
 * The following functions are restricted to this minter's minter filter's
 * Admin ACL contract:
 * - updateMinterTimeBufferSeconds
 * - updateRefundGasLimit
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
 * - configureFutureAuctions
 * - tryPopulateNextToken
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist or the core
 * contract's Admin ACL contract:
 * - resetFutureAuctionDetails
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
 *
 * @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers, such
 * manipulation will not have material impact on the ability for collectors to
 * place a bid before auction end time. This is due to the admin-configured
 * `minterTimeBufferSeconds` parameter, which will used to ensure that
 * collectors have sufficient time to place a bid after the final bid and
 * before the auction end time.
 */
contract MinterRAMV0 is ReentrancyGuard, ISharedMinterV0, ISharedMinterRAMV0 {
    using SafeCast for uint256;

    /// @notice Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// @notice Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// @notice minterType for this minter
    string public constant minterType = "MinterRAMV0";

    /// @notice minter version for this minter
    string public constant minterVersion = "v1.0.0";

    /** @notice Gas limit for refunding ETH to bidders
     * configurable by admin, default to 30,000
     * max uint24 ~= 16 million gas, more than enough for a refund
     * @dev SENDALL fallback is used to refund ETH if this limit is exceeded
     */
    uint24 internal _minterRefundGasLimit = 30_000;

    /**
     * @notice Initializes contract to be a shared, filtered minter for
     * minter filter `minterFilter`
     * @param minterFilter Minter filter for which this will be a minter
     */
    constructor(address minterFilter) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
        // emit events indicating default minter configuration values
        // TODO
    }

    /**
     * @notice Manually sets the local maximum invocations of project `projectId`
     * with the provided `maxInvocations`, checking that `maxInvocations` is less
     * than or equal to the value of project `project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @param maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 projectId,
        address coreContract,
        uint24 maxInvocations
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: maxInvocations
        });
    }

    /**
     * @notice Sets the gas limit during ETH refunds when a collector is
     * outbid. This value should be set to a value that is high enough to
     * ensure that refunds are successful for commonly used wallets, but low
     * enough to avoid excessive abuse of refund gas allowance during a new
     * bid.
     * @dev max gas limit is ~16M, which is considered well over a future-safe
     * upper bound.
     * @param minterRefundGasLimit Gas limit to set for refunds. Must be
     * between 7,000 and max uint24 (~16M).
     */
    function updateRefundGasLimit(uint24 minterRefundGasLimit) external {
        // CHECKS
        AuthLib.onlyMinterFilterAdminACL({
            minterFilterAddress: minterFilterAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.updateRefundGasLimit.selector
        });
        // @dev max gas limit implicitly checked by using uint24 input arg
        // @dev min gas limit is based on rounding up current cost to send ETH
        // to a Gnosis Safe wallet, which accesses cold address and emits event
        require(minterRefundGasLimit >= 7_000, "Only gte 7_000");
        // EFFECTS
        _minterRefundGasLimit = minterRefundGasLimit;
        emit RAMLib.MinterRefundGasLimitUpdated(minterRefundGasLimit);
    }

    /**
     * @notice Sets auction details for project `projectId`.
     * @param projectId Project ID to set auction details for.
     * @param coreContract Core contract address for the given project.
     * @param auctionTimestampStart Timestamp at which to start the auction.
     * @param maxPrice Maximum price of the auction, in Wei.
     * @param basePrice Resting price of the auction, in Wei.
     * @dev Note that a basePrice of `0` will cause the transaction to revert.
     */
    function setAuctionDetails(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint256 maxPrice,
        uint256 basePrice
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        // CHECKS
        // TODO

        // EFFECTS
        // TODO - update this to be much safer for max invocation checking
        // first refresh max invocations
        MaxInvocationsLib.refreshMaxInvocations({
            projectId: projectId,
            coreContract: coreContract
        });
        // then get max invocations
        uint256 maxInvocations = MaxInvocationsLib.getMaxInvocations({
            projectId: projectId,
            coreContract: coreContract
        });
        (uint256 coreInvocations, ) = MaxInvocationsLib
            .coreContractInvocationData({
                projectId: projectId,
                coreContract: coreContract
            });
        uint256 numTokensInAuction = maxInvocations - coreInvocations;
        RAMLib.setAuctionDetails({
            projectId: projectId,
            coreContract: coreContract,
            auctionTimestampStart: auctionTimestampStart,
            maxPrice: maxPrice.toUint88(),
            basePrice: basePrice.toUint88(),
            numTokensInAuction: uint24(numTokensInAuction) // TODO note why this is safe to cast
        });

        // TODO ...
    }

    // /**
    //  * @notice View function to return the current minter-level configuration
    //  * details.
    //  * @return minAuctionDurationSeconds Minimum auction duration in seconds.
    //  * Note that this value is a constant on this version of the minter.
    //  * @return minterTimeBufferSeconds Buffer time in seconds
    //  * @return minterRefundGasLimit Gas limit for refunding ETH
    //  */
    // function minterConfigurationDetails()
    //     external
    //     view
    //     returns (
    //         uint256 minAuctionDurationSeconds,
    //         uint32 minterTimeBufferSeconds,
    //         uint24 minterRefundGasLimit
    //     )
    // {
    //     minAuctionDurationSeconds = MIN_AUCTION_DURATION_SECONDS;
    //     minterTimeBufferSeconds = _minterTimeBufferSeconds;
    //     minterRefundGasLimit = _minterRefundGasLimit;
    // }

    /**
     * @notice Gets the maximum invocations project configuration.
     * @param projectId The ID of the project whose data needs to be fetched.
     * @param coreContract The address of the core contract.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        return
            MaxInvocationsLib.getMaxInvocationsProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    function getAuctionDetails(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            uint40 auctionTimestampStart,
            uint88 maxPrice,
            uint88 basePrice,
            uint24 numTokensInAuction,
            uint24 numActiveBids
        )
    {
        return
            RAMLib.getAuctionDetails({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations? Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached. A false negative will
     * only result in a gas cost increase, since the core contract will still
     * enforce a maxInvocation check during minting. A false positive is not
     * possible because the V3 core contract only allows maximum invocations
     * to be reduced, not increased. Based on this rationale, we intentionally
     * do not do input validation in this method as to whether or not the input
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 projectId,
        address coreContract
    ) external view returns (bool) {
        return
            MaxInvocationsLib.getMaxHasBeenInvoked({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice projectId => project's maximum number of invocations.
     * Optionally synced with core contract value, for gas optimization.
     * Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached.
     * @dev A number greater than the core contract's project max invocations
     * will only result in a gas cost increase, since the core contract will
     * still enforce a maxInvocation check during minting. A number less than
     * the core contract's project max invocations is only possible when the
     * project's max invocations have not been synced on this minter, since the
     * V3 core contract only allows maximum invocations to be reduced, not
     * increased. When this happens, the minter will enable minting, allowing
     * the core contract to enforce the max invocations check. Based on this
     * rationale, we intentionally do not do input validation in this method as
     * to whether or not the input `projectId` is an existing project ID.
     * @param projectId is an existing project ID.
     * @param coreContract is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        return
            MaxInvocationsLib.getMaxInvocations({
                projectId: projectId,
                coreContract: coreContract
            });
    }

    /**
     * @notice Checks if the specified `coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `isEngine` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngineView`
     * function from the `SplitFundsLib` library to check if `coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param coreContract The address of the contract to check.
     * @return bool indicating if `coreContract` is a valid engine contract.
     */
    function isEngineView(address coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = SplitFundsLib
            .getIsEngineCacheConfig(coreContract);
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-state-modifying variant of isEngine
            return SplitFundsLib.getV3CoreIsEngineView(coreContract);
        }
    }

    /**
     * @notice Gets price info to become the leading bidder on a token auction.
     * If artist has not called `configureFutureAuctions` and there is no
     * active token auction accepting bids, `isConfigured` will be false, and a
     * dummy price of zero is assigned to `tokenPriceInWei`.
     * If there is an active auction accepting bids, `isConfigured` will be
     * true, and `tokenPriceInWei` will be the sum of the current bid value and
     * the minimum bid increment due to the minter's
     * `minterMinBidIncrementPercentage`.
     * If there is an auction that has ended (no longer accepting bids), but
     * the project is configured, `isConfigured` will be true, and
     * `tokenPriceInWei` will be the minimum initial bid price for the next
     * token auction.
     * Also returns currency symbol and address to be being used as payment,
     * which for this minter is ETH only.
     * @param projectId Project ID to get price information for.
     * @param coreContract Core contract to get price information for.
     * @return isConfigured true only if project auctions are configured.
     * @return tokenPriceInWei price in wei to become the leading bidder on a
     * token auction.
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        // (isConfigured, tokenPriceInWei) = SEALib.getPriceInfo({
        //     projectId: projectId,
        //     coreContract: coreContract
        // });
        // // currency is always ETH
        // currencySymbol = "ETH";
        // currencyAddress = address(0);
    }

    function getMinBidValue(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256) {
        RAMLib.Bid storage minBid = RAMLib.getMinBid({
            projectId: projectId,
            coreContract: coreContract
        });
        return
            RAMLib.bidValueFromSlotIndex(
                RAMLib.getRAMProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                }),
                minBid.slotIndex
            );
    }

    /**
     * @notice Syncs local maximum invocations of project `projectId` based on
     * the value currently defined in the core contract.
     * @param projectId Project ID to set the maximum invocations for.
     * @param coreContract Core contract address for the given project.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) public {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Enters a bid for token `tokenId`.
     * If an auction for token `tokenId` does not exist, an auction will be
     * initialized as long as any existing auction for the project has been
     * settled.
     * In order to successfully place the bid, the token bid must be:
     * - greater than or equal to a project's minimum bid price if a new
     *   auction is initialized
     * - sufficiently greater than the current highest bid, according to the
     *   minter's bid increment percentage `minterMinBidIncrementPercentage`,
     *   if an auction for the token already exists
     * If the bid is unsuccessful, the transaction will revert.
     * If the bid is successful, but outbid by another bid before the auction
     * ends, the funds will be noncustodially returned to the bidder's address,
     * `msg.sender`. A fallback method of sending funds back to the bidder via
     * SELFDESTRUCT (SENDALL) prevents denial of service attacks, even if the
     * original bidder reverts or runs out of gas during receive or fallback.
     * ------------------------------------------------------------------------
     * WARNING: bidders must be prepared to handle the case where their bid is
     * outbid and their funds are returned to the original `msg.sender` address
     * via SELFDESTRUCT (SENDALL).
     * ------------------------------------------------------------------------
     * Note that the use of `tokenId` is to prevent the possibility of
     * transactions that are stuck in the pending pool for long periods of time
     * from unintentionally bidding on auctions for future tokens.
     * If a new auction is initialized during this call, the project's next
     * token will be attempted to be minted to this minter contract, preparing
     * it for the next auction. If the project's next token cannot be minted
     * due to e.g. reaching the maximum invocations on the core contract or
     * minter, the project's next token will not be minted.
     * @param projectId projectId being bid on.
     * @param coreContract Core contract address for the given project.
     * @dev nonReentrant modifier is used to prevent reentrancy attacks, e.g.
     * an an auto-bidder that would be able to atomically outbid a user's
     * new bid via a reentrant call to createBid.
     */
    function createBid(
        uint256 projectId,
        address coreContract,
        uint8 slotIndex
    ) public payable nonReentrant {
        // CHECKS
        // TODO many more checks required
        // @dev temporarily adding different check for gas testing purposes
        uint256 targetBidValue = RAMLib.bidValueFromSlotIndex(
            RAMLib.getRAMProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            }),
            slotIndex
        );
        require(msg.value == targetBidValue, "msg.value must equal slot value");
        // get slot index for bid

        RAMLib.placeBid({
            projectId: projectId,
            coreContract: coreContract,
            slotIndex: slotIndex,
            bidder: msg.sender,
            minterRefundGasLimit: _minterRefundGasLimit
        });
    }
}
