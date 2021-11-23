import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

import "./interfaces/IGenArt721CoreContract.sol";
import "./interfaces/IMinterFilter.sol";

pragma solidity ^0.5.0;

contract GenArt721FilteredMinterETHAuction {
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

    constructor(address _genArt721Address, address _minterFilter) public {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
    }

    function setProjectMintLimit(uint256 _projectId, uint8 _limit) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        projectMintLimit[_projectId] = _limit;
    }

    function setProjectMaxInvocations(uint256 _projectId) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        uint256 maxInvocations;
        uint256 invocations;
        (, , invocations, maxInvocations, , , , , ) = artblocksContract
            .projectTokenInfo(_projectId);
        projectMaxInvocations[_projectId] = maxInvocations;
        if (invocations < maxInvocations) {
            projectMaxHasBeenInvoked[_projectId] = false;
        }
    }

    function toggleContractMintable(uint256 _projectId) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        contractMintable[_projectId] = !contractMintable[_projectId];
    }

    function setMinimumAuctionLengthSeconds(
        uint256 _minimumAuctionLengthSeconds
    ) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        minimumAuctionLengthSeconds = _minimumAuctionLengthSeconds;
    }

    ////// Auction Functions
    function setAuctionDetails(
        uint256 _projectId,
        uint256 _auctionTimestampStart,
        uint256 _auctionTimestampEnd,
        uint256 _auctionPriceStart
    ) public {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "can only be set by admin"
        );
        require(
            _auctionTimestampEnd > _auctionTimestampStart,
            "Auction end must be greater than auction start"
        );
        require(
            _auctionTimestampEnd >
                _auctionTimestampStart + minimumAuctionLengthSeconds,
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
        public
        payable
        returns (uint256 _tokenId)
    {
        return purchaseTo(msg.sender, _projectId);
    }

    //remove public and payable to prevent public use of purchaseTo function
    function purchaseTo(address _to, uint256 _projectId)
        private
        returns (uint256 _tokenId)
    {
        require(
            !projectMaxHasBeenInvoked[_projectId],
            "Maximum number of invocations reached"
        );
        require(
            msg.value >= getPrice(_projectId),
            "Must send minimum value to mint!"
        );

        // if contract filter is off, allow calls from another contract
        if (!contractMintable[_projectId]) {
            require(msg.sender == tx.origin, "No Contract Buys");
        }

        // limit mints per address by project
        if (projectMintLimit[_projectId] > 0) {
            require(
                projectMintCounter[msg.sender][_projectId] <
                    projectMintLimit[_projectId],
                "Reached minting limit"
            );
            projectMintCounter[msg.sender][_projectId]++;
        }
        _splitFundsETHAuction(_projectId);

        uint256 tokenId = minterFilter.mint(_to, _projectId, msg.sender);
        // What if this overflows, since default value of uint256 is 0?
        // that is intended, so that by default the minter allows infinite transactions,
        // allowing the artblocks contract to stop minting
        // uint256 tokenInvocation = tokenId % ONE_MILLION;
        if (tokenId % ONE_MILLION == projectMaxInvocations[_projectId] - 1) {
            projectMaxHasBeenInvoked[_projectId] = true;
        }
        return tokenId;
    }

    function _splitFundsETHAuction(uint256 _projectId) internal {
        if (msg.value > 0) {
            uint256 pricePerTokenInWei = getPrice(_projectId);
            uint256 refund = msg.value.sub(pricePerTokenInWei);
            if (refund > 0) {
                msg.sender.transfer(refund);
            }
            uint256 foundationAmount = pricePerTokenInWei.div(100).mul(
                artblocksContract.artblocksPercentage()
            );
            if (foundationAmount > 0) {
                artblocksContract.artblocksAddress().transfer(foundationAmount);
            }
            uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);
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
        if (getCurrentTime() < auctionParams.timestampStart) {
            return auctionParams.priceStart;
        } else if (getCurrentTime() > auctionParams.timestampEnd) {
            return artblocksContract.projectIdToPricePerTokenInWei(_projectId);
        }
        uint256 elapsedTime = getCurrentTime().sub(
            auctionParams.timestampStart
        );
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
        return (getCurrentTime() < auctionParams.timestampEnd &&
            getCurrentTime() > auctionParams.timestampStart);
    }

    function auctionTimeRemaining(uint256 _projectId)
        public
        view
        returns (uint256)
    {
        AuctionParameters memory auctionParams = projectAuctionParameters[
            _projectId
        ];
        require(isAuctionLive(_projectId), "auction is not currently live");
        return auctionParams.timestampEnd.sub(getCurrentTime());
    }

    function getCurrentTime() internal view returns (uint256) {
        return block.timestamp;
    }
}
