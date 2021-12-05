// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../libs/0.5.x/SafeMath.sol";

import "../interfaces/0.5.x/IGenArt721CoreContract.sol";
import "../interfaces/0.5.x/IMinterFilter.sol";
import "../interfaces/0.5.x/IFilteredMinter.sol";

pragma solidity ^0.5.0;

contract GenArt721FilteredMinterETHAuction is IFilteredMinter {
    event SetAuctionDetails(
        uint256 indexed projectId,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _auctionPriceStart
    );

    using SafeMath for uint256;

    IGenArt721CoreContract public artblocksContract;
    IMinterFilter public minterFilter;

    uint256 constant ONE_MILLION = 1_000_000;

    mapping(uint256 => bool) public contractMintable;
    mapping(uint256 => bool) public purchaseToDisabled;
    mapping(address => mapping(uint256 => uint256)) public projectMintCounter;
    mapping(uint256 => uint256) public projectMintLimit;
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    mapping(uint256 => uint256) public projectMaxInvocations;
    uint256 public minimumAuctionLengthSeconds = 3600;

    // Auction variables
    mapping(uint256 => AuctionParameters) public projectAuctionParameters;
    struct AuctionParameters {
        uint256 timestampStart;
        uint256 timestampEnd;
        uint256 priceStart;
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

    constructor(address _genArt721Address, address _minterFilter) public {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
    }

    function setProjectMintLimit(uint256 _projectId, uint8 _limit)
        external
        onlyCoreWhitelisted
    {
        projectMintLimit[_projectId] = _limit;
    }

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

    function toggleContractMintable(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        contractMintable[_projectId] = !contractMintable[_projectId];
    }

    function togglePurchaseToDisabled(uint256 _projectId)
        external
        onlyCoreWhitelisted
    {
        purchaseToDisabled[_projectId] = !purchaseToDisabled[_projectId];
    }

    function setMinimumAuctionLengthSeconds(
        uint256 _minimumAuctionLengthSeconds
    ) external onlyCoreWhitelisted {
        minimumAuctionLengthSeconds = _minimumAuctionLengthSeconds;
    }

    ////// Auction Functions
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _auctionPriceStart
    ) external onlyCoreWhitelistedOrArtist(_projectId) {
        require(
            _auctionTimestampEnd > _auctionTimestampStart,
            "Auction end must be greater than auction start"
        );
        require(
            _auctionTimestampEnd >=
                _auctionTimestampStart.add(minimumAuctionLengthSeconds),
            "Auction length must be at least minimumAuctionLengthSeconds"
        );
        require(
            _auctionPriceStart >
                artblocksContract.projectIdToPricePerTokenInWei(_projectId),
            "Auction start price must be greater than auction end price"
        );
        projectAuctionParameters[_projectId] = AuctionParameters(
            _auctionTimestampStart,
            _auctionTimestampEnd,
            _auctionPriceStart
        );
        emit SetAuctionDetails(
            _projectId,
            _auctionTimestampStart,
            _auctionTimestampEnd,
            _auctionPriceStart
        );
    }

    function purchase(uint256 _projectId)
        external
        payable
        returns (uint256 tokenId)
    {
        tokenId = purchaseTo(msg.sender, _projectId);
        return tokenId;
    }

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
        // What if this overflows, since default value of uint256 is 0?
        // that is intended, so that by default the minter allows infinite transactions,
        // allowing the artblocks contract to stop minting
        // uint256 tokenInvocation = tokenId % ONE_MILLION;
        if (tokenId % ONE_MILLION == projectMaxInvocations[_projectId] - 1) {
            projectMaxHasBeenInvoked[_projectId] = true;
        }
        return tokenId;
    }

    function _splitFundsETHAuction(
        uint256 _projectId,
        uint256 _currentPriceInWei
    ) internal {
        if (msg.value > 0) {
            uint256 refund = msg.value.sub(_currentPriceInWei);
            if (refund > 0) {
                msg.sender.transfer(refund);
            }
            uint256 foundationAmount = _currentPriceInWei.div(100).mul(
                artblocksContract.artblocksPercentage()
            );
            if (foundationAmount > 0) {
                artblocksContract.artblocksAddress().transfer(foundationAmount);
            }
            uint256 projectFunds = _currentPriceInWei.sub(foundationAmount);
            uint256 additionalPayeeAmount;
            if (
                artblocksContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                ) > 0
            ) {
                additionalPayeeAmount = projectFunds.div(100).mul(
                    artblocksContract.projectIdToAdditionalPayeePercentage(
                        _projectId
                    )
                );
                if (additionalPayeeAmount > 0) {
                    artblocksContract
                        .projectIdToAdditionalPayee(_projectId)
                        .transfer(additionalPayeeAmount);
                }
            }
            uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
            if (creatorFunds > 0) {
                artblocksContract.projectIdToArtistAddress(_projectId).transfer(
                        creatorFunds
                    );
            }
        }
    }

    function getPrice(uint256 _projectId) public view returns (uint256) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        if (block.timestamp <= auctionParams.timestampStart) {
            return auctionParams.priceStart;
        } else if (block.timestamp >= auctionParams.timestampEnd) {
            return artblocksContract.projectIdToPricePerTokenInWei(_projectId);
        }
        uint256 elapsedTime = block.timestamp.sub(auctionParams.timestampStart);
        uint256 duration = auctionParams.timestampEnd.sub(
            auctionParams.timestampStart
        );
        uint256 startToEndDiff = auctionParams.priceStart.sub(
            artblocksContract.projectIdToPricePerTokenInWei(_projectId)
        );
        return
            auctionParams.priceStart.sub(
                elapsedTime.mul(startToEndDiff).div(duration)
            );
    }

    function isAuctionLive(uint256 _projectId) public view returns (bool) {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        return (block.timestamp < auctionParams.timestampEnd &&
            block.timestamp > auctionParams.timestampStart);
    }

    function auctionTimeRemaining(uint256 _projectId)
        external
        view
        returns (uint256)
    {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(isAuctionLive(_projectId), "auction is not currently live");
        return auctionParams.timestampEnd.sub(block.timestamp);
    }
}
