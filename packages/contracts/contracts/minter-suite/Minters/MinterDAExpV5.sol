// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.19;

import {ISharedMinterSimplePurchaseV0} from "../../interfaces/v0.8.x/ISharedMinterSimplePurchaseV0.sol";
import {ISharedMinterV0} from "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import {ISharedMinterDAV0} from "../../interfaces/v0.8.x/ISharedMinterDAV0.sol";
import {ISharedMinterDAExpV0} from "../../interfaces/v0.8.x/ISharedMinterDAExpV0.sol";
import {IMinterFilterV1} from "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {SplitFundsLib} from "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import {MaxInvocationsLib} from "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import {DAExpLib} from "../../libs/v0.8.x/minter-libs/DAExpLib.sol";
import {AuthLib} from "../../libs/v0.8.x/AuthLib.sol";

import {SafeCast} from "@openzeppelin-4.7/contracts/utils/math/SafeCast.sol";
import {ReentrancyGuard} from "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

/**
 * @title Shared, filtered Minter contract that allows tokens to be minted with
 * ETH. Pricing is achieved using an automated, exponential Dutch-auction mechanism.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the project's artist, which
 * can be modified by the core contract's Admin ACL contract. Both of these
 * roles hold extensive power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
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
 * The following functions are restricted to a project's artist:
 * - setAuctionDetails (note: this may only be called when there is no active
 *   auction)
 * - syncProjectMaxInvocationsToCore
 * - manuallyLimitProjectMaxInvocations
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
 *  @dev Note that while this minter makes use of `block.timestamp` and it is
 * technically possible that this value is manipulated by block producers, such
 * manipulation will not have material impact on the price values of this minter
 * given the business practices for how pricing is congfigured for this minter
 * and that variations on the order of less than a minute should not
 * meaningfully impact price given the minimum allowable price decay rate that
 * this minter intends to support.
 */
contract MinterDAExpV5 is
    ReentrancyGuard,
    ISharedMinterSimplePurchaseV0,
    ISharedMinterV0,
    ISharedMinterDAV0,
    ISharedMinterDAExpV0
{
    using SafeCast for uint256;
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable _minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterDAExpV5";

    /// minter version for this minter
    string public constant minterVersion = "v5.0.0";

    uint256 constant ONE_MILLION = 1_000_000;
    //// Minimum price decay half life: price must decay with a half life of at
    /// least this amount (must cut in half at least every N seconds).
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
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations({
            _projectId: projectId,
            _coreContract: coreContract,
            _maxInvocations: maxInvocations
        });
    }

    /**
     * @notice Sets auction details for project `projectId`.
     * Requires one of the following:
     * - The auction is unconfigured
     * - The auction has not yet started
     * - The minter-local max invocations have been reached
     * @dev Note that allowing the artist to set auction details after reaching
     * max invocations effectively grants the artist the ability to set a new
     * auction at any point, since minter-local max invocations can be set by
     * the artist.
     * @param projectId Project ID to set auction details for.
     * @param coreContract Core contract address for the given project.
     * @param auctionTimestampStart Timestamp at which to start the auction.
     * @param priceDecayHalfLifeSeconds The half life with which to decay the
     *  price (in seconds).
     * @param startPrice Price at which to start the auction, in Wei.
     * @param basePrice Resting price of the auction, in Wei.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
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
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });
        // CHECKS
        require(
            (priceDecayHalfLifeSeconds >= minimumPriceDecayHalfLifeSeconds),
            "Price decay half life must be greater than min allowable value"
        );

        // EFFECTS
        bool maxHasBeenInvoked = MaxInvocationsLib.getMaxHasBeenInvoked(
            projectId,
            coreContract
        );
        DAExpLib.setAuctionDetailsExp({
            _projectId: projectId,
            _coreContract: coreContract,
            _auctionTimestampStart: auctionTimestampStart,
            _priceDecayHalfLifeSeconds: priceDecayHalfLifeSeconds,
            _startPrice: startPrice.toUint88(),
            _basePrice: basePrice.toUint88(),
            _allowReconfigureAfterStart: maxHasBeenInvoked
        });

        // sync local max invocations if not initially populated
        // @dev if local max invocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated.
        if (
            MaxInvocationsLib.maxInvocationsIsUnconfigured(
                projectId,
                coreContract
            )
        ) {
            syncProjectMaxInvocationsToCore(projectId, coreContract);
        }
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
            _minterFilterAddress: minterFilterAddress,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.setMinimumPriceDecayHalfLifeSeconds.selector
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
            _coreContract: coreContract,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.resetAuctionDetails.selector
        });

        DAExpLib.resetAuctionDetails({
            _projectId: projectId,
            _coreContract: coreContract
        });
    }

    /**
     * @notice Purchases a token from project `projectId`.
     * Note: Collectors should not send excessive value with their purchase
     * transaction, because the artist has the ability to change the auction
     * details at any time, including the price.
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
            MaxInvocationsLib.getMaxInvocationsProjectConfig(
                projectId,
                coreContract
            );
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
            .getDAProjectConfig(projectId, coreContract);
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
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngine`
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
            // @dev this calls the non-modifying variant of getV3CoreIsEngine
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
        return MaxInvocationsLib.getMaxHasBeenInvoked(projectId, coreContract);
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
        return MaxInvocationsLib.getMaxInvocations(projectId, coreContract);
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
            .getDAProjectConfig(projectId, coreContract);
        isConfigured = (auctionProjectConfig.startPrice > 0);
        if (!isConfigured) {
            // In the case of unconfigured auction, return price of zero when
            // getPriceExp would otherwise revert
            tokenPriceInWei = 0;
        } else if (block.timestamp <= auctionProjectConfig.timestampStart) {
            // Provide a reasonable value for `tokenPriceInWei` when
            // getPriceExp would otherwise revert, using the starting price
            // before auction starts.
            tokenPriceInWei = auctionProjectConfig.startPrice;
        } else {
            tokenPriceInWei = DAExpLib.getPriceExp({
                _projectId: projectId,
                _coreContract: coreContract
            });
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
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
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });

        MaxInvocationsLib.syncProjectMaxInvocationsToCore({
            _projectId: projectId,
            _coreContract: coreContract
        });
    }

    /**
     * @notice Purchases a token from project `projectId` and sets
     * the token's owner to `to`.
     * Note: Collectors should not send excessive value with their purchase
     * transaction, because the artist has the ability to change the auction
     * details at any time, including the price.
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
        MaxInvocationsLib.preMintChecks(projectId, coreContract);

        // getPriceExp reverts if auction is unconfigured or has not started
        uint256 pricePerTokenInWei = DAExpLib.getPriceExp({
            _projectId: projectId,
            _coreContract: coreContract
        });
        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        // EFFECTS
        tokenId = _minterFilter.mint_joo({
            _to: to,
            _projectId: projectId,
            _coreContract: coreContract,
            _sender: msg.sender
        });

        MaxInvocationsLib.validatePurchaseEffectsInvocations(
            tokenId,
            coreContract
        );

        // INTERACTIONS
        SplitFundsLib.splitFundsETHRefundSender({
            _projectId: projectId,
            _pricePerTokenInWei: pricePerTokenInWei,
            _coreContract: coreContract
        });

        return tokenId;
    }
}
