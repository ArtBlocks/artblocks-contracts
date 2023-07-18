// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import "../../interfaces/v0.8.x/ISharedMinterV0.sol";
import "../../interfaces/v0.8.x/ISharedMinterDAV0.sol";
import "../../interfaces/v0.8.x/ISharedMinterDAExpV0.sol";
import "../../interfaces/v0.8.x/IMinterFilterV1.sol";

import "../../libs/v0.8.x/minter-libs/SplitFundsLib.sol";
import "../../libs/v0.8.x/minter-libs/MaxInvocationsLib.sol";
import "../../libs/v0.8.x/minter-libs/DALib.sol";
import "../../libs/v0.8.x/minter-libs/AuthLib.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin-4.5/contracts/utils/math/SafeCast.sol";

pragma solidity 0.8.19;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 */
contract MinterDAExpV5 is
    ReentrancyGuard,
    ISharedMinterV0,
    ISharedMinterDAV0,
    ISharedMinterDAExpV0
{
    using SafeCast for uint256;
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterDALinV5";

    /// minter version for this minter
    string public constant minterVersion = "v5.0.0";

    uint256 constant ONE_MILLION = 1_000_000;
    //// Minimum price decay half life: price must decay with a half life of at
    /// least this amount (must cut in half at least every N seconds).
    uint256 public minimumPriceDecayHalfLifeSeconds = 300; // 5 minutes

    /// contractAddress => projectId => base project config
    mapping(address => mapping(uint256 => ProjectConfig))
        private _projectConfigMapping;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SplitFundsLib begin here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // contractAddress => IsEngineCache
    mapping(address => SplitFundsLib.IsEngineCache) private _isEngineCaches;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR SplitFundsLib end here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    mapping(address => mapping(uint256 => DALib.DAProjectConfig))
        private _auctionProjectConfigMapping;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR MaxInvocationsLib begin here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // contractAddress => projectId => max invocations specific project config
    mapping(address => mapping(uint256 => MaxInvocationsLib.MaxInvocationsProjectConfig))
        private _maxInvocationsProjectConfigMapping;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STATE VARIABLES FOR MaxInvocationsLib end here
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter` minter filter.
     * @param _minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(address _minterFilter) ReentrancyGuard() {
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV1(_minterFilter);
    }

    /**
     * @notice Manually sets the local maximum invocations of project `_projectId`
     * with the provided `_maxInvocations`, checking that `_maxInvocations` is less
     * than or equal to the value of project `_project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `_maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocations
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocations,
            _maxInvocationsProjectConfigMapping[_coreContract][_projectId]
        );
        emit ProjectMaxInvocationsLimitUpdated(
            _projectId,
            _coreContract,
            _maxInvocations
        );
    }

    /**
     * @notice Sets auction details for project `_projectId`.
     * @param _projectId Project ID to set auction details for.
     * @param _coreContract Core contract address for the given project.
     * @param _auctionTimestampStart Timestamp at which to start the auction.
     * @param _priceDecayHalfLifeSeconds The half life with which to decay the
     *  price (in seconds).
     * @param _startPrice Price at which to start the auction, in Wei.
     * @param _basePrice Resting price of the auction, in Wei.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     */
    function setAuctionDetails(
        uint256 _projectId,
        address _coreContract,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    ) external {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });
        // CHECKS
        DALib.DAProjectConfig
            storage _auctionProjectConfig = _auctionProjectConfigMapping[
                _coreContract
            ][_projectId];

        DALib.setAuctionDetailsExp(
            _auctionProjectConfig,
            _auctionTimestampStart,
            _priceDecayHalfLifeSeconds,
            _startPrice,
            _basePrice,
            minimumPriceDecayHalfLifeSeconds
        );

        emit SetAuctionDetails(
            _projectId,
            _coreContract,
            _auctionTimestampStart,
            _priceDecayHalfLifeSeconds,
            _startPrice,
            _basePrice
        );

        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig = _maxInvocationsProjectConfigMapping[
                _coreContract
            ][_projectId];

        // sync local max invocations if not initially populated
        // @dev if local max invocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated.
        if (
            _maxInvocationsProjectConfig.maxInvocations == 0 &&
            _maxInvocationsProjectConfig.maxHasBeenInvoked == false
        ) {
            syncProjectMaxInvocationsToCore(_projectId, _coreContract);
        }
    }

    /**
     * @notice Sets the minimum and maximum values that are settable for
     * `_priceDecayHalfLifeSeconds` across all projects.
     * @param _minimumPriceDecayHalfLifeSeconds Minimum price decay half life
     * (in seconds).
     */
    function setMinimumPriceDecayHalfLifeRangeSeconds(
        uint256 _minimumPriceDecayHalfLifeSeconds
    ) external {
        AuthLib.onlyMinterFilterAdminACL({
            _minterFilterAddress: minterFilterAddress,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.setMinimumPriceDecayHalfLifeRangeSeconds.selector
        });
        require(
            _minimumPriceDecayHalfLifeSeconds > 0,
            "Half life of zero not allowed"
        );
        minimumPriceDecayHalfLifeSeconds = _minimumPriceDecayHalfLifeSeconds;

        emit AuctionMinHalfLifeSecondsUpdated(
            _minimumPriceDecayHalfLifeSeconds
        );
    }

    /**
     * @notice Resets auction details for project `_projectId`, zero-ing out all
     * relevant auction fields. Not intended to be used in normal auction
     * operation, but rather only in case of the need to halt an auction.
     * @param _projectId Project ID to set auction details for.
     */
    function resetAuctionDetails(
        uint256 _projectId,
        address _coreContract
    ) external {
        AuthLib.onlyCoreAdminACL({
            _coreContract: _coreContract,
            _sender: msg.sender,
            _contract: address(this),
            _selector: this.resetAuctionDetails.selector
        });
        DALib.DAProjectConfig
            storage _auctionProjectConfig = _auctionProjectConfigMapping[
                _coreContract
            ][_projectId];

        DALib.resetAuctionDetailsExp(_auctionProjectConfig);

        emit ResetAuctionDetails(_projectId, _coreContract);
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId,
        address _coreContract
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo(msg.sender, _projectId, _coreContract);
        return tokenId;
    }

    // public getter functions
    /**
     * @notice Gets the maximum invocations project configuration.
     * @param _coreContract The address of the core contract.
     * @param _projectId The ID of the project whose data needs to be fetched.
     * @return MaxInvocationsLib.MaxInvocationsProjectConfig instance with the
     * configuration data.
     */
    function maxInvocationsProjectConfig(
        uint256 _projectId,
        address _coreContract
    )
        external
        view
        returns (MaxInvocationsLib.MaxInvocationsProjectConfig memory)
    {
        return _maxInvocationsProjectConfigMapping[_coreContract][_projectId];
    }

    /**
     * @notice Gets the base project configuration.
     * @param _coreContract The address of the core contract.
     * @param _projectId The ID of the project whose data needs to be fetched.
     * @return ProjectConfig instance with the project configuration data.
     */
    function projectConfig(
        uint256 _projectId,
        address _coreContract
    ) external view returns (ProjectConfig memory) {
        return _projectConfigMapping[_coreContract][_projectId];
    }

    /**
     * @notice coreContract => projectId => auction parameters
     */
    function projectAuctionParameters(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256, uint256, uint256, uint256) {
        DALib.DAProjectConfig
            storage _auctionProjectConfig = _auctionProjectConfigMapping[
                _coreContract
            ][_projectId];
        return (
            _auctionProjectConfig.timestampStart,
            _auctionProjectConfig.priceDecayHalfLifeSeconds,
            _auctionProjectConfig.startPrice,
            _auctionProjectConfig.basePrice
        );
    }

    /**
     * @notice Checks if the specified `_coreContract` is a valid engine contract.
     * @dev This function retrieves the cached value of `_coreContract` from
     * the `isEngineCache` mapping. If the cached value is already set, it
     * returns the cached value. Otherwise, it calls the `getV3CoreIsEngine`
     * function from the `SplitFundsLib` library to check if `_coreContract`
     * is a valid engine contract.
     * @dev This function will revert if the provided `_coreContract` is not
     * a valid Engine or V3 Flagship contract.
     * @param _coreContract The address of the contract to check.
     * @return bool indicating if `_coreContract` is a valid engine contract.
     */
    function isEngineView(address _coreContract) external view returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = _isEngineCaches[
            _coreContract
        ];
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            // @dev this calls the non-modifying variant of getV3CoreIsEngine
            return SplitFundsLib.getV3CoreIsEngineView(_coreContract);
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
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId,
        address _coreContract
    ) external view returns (bool) {
        return
            _maxInvocationsProjectConfigMapping[_coreContract][_projectId]
                .maxHasBeenInvoked;
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
     * to whether or not the input `_projectId` is an existing project ID.
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return
            uint256(
                _maxInvocationsProjectConfigMapping[_coreContract][_projectId]
                    .maxInvocations
            );
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * Reverts if auction has not yet started or auction is unconfigured.
     * @param _projectId Project ID to get price of token for.
     * @param _coreContract Contract address of the core contract
     * @return current price of token in Wei
     */
    function _getPrice(
        uint256 _projectId,
        address _coreContract
    ) private view returns (uint256) {
        DALib.DAProjectConfig
            storage auctionProjectConfig = _auctionProjectConfigMapping[
                _coreContract
            ][_projectId];
        // move parameters to memory if used more than once
        uint256 _timestampStart = uint256(auctionProjectConfig.timestampStart);
        uint256 _priceDecayHalfLifeSeconds = uint256(
            auctionProjectConfig.priceDecayHalfLifeSeconds
        );
        uint256 _basePrice = auctionProjectConfig.basePrice;

        require(block.timestamp > _timestampStart, "Auction not yet started");
        require(_priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        uint256 decayedPrice = auctionProjectConfig.startPrice;
        uint256 elapsedTimeSeconds;
        unchecked {
            // already checked that block.timestamp > _timestampStart above
            elapsedTimeSeconds = block.timestamp - _timestampStart;
        }
        // Divide by two (via bit-shifting) for the number of entirely completed
        // half-lives that have elapsed since auction start time.
        unchecked {
            // already required _priceDecayHalfLifeSeconds > 0
            decayedPrice >>= elapsedTimeSeconds / _priceDecayHalfLifeSeconds;
        }
        // Perform a linear interpolation between partial half-life points, to
        // approximate the current place on a perfect exponential decay curve.
        unchecked {
            // value of expression is provably always less than decayedPrice,
            // so no underflow is possible when the subtraction assignment
            // operator is used on decayedPrice.
            decayedPrice -=
                (decayedPrice *
                    (elapsedTimeSeconds % _priceDecayHalfLifeSeconds)) /
                _priceDecayHalfLifeSeconds /
                2;
        }
        if (decayedPrice < _basePrice) {
            // Price may not decay below stay `basePrice`.
            return _basePrice;
        }
        return decayedPrice;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for
     * @param _coreContract Contract address of the core contract
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
        uint256 _projectId,
        address _coreContract
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
        DALib.DAProjectConfig
            storage auctionProjectConfig = _auctionProjectConfigMapping[
                _coreContract
            ][_projectId];
        isConfigured = (auctionProjectConfig.startPrice > 0);
        if (block.timestamp <= auctionProjectConfig.timestampStart) {
            // Provide a reasonable value for `tokenPriceInWei` when it would
            // otherwise revert, using the starting price before auction starts.
            tokenPriceInWei = auctionProjectConfig.startPrice;
        } else if (auctionProjectConfig.startPrice == 0) {
            // In the case of unconfigured auction, return price of zero when
            // it would otherwise revert
            tokenPriceInWei = 0;
        } else {
            tokenPriceInWei = _getPrice(_projectId, _coreContract);
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _coreContract Core contract address for the given project.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract
    ) public {
        AuthLib.onlyArtist({
            _projectId: _projectId,
            _coreContract: _coreContract,
            _sender: msg.sender
        });

        uint256 maxInvocations = MaxInvocationsLib
            .syncProjectMaxInvocationsToCore(
                _projectId,
                _coreContract,
                _maxInvocationsProjectConfigMapping[_coreContract][_projectId]
            );
        emit ProjectMaxInvocationsLimitUpdated(
            _projectId,
            _coreContract,
            maxInvocations
        );
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Core contract address for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig = _maxInvocationsProjectConfigMapping[
                _coreContract
            ][_projectId];

        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `_maxInvocationsProjectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        require(
            !_maxInvocationsProjectConfig.maxHasBeenInvoked,
            "Max invocations reached"
        );

        uint256 pricePerTokenInWei = _getPrice(_projectId, _coreContract);
        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        // EFFECTS
        tokenId = minterFilter.mint_joo(
            _to,
            _projectId,
            _coreContract,
            msg.sender
        );

        MaxInvocationsLib.validatePurchaseEffectsInvocations(
            tokenId,
            _maxInvocationsProjectConfigMapping[_coreContract][_projectId]
        );

        // INTERACTIONS
        bool isEngine = SplitFundsLib.isEngine(
            _coreContract,
            _isEngineCaches[_coreContract]
        );
        SplitFundsLib.splitFundsETH(
            _projectId,
            pricePerTokenInWei,
            _coreContract,
            isEngine
        );

        return tokenId;
    }
}
