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
contract GenArt721FilteredMinterETHAuction is IFilteredMinter {
    /// Auction details updated for project `projectId`.
    event SetAuctionDetails(
        uint256 indexed projectId,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _auctionPriceStart,
        uint256 _auctionPriceEnd
    );

    /// Minimum allowed auction length updated
    event MinimumAuctionLengthSecondsUpdated(
        uint256 _minimumAuctionLengthSeconds
    );

    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContract public artblocksContract;
    /// Minter filter this minter may interact with.
    IMinterFilter public minterFilter;

    /// minterType for this minter
    string public constant minterType = "GenArt721FilteredMinterETHAuction";

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
    /// Minimum auction length in seconds
    uint256 public minimumAuctionLengthSeconds = 3600;

    /// projectId => auction parameters
    mapping(uint256 => AuctionParameters) public projectAuctionParameters;
    struct AuctionParameters {
        uint256 timestampStart;
        uint256 timestampEnd;
        uint256 priceStart;
        uint256 priceEnd;
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

    /**
     * @notice Sets minimum auction length to `_minimumAuctionLengthSeconds`
     * for all projects.
     * @param _minimumAuctionLengthSeconds Minimum auction length in seconds.
     */
    function setMinimumAuctionLengthSeconds(
        uint256 _minimumAuctionLengthSeconds
    ) external onlyCoreWhitelisted {
        minimumAuctionLengthSeconds = _minimumAuctionLengthSeconds;
        emit MinimumAuctionLengthSecondsUpdated(_minimumAuctionLengthSeconds);
    }

    ////// Auction Functions
    /**
     * @notice Sets auction details for project `_projectId`.
     * @param _projectId Project ID to set auction details for.
     * @param _auctionTimestampStart Timestamp at which to start the auction.
     * @param _auctionTimestampEnd Timestamp at which to end the auction.
     * @param _auctionPriceStart Price at which to start the auction, in Wei.
     * @param _auctionPriceEnd Resting price of the auction, in Wei.
     */
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _auctionPriceStart,
        uint256 _auctionPriceEnd
    ) external onlyCoreWhitelistedOrArtist(_projectId) {
        require(
            _auctionTimestampEnd > _auctionTimestampStart,
            "Auction end must be greater than auction start"
        );
        require(
            _auctionTimestampEnd >=
                _auctionTimestampStart + minimumAuctionLengthSeconds,
            "Auction length must be at least minimumAuctionLengthSeconds"
        );
        require(
            _auctionPriceStart >
                _auctionPriceEnd,
            "Auction start price must be greater than auction end price"
        );
        projectAuctionParameters[_projectId] = AuctionParameters(
            _auctionTimestampStart,
            _auctionTimestampEnd,
            _auctionPriceStart,
            _auctionPriceEnd
        );
        emit SetAuctionDetails(
            _projectId,
            _auctionTimestampStart,
            _auctionTimestampEnd,
            _auctionPriceStart,
            _auctionPriceEnd
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

        // if contract filter is off, allow calls from another contract
        if (!contractMintable[_projectId]) {
            require(msg.sender == tx.origin, "No Contract Buys");
        }

        // if purchaseTo is disabled, enforce purchase destination to be the TX
        // sending address.
        if (purchaseToDisabled[_projectId]) {
            require(msg.sender == _to, "No `purchaseTo` Allowed");
        }

        // project currency must be ETH
        require(
            keccak256(
                abi.encodePacked(
                    artblocksContract.projectIdToCurrencySymbol(_projectId)
                )
            ) == keccak256(abi.encodePacked("ETH")),
            "Project currency must be ETH"
        );

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
    function getPrice(uint256 _projectId) public view returns (uint256) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        if (block.timestamp <= auctionParams.timestampStart) {
            return auctionParams.priceStart;
        } else if (block.timestamp >= auctionParams.timestampEnd) {
            return auctionParams.priceEnd;
        }
        uint256 elapsedTime = block.timestamp - auctionParams.timestampStart;
        uint256 duration = auctionParams.timestampEnd -
            auctionParams.timestampStart;
        uint256 startToEndDiff = auctionParams.priceStart -
            auctionParams.priceEnd;
        return
            auctionParams.priceStart -
            ((elapsedTime * startToEndDiff) / duration);
    }

    /**
     * @notice Returns if auction for project `_projectId` is live (i.e.
     * current timestamp is between start and end timestamp).
     * @param _projectId Project ID to be checked.
     * @return true if auction is live, false otherwise
     */
    function isAuctionLive(uint256 _projectId) public view returns (bool) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        return (block.timestamp < auctionParams.timestampEnd &&
            block.timestamp > auctionParams.timestampStart);
    }

    /**
     * @notice Returns time remaining until end of auction for project
     * `_projectId`.
     * @param _projectId Project ID to be checked.
     * @return seconds remaining until end of auction
     */
    function auctionTimeRemaining(uint256 _projectId)
        external
        view
        returns (uint256)
    {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(isAuctionLive(_projectId), "auction is not currently live");
        return auctionParams.timestampEnd - block.timestamp;
    }
}
