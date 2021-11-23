import "./libs/SafeMath.sol";
import "./libs/Strings.sol";

import "./interfaces/IGenArt721CoreContract.sol";
import "./interfaces/IMinterFilter.sol";

pragma solidity ^0.5.0;

interface ERC20 {
    function balanceOf(address _owner) external view returns (uint256 balance);

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external returns (bool success);

    function allowance(address _owner, address _spender)
        external
        view
        returns (uint256 remaining);
}

contract GenArt721FilteredMinter {
    using SafeMath for uint256;

    IGenArt721CoreContract public artblocksContract;
    IMinterFilter public minterFilter;

    uint256 constant ONE_MILLION = 1_000_000;

    mapping(uint256 => bool) public contractMintable;
    mapping(address => mapping(uint256 => uint256)) public projectMintCounter;
    mapping(uint256 => uint256) public projectMintLimit;
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    mapping(uint256 => uint256) public projectMaxInvocations;

    constructor(address _genArt721Address, address _minterFilter) public {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
    }

    function getYourBalanceOfProjectERC20(uint256 _projectId)
        public
        view
        returns (uint256)
    {
        uint256 balance = ERC20(
            artblocksContract.projectIdToCurrencyAddress(_projectId)
        ).balanceOf(msg.sender);
        return balance;
    }

    function checkYourAllowanceOfProjectERC20(uint256 _projectId)
        public
        view
        returns (uint256)
    {
        uint256 remaining = ERC20(
            artblocksContract.projectIdToCurrencyAddress(_projectId)
        ).allowance(msg.sender, address(this));
        return remaining;
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

    function purchase(uint256 _projectId)
        public
        payable
        returns (uint256 _tokenId)
    {
        return purchaseTo(msg.sender, _projectId);
    }

    // removed public and payable
    function purchaseTo(address _to, uint256 _projectId)
        private
        returns (uint256 _tokenId)
    {
        require(
            !projectMaxHasBeenInvoked[_projectId],
            "Maximum number of invocations reached"
        );
        if (
            keccak256(
                abi.encodePacked(
                    artblocksContract.projectIdToCurrencySymbol(_projectId)
                )
            ) != keccak256(abi.encodePacked("ETH"))
        ) {
            require(
                msg.value == 0,
                "this project accepts a different currency and cannot accept ETH"
            );
            require(
                ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                    .allowance(msg.sender, address(this)) >=
                    artblocksContract.projectIdToPricePerTokenInWei(_projectId),
                "Insufficient Funds Approved for TX"
            );
            require(
                ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                    .balanceOf(msg.sender) >=
                    artblocksContract.projectIdToPricePerTokenInWei(_projectId),
                "Insufficient balance."
            );
            _splitFundsERC20(_projectId);
        } else {
            require(
                msg.value >=
                    artblocksContract.projectIdToPricePerTokenInWei(_projectId),
                "Must send minimum value to mint!"
            );
            _splitFundsETH(_projectId);
        }

        // if contract filter is off, allow calls from another contract
        if (contractMintable[_projectId]) {
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

    function _splitFundsETH(uint256 _projectId) internal {
        if (msg.value > 0) {
            uint256 pricePerTokenInWei = artblocksContract
                .projectIdToPricePerTokenInWei(_projectId);
            uint256 refund = msg.value.sub(
                artblocksContract.projectIdToPricePerTokenInWei(_projectId)
            );
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

    function _splitFundsERC20(uint256 _projectId) internal {
        uint256 pricePerTokenInWei = artblocksContract
            .projectIdToPricePerTokenInWei(_projectId);
        uint256 foundationAmount = pricePerTokenInWei.div(100).mul(
            artblocksContract.artblocksPercentage()
        );
        if (foundationAmount > 0) {
            ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                .transferFrom(
                    msg.sender,
                    artblocksContract.artblocksAddress(),
                    foundationAmount
                );
        }
        uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);
        uint256 additionalPayeeAmount;
        if (
            artblocksContract.projectIdToAdditionalPayeePercentage(_projectId) >
            0
        ) {
            additionalPayeeAmount = projectFunds.div(100).mul(
                artblocksContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                )
            );
            if (additionalPayeeAmount > 0) {
                ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                    .transferFrom(
                        msg.sender,
                        artblocksContract.projectIdToAdditionalPayee(
                            _projectId
                        ),
                        additionalPayeeAmount
                    );
            }
        }
        uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
        if (creatorFunds > 0) {
            ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                .transferFrom(
                    msg.sender,
                    artblocksContract.projectIdToArtistAddress(_projectId),
                    creatorFunds
                );
        }
    }
}
