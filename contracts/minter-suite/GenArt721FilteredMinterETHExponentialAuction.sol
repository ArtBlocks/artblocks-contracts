// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IFilteredMinter.sol";

pragma solidity 0.8.9;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * Pricing is achieved using an automated Dutch-auction mechanism.
 * @author Art Blocks Inc.
 */
contract GenArt721FilteredMinterETHExponentialAuction is IFilteredMinter {
    /// Auction details updated for project `projectId`.
    event SetAuctionDetails(
        uint256 indexed projectId,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    );

    /// Maximum and minimum allowed price decay half lifes updated.
    event AuctionHalfLifeRangeSecondsUpdated(
        uint256 _minimumPriceDecayHalfLifeSeconds,
        uint256 _maximumPriceDecayHalfLifeSeconds
    );

    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContractV3 public genArtCoreContract;
    /// Minter filter this minter may interact with.
    IMinterFilter public minterFilter;

    /// minterType for this minter
    string public constant minterType =
        "GenArt721FilteredMinterETHExponentialAuction";

    uint256 constant ONE_MILLION = 1_000_000;

    /// projectId => are contracts allowed to mint?
    mapping(uint256 => bool) public contractMintable;
    /// projectId => are tokens allowed to be minted to other addresses?
    mapping(uint256 => bool) public purchaseToDisabled;
    /// purchaser address => projectId => number of mints purchased
    mapping(address => mapping(uint256 => uint256)) public projectMintCounter;
    /// projectId => maximum number of mints a given address may invoke
    mapping(uint256 => uint256) public projectMintLimit;
    /// projectId => has project reached its maximum number of invocations?
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    /// projectId => project's maximum number of invocations
    mapping(uint256 => uint256) public projectMaxInvocations;

    /// Minimum price decay half life: price must decay with a half life of at
    /// least this amount (must cut in half at least every N seconds).
    uint256 public minimumPriceDecayHalfLifeSeconds = 300; // 5 minutes
    /// Maximum price decay half life: price may decay with a half life of no
    /// more than this amount (may cut in half at no more than every N seconds).
    uint256 public maximumPriceDecayHalfLifeSeconds = 3600; // 60 minutes

    /// projectId => auction parameters
    mapping(uint256 => AuctionParameters) public projectAuctionParameters;
    struct AuctionParameters {
        uint256 timestampStart;
        uint256 priceDecayHalfLifeSeconds;
        uint256 startPrice;
        uint256 basePrice;
    }

    modifier onlyCoreWhitelisted() {
        require(
            genArtCoreContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    modifier onlyCoreWhitelistedOrArtist(uint256 _projectId) {
        require(
            (genArtCoreContract.isWhitelisted(msg.sender) ||
                msg.sender ==
                genArtCoreContract.projectIdToArtistAddress(_projectId)),
            "Only Core whitelisted or Artist"
        );
        _;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for which
     * this will a filtered minter.
     */
    constructor(address _genArt721Address, address _minterFilter) {
        genArtCoreContract = IGenArt721CoreContractV3(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
        require(
            minterFilter.genArtCoreContract() == genArtCoreContract,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice Sets the mint limit of a single purchaser for project
     * `_projectId` to `_limit`.
     * @param _limit Number of times a given address may mint the
     * project's tokens.
     */
    function setProjectMintLimit(uint256 _projectId, uint8 _limit)
        external
        onlyCoreWhitelisted
    {
        projectMintLimit[_projectId] = _limit;
    }

    /**
     * @notice Sets the maximum invocations of project `_projectId` based
     * on the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev also checks and may refresh projectMaxHasBeenInvoked for project
     */
    function setProjectMaxInvocations(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        uint256 maxInvocations;
        uint256 invocations;
        (, , invocations, maxInvocations, , , , , ) = genArtCoreContract
            .projectTokenInfo(_projectId);
        projectMaxInvocations[_projectId] = maxInvocations;
        if (invocations < maxInvocations) {
            projectMaxHasBeenInvoked[_projectId] = false;
        }
    }

    /**
     * @notice Toggles if contracts are allowed to mint tokens for
     * project `_projectId`.
     * @param _projectId Project ID to be toggled.
     */
    function toggleContractMintable(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        contractMintable[_projectId] = !contractMintable[_projectId];
    }

    /**
     * @notice Toggles if purchases to other address are enabled for
     * project `_projectId`.
     * @param _projectId Project ID to be toggled.
     */
    function togglePurchaseToDisabled(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        purchaseToDisabled[_projectId] = !purchaseToDisabled[_projectId];
        emit PurchaseToDisabledUpdated(
            _projectId,
            purchaseToDisabled[_projectId]
        );
    }

    /**
     * @notice Sets the minimum and maximum values that are settable for
     * `_priceDecayHalfLifeSeconds` across all projects.
     * @param _minimumPriceDecayHalfLifeSeconds Minimum price decay half life
     * (in seconds).
     * @param _maximumPriceDecayHalfLifeSeconds Maximum price decay half life
     * (in seconds).
     */
    function setAllowablePriceDecayHalfLifeRangeSeconds(
        uint256 _minimumPriceDecayHalfLifeSeconds,
        uint256 _maximumPriceDecayHalfLifeSeconds
    ) external onlyCoreWhitelisted {
        require(
            _maximumPriceDecayHalfLifeSeconds >
                _minimumPriceDecayHalfLifeSeconds,
            "Maximum half life must be greater than minimum"
        );
        require(
            _minimumPriceDecayHalfLifeSeconds > 0,
            "Half life of zero not allowed"
        );
        minimumPriceDecayHalfLifeSeconds = _minimumPriceDecayHalfLifeSeconds;
        maximumPriceDecayHalfLifeSeconds = _maximumPriceDecayHalfLifeSeconds;
        emit AuctionHalfLifeRangeSecondsUpdated(
            _minimumPriceDecayHalfLifeSeconds,
            _maximumPriceDecayHalfLifeSeconds
        );
    }

    ////// Auction Functions
    /**
     * @notice Sets auction details for project `_projectId`.
     * @param _projectId Project ID to set auction details for.
     * @param _auctionTimestampStart Timestamp at which to start the auction.
     * @param _priceDecayHalfLifeSeconds The half life with which to decay the
     *  price (in seconds).
     * @param _startPrice Price at which to start the auction, in Wei.
     * @param _basePrice Resting price of the auction, in Wei.
     */
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _priceDecayHalfLifeSeconds,
        uint256 _startPrice,
        uint256 _basePrice
    ) external onlyCoreWhitelistedOrArtist(_projectId) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(
            auctionParams.timestampStart == 0 ||
                block.timestamp < auctionParams.timestampStart,
            "No modifications mid-auction"
        );
        require(
            block.timestamp < _auctionTimestampStart,
            "Only future auctions"
        );
        require(
            _startPrice > _basePrice,
            "Auction start price must be greater than auction end price"
        );
        require(
            (_priceDecayHalfLifeSeconds >= minimumPriceDecayHalfLifeSeconds) &&
                (_priceDecayHalfLifeSeconds <=
                    maximumPriceDecayHalfLifeSeconds),
            "Price decay half life must fall between min and max allowable values"
        );
        projectAuctionParameters[_projectId] = AuctionParameters(
            _auctionTimestampStart,
            _priceDecayHalfLifeSeconds,
            _startPrice,
            _basePrice
        );
        emit SetAuctionDetails(
            _projectId,
            _auctionTimestampStart,
            _priceDecayHalfLifeSeconds,
            _startPrice,
            _basePrice
        );
    }

    /**
     * @notice Resets auction details for project `_projectId`, zero-ing out all
     * relevant auction fields. Not intended to be used in normal auction
     * operation, but rather only in case of the need to halt an auction.
     * @param _projectId Project ID to set auction details for.
     */
    function resetAuctionDetails(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        delete projectAuctionParameters[_projectId];
        emit SetAuctionDetails(_projectId, 0, 0, 0, 0);
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchase(uint256 _projectId)
        external
        payable
        returns (uint256 tokenId)
    {
        tokenId = purchaseTo(msg.sender, _projectId);
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(address _to, uint256 _projectId)
        public
        payable
        returns (uint256 tokenId)
    {
        require(
            !projectMaxHasBeenInvoked[_projectId],
            "Maximum number of invocations reached"
        );

        // no need to check if price is configured - auction init values fail

        // if contract filter is off, allow calls from another contract
        if (!contractMintable[_projectId]) {
            require(msg.sender == tx.origin, "No Contract Buys");
        }

        // if purchaseTo is disabled, enforce purchase destination to be the TX
        // sending address.
        if (purchaseToDisabled[_projectId]) {
            require(msg.sender == _to, "No `purchaseTo` Allowed");
        }

        uint256 currentPriceInWei = _getPrice(_projectId);
        require(
            msg.value >= currentPriceInWei,
            "Must send minimum value to mint!"
        );

        // limit mints per address by project
        if (projectMintLimit[_projectId] > 0) {
            require(
                projectMintCounter[msg.sender][_projectId] <
                    projectMintLimit[_projectId],
                "Reached minting limit"
            );
            projectMintCounter[msg.sender][_projectId]++;
        }

        _splitFundsETHAuction(_projectId, currentPriceInWei);

        tokenId = minterFilter.mint(_to, _projectId, msg.sender);
        // what if projectMaxInvocations[_projectId] is 0 (default value)?
        // that is intended, so that by default the minter allows infinite transactions,
        // allowing the artblocks contract to stop minting
        // uint256 tokenInvocation = tokenId % ONE_MILLION;
        if (
            projectMaxInvocations[_projectId] > 0 &&
            tokenId % ONE_MILLION == projectMaxInvocations[_projectId] - 1
        ) {
            projectMaxHasBeenInvoked[_projectId] = true;
        }
        return tokenId;
    }

    /**
     * @dev splits ETH funds between sender (if refund), foundation,
     * artist, and artist's additional payee for a token purchased on
     * project `_projectId`.
     * @dev utilizes transfer() to send ETH, which may fail if access
     * lists are not properly populated when purchasing tokens.
     * @param _projectId Project ID for which funds shall be split.
     * @param _currentPriceInWei Current price of token, in Wei.
     */
    function _splitFundsETHAuction(
        uint256 _projectId,
        uint256 _currentPriceInWei
    ) internal {
        if (msg.value > 0) {
            uint256 refund = msg.value - _currentPriceInWei;
            if (refund > 0) {
                payable(msg.sender).transfer(refund);
            }
            uint256 foundationAmount = (_currentPriceInWei / 100) *
                genArtCoreContract.artblocksPercentage();
            if (foundationAmount > 0) {
                genArtCoreContract.artblocksAddress().transfer(
                    foundationAmount
                );
            }
            uint256 projectFunds = _currentPriceInWei - foundationAmount;
            uint256 additionalPayeeAmount;
            if (
                genArtCoreContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                ) > 0
            ) {
                additionalPayeeAmount =
                    (projectFunds / 100) *
                    genArtCoreContract.projectIdToAdditionalPayeePercentage(
                        _projectId
                    );
                if (additionalPayeeAmount > 0) {
                    genArtCoreContract
                        .projectIdToAdditionalPayee(_projectId)
                        .transfer(additionalPayeeAmount);
                }
            }
            uint256 creatorFunds = projectFunds - additionalPayeeAmount;
            if (creatorFunds > 0) {
                genArtCoreContract
                    .projectIdToArtistAddress(_projectId)
                    .transfer(creatorFunds);
            }
        }
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * @param _projectId Project ID to get price of token for.
     * @return current price of token in Wei
     * @dev This method calculates price decay using a linear interpolation
     * of exponential decay based on the artist-provided half-life for price
     * decay, `_priceDecayHalfLifeSeconds`.
     */
    function _getPrice(uint256 _projectId) private view returns (uint256) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(
            block.timestamp > auctionParams.timestampStart,
            "Auction not yet started"
        );
        if (auctionParams.priceDecayHalfLifeSeconds == 0) {
            // Prevent revert in divide-by-zero case of unconfigured auctions.
            return 0;
        }
        uint256 decayedPrice = auctionParams.startPrice;
        uint256 elapsedTimeSeconds = block.timestamp -
            auctionParams.timestampStart;
        // Divide by two (via bit-shifting) for the number of entirely completed
        // half-lives that have elapsed since auction start time.
        decayedPrice >>=
            elapsedTimeSeconds /
            auctionParams.priceDecayHalfLifeSeconds;
        // Perform a linear interpolation between partial half-life points, to
        // approximate the current place on a perfect exponential decay curve.
        decayedPrice -=
            (decayedPrice *
                (elapsedTimeSeconds %
                    auctionParams.priceDecayHalfLifeSeconds)) /
            auctionParams.priceDecayHalfLifeSeconds /
            2;
        if (decayedPrice < auctionParams.basePrice) {
            // Price may not decay below stay `basePrice`.
            return auctionParams.basePrice;
        }
        return decayedPrice;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if project's auction parameters have been
     * configured on this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if auction has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(uint256 _projectId)
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        isConfigured = (auctionParams.startPrice > 0);
        if (block.timestamp <= auctionParams.timestampStart) {
            // Provide a reasonable value for `tokenPriceInWei` when it would
            // otherwise revert, using the starting price before auction starts.
            tokenPriceInWei = auctionParams.startPrice;
        } else {
            tokenPriceInWei = _getPrice(_projectId);
        }
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
