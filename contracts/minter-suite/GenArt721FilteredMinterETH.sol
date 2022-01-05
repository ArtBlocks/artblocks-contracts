// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../interfaces/0.8.x/IGenArt721CoreContract.sol";
import "../interfaces/0.8.x/IMinterFilter.sol";
import "../interfaces/0.8.x/IFilteredMinter.sol";

pragma solidity 0.8.9;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * @author Art Blocks Inc.
 */
contract GenArt721FilteredMinterETH is IFilteredMinter {
    /// Art Blocks core contract this minter may interact with.
    IGenArt721CoreContract public artblocksContract;
    /// Minter filter contract this minter may interact with.
    IMinterFilter public minterFilter;

    uint256 constant ONE_MILLION = 1_000_000;

    /// projectId => are contracts allowed to mint?
    mapping(uint256 => bool) public contractMintable;
    /// projectId => are tokens allowed to be minted to other addresses?
    mapping(uint256 => bool) public purchaseToDisabled;
    /// purchaser address => projectId => number of mints purchased
    mapping(address => mapping(uint256 => uint256)) public projectMintCounter;
    /// projectId => maximum number of mints a single address may invoke
    mapping(uint256 => uint256) public projectMintLimit;
    /// projectId => has project reached its maximum number of invocations?
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    /// projectId => project's maximum number of invocations
    mapping(uint256 => uint256) public projectMaxInvocations;

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for 
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter contract address for which
     * this will a filtered minter.
     */
    constructor(address _genArt721Address, address _minterFilter) {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        minterFilter = IMinterFilter(_minterFilter);
    }

    /**
     * @notice Sets the mint limit of project `_projectId` to `_limit`.
     * @param _projectId Project ID to set the mint limit for.
     * @param _limit Number of times a single address may mint the
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
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Mint a token from this Project ID.
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
     * the token's owner as `_to`.
     * @param _projectId Mint a token from this Project ID.
     * @param _to Address to be the newly minted token's owner.
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

        require(
            msg.value >=
                artblocksContract.projectIdToPricePerTokenInWei(_projectId),
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

        _splitFundsETH(_projectId);

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
     * @notice Splits ETH funds between sender (if refund), foundation,
     * artist, and artist's additional payee for a token purchased on 
     * project `_projectId`.
     * @dev utilizes transfer() to send ETH, which may fail if any access 
     * lists are not properly populated when purchasing tokens.
     * @param _projectId Project ID for which funds shall be split.
     */
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
}
