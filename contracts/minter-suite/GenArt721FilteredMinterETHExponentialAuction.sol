// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IGenArt721CoreContract.sol";
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
        uint256 _decayDenominator,
        uint256 _decayIntervalMinutes,
        uint256 _startPrice,
        uint256 _basePrice
    );

    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContract public artblocksContract;
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

    /// Minimum decay denominator: price must decay by _at least_ this much per
    /// minute, e.g. must decay by at least 1% per minute.
    uint256 public minimumDecayDenomincator = 100;
    /// Maximum decay denominator: price may decay by _no more than_ this much
    /// per minute, e.g. may decay by no more than 10% per minute.
    uint256 public maximumDecayDenomincator = 10;
    /// Minimum decay interval: price must decay at least this often (at least
    /// every N minutes).
    uint256 public minimumDecayIntervalMinutes = 1;
    /// Maximum decay interval: price may decay no more than this often (at most
    /// every N minutes).
    uint256 public maximumDecayIntervalMinutes = 10;

    /// projectId => auction parameters
    mapping(uint256 => AuctionParameters) public projectAuctionParameters;
    struct AuctionParameters {
        uint256 timestampStart;
        uint256 decayDenominator;
        uint256 decayIntervalMinutes;
        uint256 startPrice;
        uint256 basePrice;
    }

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    modifier onlyCoreWhitelistedOrArtist(uint256 _projectId) {
        require(
            (artblocksContract.isWhitelisted(msg.sender) ||
                msg.sender ==
                artblocksContract.projectIdToArtistAddress(_projectId)),
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
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
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
        (, , invocations, maxInvocations, , , , , ) = artblocksContract
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

    ////// Auction Functions
    /**
     * @notice Sets auction details for project `_projectId`.
     * @param _projectId Project ID to set auction details for.
     * @param _auctionTimestampStart Timestamp at which to start the auction.
     * @param _decayDenominator The amount to decay the price each decrement.
     * @param _decayIntervalMinutes The frequency with which to decay the price.
     * @param _startPrice Price at which to start the auction, in Wei.
     * @param _basePrice Resting price of the auction, in Wei.
     */
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _decayDenominator,
        uint256 _decayIntervalMinutes,
        uint256 _startPrice,
        uint256 _basePrice
    ) external onlyCoreWhitelistedOrArtist(_projectId) {
        require(
            block.timestamp < _auctionTimestampStart,
            "Auction may not have already started"
        );
        require(
            _startPrice > _basePrice,
            "Auction start price must be greater than auction end price"
        );
        require(
            (_decayDenominator <= minimumDecayDenomincator) &&
                (_decayDenominator >= maximumDecayDenomincator),
            "Price decay denominator must fall between minmum and maximum allowable values"
        );
        require(
            (_decayIntervalMinutes >= minimumDecayIntervalMinutes) &&
                (_decayIntervalMinutes <= maximumDecayIntervalMinutes),
            "Price decay interval must fall between minmum and maximum allowable values"
        );
        projectAuctionParameters[_projectId] = AuctionParameters(
            _auctionTimestampStart,
            _decayDenominator,
            _decayIntervalMinutes,
            _startPrice,
            _basePrice
        );
        emit SetAuctionDetails(
            _projectId,
            _auctionTimestampStart,
            _decayDenominator,
            _decayIntervalMinutes,
            _startPrice,
            _basePrice
        );
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

        uint256 currentPriceInWei = getPrice(_projectId);
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
                artblocksContract.artblocksPercentage();
            if (foundationAmount > 0) {
                artblocksContract.artblocksAddress().transfer(foundationAmount);
            }
            uint256 projectFunds = _currentPriceInWei - foundationAmount;
            uint256 additionalPayeeAmount;
            if (
                artblocksContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                ) > 0
            ) {
                additionalPayeeAmount =
                    (projectFunds / 100) *
                    artblocksContract.projectIdToAdditionalPayeePercentage(
                        _projectId
                    );
                if (additionalPayeeAmount > 0) {
                    artblocksContract
                        .projectIdToAdditionalPayee(_projectId)
                        .transfer(additionalPayeeAmount);
                }
            }
            uint256 creatorFunds = projectFunds - additionalPayeeAmount;
            if (creatorFunds > 0) {
                artblocksContract.projectIdToArtistAddress(_projectId).transfer(
                        creatorFunds
                    );
            }
        }
    }

    /**
     * @notice Gets price of minting a token on project `_projectId` given
     * the project's AuctionParameters and current block timestamp.
     * @param _projectId Project ID to get price of token for.
     * @return current price of token in Wei
     */
    function getPrice(uint256 _projectId) private view returns (uint256) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        if (block.timestamp <= auctionParams.timestampStart) {
            // The auction has not yet started.
            return auctionParams.startPrice;
        }
        uint256 elapsedTimeMinutes = (block.timestamp -
            auctionParams.timestampStart) / 60;
        if (elapsedTimeMinutes < auctionParams.decayIntervalMinutes) {
            // Not a single decay interval has passed.
            return auctionParams.startPrice;
        }
        uint256 currentPrice = auctionParams.startPrice;
        uint256 elapsedDecayIntervals = elapsedTimeMinutes /
            auctionParams.decayIntervalMinutes;
        uint256 i = 0;
        for (i = 0; i < elapsedDecayIntervals; i++) {
            // Perform iterative exponential decay.
            currentPrice =
                currentPrice -
                (currentPrice / auctionParams.decayDenominator);
        }
        if (currentPrice < auctionParams.basePrice) {
            // Do not allow price to go lower than `basePrice`.
            return auctionParams.basePrice;
        }
        return currentPrice;
    }

    /**
     * @notice Returns if auction for project `_projectId` is live (i.e.
     * current timestamp is greater than starting timestamp and the derived
     * "calculated price" has not decayed beyond the base price).
     * @param _projectId Project ID to be checked.
     * @return true if auction is live, false otherwise
     */
    function isAuctionLive(uint256 _projectId) public view returns (bool) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        return (block.timestamp > auctionParams.timestampStart &&
            getPrice(_projectId) > auctionParams.basePrice);
    }

    /**
     * @notice Returns how often and by how much the price decays for project
     * `_projectId`.
     * @param _projectId Project ID to be checked.
     * @return decayDenominator the amount the price decays every decay interval
     * @return decayIntervalMinutes the frequency with which the price decays
     */
    function auctionDecayDetails(uint256 _projectId)
        external
        view
        returns (uint256 decayDenominator, uint256 decayIntervalMinutes)
    {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(isAuctionLive(_projectId), "auction is not currently live");
        decayDenominator = auctionParams.decayDenominator;
        decayIntervalMinutes = auctionParams.decayIntervalMinutes;
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
        tokenPriceInWei = getPrice(_projectId);
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
