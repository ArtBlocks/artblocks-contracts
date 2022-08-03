// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "../../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../../interfaces/0.8.x/IFilteredMinterV0.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.9;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * This is designed to be used with IGenArt721CoreContractV3 contracts.
 * @author Art Blocks Inc.
 */
contract MinterSetPriceV2 is ReentrancyGuard, IFilteredMinterV0 {
    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// This contract handles cores with interface IV3
    IGenArt721CoreContractV3 private immutable genArtCoreContract;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceV2";

    uint256 constant ONE_MILLION = 1_000_000;

    /// projectId => has project reached its maximum number of invocations?
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    /// projectId => project's maximum number of invocations
    mapping(uint256 => uint256) public projectMaxInvocations;
    /// projectId => price per token in wei - supersedes any defined core price
    mapping(uint256 => uint256) private projectIdToPricePerTokenInWei;
    /// projectId => price per token has been configured on this minter
    mapping(uint256 => bool) private projectIdToPriceIsConfigured;

    // modifier to restrict access to only AdminACL allowed calls
    // @dev defers which ACL contract is used to the core contract
    modifier onlyCoreAdminACL(bytes4 _selector) {
        require(
            genArtCoreContract.adminACLAllowed(
                msg.sender,
                address(this),
                _selector
            ),
            "Only Core AdminACL allowed"
        );
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            msg.sender ==
                genArtCoreContract.projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
        _;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for whichccthis will a
     * filtered minter.
     */
    constructor(address _genArt721Address, address _minterFilter)
        ReentrancyGuard()
    {
        genArt721CoreAddress = _genArt721Address;
        genArtCoreContract = IGenArt721CoreContractV3(_genArt721Address);
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice Sets the maximum invocations of project `_projectId` based
     * on the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev also checks and may refresh projectMaxHasBeenInvoked for project
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function setProjectMaxInvocations(uint256 _projectId)
        external
        onlyCoreAdminACL(this.setProjectMaxInvocations.selector)
    {
        uint256 invocations;
        uint256 maxInvocations;
        (invocations, maxInvocations, , , ) = genArtCoreContract
            .projectStateData(_projectId);
        // update storage with results
        projectMaxInvocations[_projectId] = maxInvocations;
        if (invocations < maxInvocations) {
            projectMaxHasBeenInvoked[_projectId] = false;
        }
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 _projectId)
        external
        view
        onlyArtist(_projectId)
    {
        revert("Action not supported");
    }

    /**
     * @notice Updates this minter's price per token of project `_projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * This price supersedes any legacy core contract price per token value.
     */
    function updatePricePerTokenInWei(
        uint256 _projectId,
        uint256 _pricePerTokenInWei
    ) external onlyArtist(_projectId) {
        projectIdToPricePerTokenInWei[_projectId] = _pricePerTokenInWei;
        projectIdToPriceIsConfigured[_projectId] = true;
        emit PricePerTokenInWeiUpdated(_projectId, _pricePerTokenInWei);
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
        nonReentrant
        returns (uint256 tokenId)
    {
        // CHECKS
        require(
            !projectMaxHasBeenInvoked[_projectId],
            "Maximum number of invocations reached"
        );

        // require artist to have configured price of token on this minter
        require(
            projectIdToPriceIsConfigured[_projectId],
            "Price not configured"
        );

        require(
            msg.value >= projectIdToPricePerTokenInWei[_projectId],
            "Must send minimum value to mint!"
        );

        // EFFECTS
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

        // INTERACTIONS
        _splitFundsETH(_projectId);

        return tokenId;
    }

    /**
     * @dev splits ETH funds between sender (if refund), foundation,
     * artist, and artist's additional payee for a token purchased on
     * project `_projectId`.
     */
    function _splitFundsETH(uint256 _projectId) internal {
        if (msg.value > 0) {
            bool success_;
            // send refund to sender
            uint256 pricePerTokenInWei = projectIdToPricePerTokenInWei[
                _projectId
            ];
            uint256 refund = msg.value - pricePerTokenInWei;
            if (refund > 0) {
                (success_, ) = msg.sender.call{value: refund}("");
                require(success_, "Refund failed");
            }
            // split remaining funds between foundation, artist, and artist's
            // additional payee
            (
                address payable[] memory recipients_,
                uint256[] memory revenues_
            ) = genArtCoreContract.getPrimaryRevenueSplits(
                    _projectId,
                    pricePerTokenInWei
                );
            // artist payment
            if (revenues_[0] > 0) {
                (success_, ) = recipients_[0].call{value: revenues_[0]}("");
                require(success_, "Artist payment failed");
            }
            // additional payee payment
            if (revenues_[1] > 0) {
                (success_, ) = recipients_[1].call{value: revenues_[1]}("");
                require(success_, "Additional Payee payment failed");
            }
            // Art Blocks payment
            if (revenues_[2] > 0) {
                (success_, ) = recipients_[2].call{value: revenues_[2]}("");
                require(success_, "Art Blocks payment failed");
            }
        }
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
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
        isConfigured = projectIdToPriceIsConfigured[_projectId];
        tokenPriceInWei = projectIdToPricePerTokenInWei[_projectId];
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
