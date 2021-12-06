// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../libs/0.8.x/IERC20.sol";

import "../interfaces/0.8.x/IGenArt721CoreContract.sol";
import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IFilteredMinter.sol";

pragma solidity 0.8.9;

contract GenArt721FilteredMinter is IFilteredMinter {
    IGenArt721CoreContract public artblocksContract;
    IMinterFilter public minterFilter;

    uint256 constant ONE_MILLION = 1_000_000;

    mapping(uint256 => bool) public contractMintable;
    mapping(uint256 => bool) public purchaseToDisabled;
    mapping(address => mapping(uint256 => uint256)) public projectMintCounter;
    mapping(uint256 => uint256) public projectMintLimit;
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    mapping(uint256 => uint256) public projectMaxInvocations;

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    constructor(address _genArt721Address, address _minterFilter) {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
    }

    function getYourBalanceOfProjectERC20(uint256 _projectId)
        external
        view
        returns (uint256 balance)
    {
        balance = IERC20(
            artblocksContract.projectIdToCurrencyAddress(_projectId)
        ).balanceOf(msg.sender);
        return balance;
    }

    function checkYourAllowanceOfProjectERC20(uint256 _projectId)
        external
        view
        returns (uint256 remaining)
    {
        remaining = IERC20(
            artblocksContract.projectIdToCurrencyAddress(_projectId)
        ).allowance(msg.sender, address(this));
        return remaining;
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

        // limit mints per address by project
        if (projectMintLimit[_projectId] > 0) {
            require(
                projectMintCounter[msg.sender][_projectId] <
                    projectMintLimit[_projectId],
                "Reached minting limit"
            );
            projectMintCounter[msg.sender][_projectId]++;
        }

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
                IERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                    .allowance(msg.sender, address(this)) >=
                    artblocksContract.projectIdToPricePerTokenInWei(_projectId),
                "Insufficient Funds Approved for TX"
            );
            require(
                IERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
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

    function _splitFundsETH(uint256 _projectId) internal {
        if (msg.value > 0) {
            uint256 pricePerTokenInWei = artblocksContract
                .projectIdToPricePerTokenInWei(_projectId);
            uint256 refund = msg.value - pricePerTokenInWei;
            if (refund > 0) {
                payable(msg.sender).transfer(refund);
            }
            uint256 foundationAmount = (pricePerTokenInWei / 100) *
                artblocksContract.artblocksPercentage();
            if (foundationAmount > 0) {
                artblocksContract.artblocksAddress().transfer(foundationAmount);
            }
            uint256 projectFunds = pricePerTokenInWei - foundationAmount;
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

    function _splitFundsERC20(uint256 _projectId) internal {
        uint256 pricePerTokenInWei = artblocksContract
            .projectIdToPricePerTokenInWei(_projectId);
        uint256 foundationAmount = (pricePerTokenInWei / 100) *
            artblocksContract.artblocksPercentage();
        if (foundationAmount > 0) {
            IERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                .transferFrom(
                    msg.sender,
                    artblocksContract.artblocksAddress(),
                    foundationAmount
                );
        }
        uint256 projectFunds = pricePerTokenInWei - foundationAmount;
        uint256 additionalPayeeAmount;
        if (
            artblocksContract.projectIdToAdditionalPayeePercentage(_projectId) >
            0
        ) {
            additionalPayeeAmount =
                (projectFunds / 100) *
                artblocksContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                );
            if (additionalPayeeAmount > 0) {
                IERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                    .transferFrom(
                        msg.sender,
                        artblocksContract.projectIdToAdditionalPayee(
                            _projectId
                        ),
                        additionalPayeeAmount
                    );
            }
        }
        uint256 creatorFunds = projectFunds - additionalPayeeAmount;
        if (creatorFunds > 0) {
            IERC20(artblocksContract.projectIdToCurrencyAddress(_projectId))
                .transferFrom(
                    msg.sender,
                    artblocksContract.projectIdToArtistAddress(_projectId),
                    creatorFunds
                );
        }
    }
}
