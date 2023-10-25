// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.19;

import {ISharedMinterSimplePurchaseV0} from "../../interfaces/v0.8.x/ISharedMinterSimplePurchaseV0.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterDAV0} from "../../interfaces/v0.8.x/ISharedMinterDAV0.sol";
import {ISharedMinterDAExpV0} from "../../interfaces/v0.8.x/ISharedMinterDAExpV0.sol";
import {ISharedMinterDAExpSettlementV0} from "../../interfaces/v0.8.x/ISharedMinterDAExpSettlementV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {SettlementExpLib} from "../../libs/v0.8.x/minter-libs/SettlementExpLib.sol";
import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {DAExpLib} from "../../libs/v0.8.x/minter-libs/DAExpLib.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";

import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";
import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * ETH.
 * Pricing is achieved using an automated Dutch-auction mechanism, with a
 * settlement mechanism for tokens purchased before the auction ends.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the core contract's Admin
 * ACL contract and a project's artist. Both of these roles hold extensive
 * power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * Additionally, the purchaser of a token has some trust assumptions regarding
 * settlement, beyond typical minter Art Blocks trust assumptions. In general,
 * Artists and Admin are trusted to not abuse their powers in a way that
 * would artifically inflate the sellout price of a project. They are
 * incentivized to not do so, as it would diminish their reputation and
 * ability to sell future projects. Agreements between Admin and Artist
 * may or may not be in place to further dissuade artificial inflation of an
 * auction's sellout price.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the minter filter's Admin ACL
 * contract:
 * - setMinimumPriceDecayHalfLifeSeconds
 * ----------------------------------------------------------------------------
 * The following functions are restricted to the core contract's Admin ACL
 * contract:
 * - resetAuctionDetails (note: this will prevent minting until a new auction
 *   is created)
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist or the core
 * contract's Admin ACL contract:
 * - withdrawArtistAndAdminRevenues (note: this may only be called after an
 *   auction has sold out or has reached base price)
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - setAuctionDetails (note: this may only be called when there is no active
 *   auction, and must start at a price less than or equal to any previously
 *   made purchases)
 * - manuallyLimitProjectMaxInvocations
 * - syncProjectMaxInvocationsToCore (not implemented)
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
 * technically possible that this value is manipulated by block producers via
 * denial of service (in PoS), such manipulation will not have material impact
 * on the price values of this minter given the business practices for how
 * pricing is congfigured for this minter and that variations on the order of
 * less than a minute should not meaningfully impact price given the minimum
 * allowable price decay rate that this minter intends to support.
 */
contract MinterDAExpSettlementV3 is
    ReentrancyGuard,
    ISharedMinterSimplePurchaseV0,
    ISharedMinterV0,
    ISharedMinterDAV0,
    ISharedMinterDAExpV0,
    ISharedMinterDAExpSettlementV0
{
    using SafeCast for uint256;

    /// @notice Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// @notice Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// @notice minterType for this minter
    string public constant minterType = "MinterDAExpSettlementV3";

    /// @notice minter version for this minter
    string public constant minterVersion = "v3.0.0";

    /// @notice Minimum price decay half life: price can decay with a half life of a
    /// minimum of this amount (can cut in half a minimum of every N seconds).
    uint256 public minimumPriceDecayHalfLifeSeconds = 45; // 45 seconds

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `minterFilter` minter filter.
     * @param minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(address minterFilter) ReentrancyGuard() {
        minterFilterAddress = minterFilter;
        _minterFilter = IMinterFilterV1(minterFilter);
        emit DAExpLib.AuctionMinHalfLifeSecondsUpdated(
            minimumPriceDecayHalfLifeSeconds
        );
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
        // @dev guard rail to prevent accidentally adjusting max invocations
        // after one or more purchases have been made
        require(
            SettlementExpLib.getNumPurchasesOnMinter({
                projectId: projectId,
                coreContract: coreContract
            }) == 0,
            "Only before purchases"
        );
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations({
            projectId: projectId,
            coreContract: coreContract,
            maxInvocations: maxInvocations
        });
    }

    /**
     * @notice Sets auction details for project `projectId`.
     * @param projectId Project ID to set auction details for.
     * @param coreContract Core contract address for the given project.
     * @param auctionTimestampStart Timestamp at which to start the auction.
     * @param priceDecayHalfLifeSeconds The half life with which to decay the
     *  price (in seconds).
     * @param startPrice Price at which to start the auction, in Wei.
     * @param basePrice Resting price of the auction, in Wei.
     * @dev Note that a basePrice of `0` will cause the transaction to revert.
     */
    function setAuctionDetails(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint40 priceDecayHalfLifeSeconds,
        uint256 startPrice,
        uint256 basePrice
    ) external {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        // CHECKS
        // require valid start price on a settlement minter
        require(
            SettlementExpLib.isValidStartPrice({
                projectId: projectId,
                coreContract: coreContract,
                startPrice: startPrice
            }),
            "Only monotonic decreasing price"
        );
        // do not allow a base price of zero (to simplify logic on this minter)
        require(basePrice > 0, "Base price must be non-zero");
        // require valid half life for this minter
        require(
            (priceDecayHalfLifeSeconds >= minimumPriceDecayHalfLifeSeconds),
            "Price decay half life must be greater than min allowable value"
        );

        // EFFECTS
        DAExpLib.setAuctionDetailsExp({
            projectId: projectId,
            coreContract: coreContract,
            auctionTimestampStart: auctionTimestampStart,
            priceDecayHalfLifeSeconds: priceDecayHalfLifeSeconds,
            startPrice: startPrice.toUint88(),
            basePrice: basePrice.toUint88(),
            // we set this to false so it prevents artist from altering auction
            // even after max has been invoked (require explicit auction reset
            // on settlement minter)
            allowReconfigureAfterStart: false
        });

        // refresh max invocations, ensuring the values are populated, and
        // updating any local values that are illogical with respect to the
        // current core contract state.
        // @dev this refresh enables the guarantee that a project's max
        // invocation state is always populated if an auction is configured.
        // @dev this minter pays the higher gas cost of a full refresh here due
        // to the more severe ux degredation of a stale minter-local max
        // invocations state.
        MaxInvocationsLib.refreshMaxInvocations({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Sets the minimum and maximum values that are settable for
     * `priceDecayHalfLifeSeconds` across all projects.
     * @param minimumPriceDecayHalfLifeSeconds_ Minimum price decay half life
     * (in seconds).
     */
    function setMinimumPriceDecayHalfLifeSeconds(
        uint256 minimumPriceDecayHalfLifeSeconds_
    ) external {
        AuthLib.onlyMinterFilterAdminACL({
            minterFilterAddress: minterFilterAddress,
            sender: msg.sender,
            contract_: address(this),
            selector: this.setMinimumPriceDecayHalfLifeSeconds.selector
        });
        require(
            minimumPriceDecayHalfLifeSeconds_ > 0,
            "Half life of zero not allowed"
        );
        minimumPriceDecayHalfLifeSeconds = minimumPriceDecayHalfLifeSeconds_;

        emit DAExpLib.AuctionMinHalfLifeSecondsUpdated(
            minimumPriceDecayHalfLifeSeconds_
        );
    }

    /**
     * @notice Resets auction details for project `projectId`, zero-ing out all
     * relevant auction fields. Not intended to be used in normal auction
     * operation, but rather only in case of the need to halt an auction.
     * @param projectId Project ID to set auction details for.
     * @param coreContract Core contract address for the given project.
     */
    function resetAuctionDetails(
        uint256 projectId,
        address coreContract
    ) external {
        AuthLib.onlyCoreAdminACL({
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.resetAuctionDetails.selector
        });

        SettlementExpLib.SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = SettlementExpLib
                .getSettlementAuctionProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });

        // no reset after revenues collected, since that solidifies amount due
        require(
            !settlementAuctionProjectConfig.auctionRevenuesCollected,
            "Only before revenues collected"
        );

        // EFFECTS
        // delete auction parameters
        DAExpLib.resetAuctionDetails({
            projectId: projectId,
            coreContract: coreContract
        });

        // @dev do NOT delete settlement parameters, as they are used to
        // determine settlement amounts even through a reset
    }

    /**
     * @notice This withdraws project revenues for the artist and admin.
     * This function is only callable by the artist or admin, and only after
     * one of the following is true:
     * - the auction has sold out above base price
     * - the auction has reached base price
     * Note that revenues are not claimable if in a temporary state after
     * an auction is reset.
     * Revenues may only be collected a single time per project.
     * After revenues are collected, auction parameters will never be allowed
     * to be reset, and excess settlement funds will become immutable and fully
     * deterministic.
     * @param projectId Project ID to withdraw revenues for.
     * @param coreContract Core contract address for the given project.
     */
    function withdrawArtistAndAdminRevenues(
        uint256 projectId,
        address coreContract
    ) external nonReentrant {
        AuthLib.onlyCoreAdminACLOrArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender,
            contract_: address(this),
            selector: this.withdrawArtistAndAdminRevenues.selector
        });

        // @dev the following function affects settlement state and marks
        // revenues as collected, as well as distributes revenues.
        // CHECKS-EFFECTS-INTERACTIONS
        // @dev the following function updates the project's balance and will
        // revert if the project's balance is insufficient to cover the
        // settlement amount (which is expected to not be possible)
        SettlementExpLib.distributeArtistAndAdminRevenues({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * project `projectId` on core contract `coreContract`.
     * The current settled price is the the price paid for the most recently
     * purchased token, or the base price if the artist has withdrawn revenues
     * after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends excess settlement funds to msg.sender.
     * @param projectId Project ID to reclaim excess settlement funds on.
     * @param coreContract Contract address of the core contract
     */
    function reclaimProjectExcessSettlementFunds(
        uint256 projectId,
        address coreContract
    ) external {
        reclaimProjectExcessSettlementFundsTo({
            to: payable(msg.sender),
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * projects in `projectIds`. The current settled price is the the price
     * paid for the most recently purchased token, or the base price if the
     * artist has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends total of all excess settlement funds to msg.sender in a single
     * chunk. Entire transaction reverts if any excess settlement calculation
     * fails.
     * @param projectIds Array of project IDs to reclaim excess settlement
     * funds on.
     * @param coreContracts Array of core contract addresses for the given
     * projects. Must be in the same order as `projectIds` (aligned by index).
     */
    function reclaimProjectsExcessSettlementFunds(
        uint256[] calldata projectIds,
        address[] calldata coreContracts
    ) external {
        // @dev input validation checks are performed in subcall
        reclaimProjectsExcessSettlementFundsTo({
            to: payable(msg.sender),
            projectIds: projectIds,
            coreContracts: coreContracts
        });
    }

    /**
     * @notice Purchases a token from project `projectId`.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo({
            to: msg.sender,
            projectId: projectId,
            coreContract: coreContract
        });

        return tokenId;
    }

    // public getter functions
    /**
     * @notice Gets the maximum invocations project configuration.
     * @param coreContract The address of the core contract.
     * @param projectId The ID of the project whose data needs to be fetched.
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

    /**
     * @notice Retrieves the auction parameters for a specific project.
     * @param projectId The unique identifier for the project.
     * @param coreContract The address of the core contract for the project.
     * @return timestampStart The start timestamp for the auction.
     * @return priceDecayHalfLifeSeconds The half-life for the price decay
     * during the auction, in seconds.
     * @return startPrice The starting price of the auction.
     * @return basePrice The base price of the auction.
     */
    function projectAuctionParameters(
        uint256 projectId,
        address coreContract
    )
        external
        view
        returns (
            uint40 timestampStart,
            uint40 priceDecayHalfLifeSeconds,
            uint256 startPrice,
            uint256 basePrice
        )
    {
        DAExpLib.DAProjectConfig storage _auctionProjectConfig = DAExpLib
            .getDAProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });
        timestampStart = _auctionProjectConfig.timestampStart;
        priceDecayHalfLifeSeconds = _auctionProjectConfig
            .priceDecayHalfLifeSeconds;
        startPrice = _auctionProjectConfig.startPrice;
        basePrice = _auctionProjectConfig.basePrice;
    }

    /**
     * @notice Checks if the specified `coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `coreContract` from
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
     * @notice projectId => has project reached its maximum number of
     * invocations? Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached. A false negative will
     * only result in a gas cost increase, since the core contract will still
     * enforce a maxInvocation check during minting. A false positive may be possible
     * if function `manuallyLimitProjectMaxInvocations` has been invoked, resulting in
     * `localMaxInvocations` < `coreContractMaxInvocations`. Based on this rationale, we intentionally
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
     * the core contract's project max invocations is possible if the artist
     * has called manuallyLimitProjectMaxInvocations or when the project's max
     * invocations have not been synced on this minter, since the
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
     * @notice Gets the latest purchase price for project `projectId`, or 0 if
     * no purchases have been made.
     * @param projectId Project ID to get latest purchase price for.
     * @param coreContract Contract address of the core contract
     * @return latestPurchasePrice Latest purchase price
     */
    function getProjectLatestPurchasePrice(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 latestPurchasePrice) {
        SettlementExpLib.SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = SettlementExpLib
                .getSettlementAuctionProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });
        return settlementAuctionProjectConfig.latestPurchasePrice;
    }

    /**
     * @notice Gets the number of settleable invocations for project `projectId`.
     * @param projectId Project ID to get number of settleable invocations for.
     * @param coreContract Contract address of the core contract
     * @return numSettleableInvocations Number of settleable invocations
     */
    function getNumSettleableInvocations(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 numSettleableInvocations) {
        SettlementExpLib.SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = SettlementExpLib
                .getSettlementAuctionProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });
        return settlementAuctionProjectConfig.numSettleableInvocations;
    }

    /**
     * @notice Gets the balance of ETH, in wei, currently held by the minter
     * for project `projectId`. This value is non-zero if not all purchasers
     * have reclaimed their excess settlement funds, or if an artist/admin has
     * not yet withdrawn their revenues.
     * @param projectId Project ID to get balance for.
     * @param coreContract Contract address of the core contract
     */
    function getProjectBalance(
        uint256 projectId,
        address coreContract
    ) external view returns (uint256 projectBalance) {
        SettlementExpLib.SettlementAuctionProjectConfig
            storage settlementAuctionProjectConfig = SettlementExpLib
                .getSettlementAuctionProjectConfig({
                    projectId: projectId,
                    coreContract: coreContract
                });
        return settlementAuctionProjectConfig.projectBalance;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param projectId Project ID to get price information for
     * @param coreContract Contract address of the core contract
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
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
        DAExpLib.DAProjectConfig storage auctionProjectConfig = DAExpLib
            .getDAProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            });

        // take action based on configured state
        isConfigured = (auctionProjectConfig.startPrice > 0);
        if (!isConfigured) {
            // In the case of unconfigured auction, return price of zero when
            // getPriceSafe would otherwise revert
            tokenPriceInWei = 0;
        } else if (block.timestamp <= auctionProjectConfig.timestampStart) {
            // Provide a reasonable value for `tokenPriceInWei` when
            // getPriceSafe would otherwise revert, using the starting price
            // before auction starts.
            tokenPriceInWei = auctionProjectConfig.startPrice;
        } else {
            // call getPriceSafe to get the current price
            // @dev we do not use getPriceUnsafe here, as this is a view
            // function, and we prefer to use the extra gas to appropriately
            // correct for the case of a stale minter max invocation state.
            tokenPriceInWei = SettlementExpLib.getPriceSafe({
                projectId: projectId,
                coreContract: coreContract
            });
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Gets the current excess settlement funds on project `projectId`
     * for address `walletAddress`. The returned value is expected to change
     * throughtout an auction, since the latest purchase price is used when
     * determining excess settlement funds.
     * A user may claim excess settlement funds by calling the function
     * `reclaimProjectExcessSettlementFunds(_projectId)`.
     * @param projectId Project ID to query.
     * @param coreContract Contract address of the core contract
     * @param walletAddress Account address for which the excess posted funds
     * is being queried.
     * @return excessSettlementFundsInWei Amount of excess settlement funds, in
     * wei
     */
    function getProjectExcessSettlementFunds(
        uint256 projectId,
        address coreContract,
        address walletAddress
    ) external view returns (uint256 excessSettlementFundsInWei) {
        // input validation
        require(walletAddress != address(0), "No zero address");

        (excessSettlementFundsInWei, ) = SettlementExpLib
            .getProjectExcessSettlementFunds({
                projectId: projectId,
                coreContract: coreContract,
                walletAddress: walletAddress
            });
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * project `projectId` on core contract `coreContract`.
     * The current settled price is the the price paid for the most recently
     * purchased token, or the base price if the artist has withdrawn revenues
     * after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends excess settlement funds to address `to`.
     * @param to Address to send excess settlement funds to.
     * @param projectId Project ID to reclaim excess settlement funds on.
     * @param coreContract Contract address of the core contract
     */
    function reclaimProjectExcessSettlementFundsTo(
        address payable to,
        uint256 projectId,
        address coreContract
    ) public nonReentrant {
        require(to != address(0), "No claiming to the zero address");

        SettlementExpLib.reclaimProjectExcessSettlementFundsTo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            purchaserAddress: msg.sender
        });
    }

    /**
     * @notice Reclaims the sender's payment above current settled price for
     * projects in `projectIds`. The current settled price is the the price
     * paid for the most recently purchased token, or the base price if the
     * artist has withdrawn revenues after the auction reached base price.
     * This function is callable at any point, but is expected to typically be
     * called after auction has sold out above base price or after the auction
     * has been purchased at base price. This minimizes the amount of gas
     * required to send all excess settlement funds to the sender.
     * Sends total of all excess settlement funds to `to` in a single
     * chunk. Entire transaction reverts if any excess settlement calculation
     * fails.
     * @param to Address to send excess settlement funds to.
     * @param projectIds Array of project IDs to reclaim excess settlement
     * funds on.
     * @param coreContracts Array of core contract addresses for the given
     * projects. Must be in the same order as `projectIds` (aligned by index).
     */
    function reclaimProjectsExcessSettlementFundsTo(
        address payable to,
        uint256[] calldata projectIds,
        address[] calldata coreContracts
    ) public nonReentrant {
        // CHECKS
        // input validation
        require(to != address(0), "No claiming to the zero address");
        uint256 projectIdsLength = projectIds.length;
        require(
            projectIdsLength == coreContracts.length,
            "Array lengths must match"
        );
        // EFFECTS
        // for each project, tally up the excess settlement funds and update
        // the receipt in storage
        uint256 excessSettlementFunds;
        for (uint256 i; i < projectIdsLength; ) {
            SettlementExpLib.reclaimProjectExcessSettlementFundsTo({
                to: to,
                projectId: projectIds[i],
                coreContract: coreContracts[i],
                purchaserAddress: msg.sender
            });

            // gas efficiently increment i
            // won't overflow due to for loop, as well as gas limts
            unchecked {
                ++i;
            }
        }

        // INTERACTIONS
        // send excess settlement funds in a single chunk for all
        // projects
        bool success_;
        (success_, ) = to.call{value: excessSettlementFunds}("");
        require(success_, "Reclaiming failed");
    }

    /**
     * @notice Purchases a token from project `projectId` and sets
     * the token's owner to `to`.
     * @param to Address to be the new token's owner.
     * @param projectId Project ID to mint a token on.
     * @param coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        // pre-mint MaxInvocationsLib checks
        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `maxInvocationsProjectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        MaxInvocationsLib.preMintChecks({
            projectId: projectId,
            coreContract: coreContract
        });

        // _getPriceUnsafe reverts if auction has not yet started or auction is
        // unconfigured, and auction has not sold out or revenues have not been
        // withdrawn.
        // @dev _getPriceUnsafe is guaranteed to be accurate unless the core
        // contract is limiting invocations and we have stale local state
        // returning a false negative that max invocations have been reached.
        // This is acceptable, because that case will revert this
        // call later on in this function, when the core contract's max
        // invocation check fails.
        uint256 currentPriceInWei = SettlementExpLib.getPriceUnsafe({
            projectId: projectId,
            coreContract: coreContract,
            maxHasBeenInvoked: false // always false due to MaxInvocationsLib.preMintChecks
        });

        // EFFECTS
        // update and validate receipts, latest purchase price, overall project
        // balance, and number of tokens auctioned on this minter
        SettlementExpLib.preMintEffects({
            projectId: projectId,
            coreContract: coreContract,
            currentPriceInWei: currentPriceInWei,
            msgValue: msg.value,
            purchaserAddress: msg.sender
        });

        // INTERACTIONS
        tokenId = _minterFilter.mint_joo({
            to: to,
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });

        // verify token invocation is valid given local minter max invocations,
        // update local maxHasBeenInvoked
        MaxInvocationsLib.validatePurchaseEffectsInvocations({
            tokenId: tokenId,
            coreContract: coreContract
        });

        // distribute payments if revenues have been collected, or increment
        // number of settleable invocations if revenues have not been collected
        SettlementExpLib.postMintInteractions({
            projectId: projectId,
            coreContract: coreContract,
            currentPriceInWei: currentPriceInWei
        });
    }

    /**
     * @notice This function is intentionally not implemented for this version
     * of the minter. Due to potential for unintended consequences, the
     * function `manuallyLimitProjectMaxInvocations` should be used to manually
     * and explicitly limit the maximum invocations for a project to a value
     * other than the core contract's maximum invocations for a project.
     * @param coreContract Core contract address for the given project.
     * @param projectId Project ID to set the maximum invocations for.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 projectId,
        address coreContract
    ) public view {
        AuthLib.onlyArtist({
            projectId: projectId,
            coreContract: coreContract,
            sender: msg.sender
        });
        revert("Not implemented");
    }
}
