// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {DALib} from "./DALib.sol";

/**
 * @title Art Blocks Dutch Auction (exponential price curve) Library
 * @notice This library is designed to implement logic and checks for Art
 * Blocks projects using an exponential Dutch auctionprice curve for minting
 * tokens.
 * @author Art Blocks Inc.
 */

library DAExpLib {
    /**
     * @notice Auction details set for project `projectId` on core contract
     * `coreContract`.
     * @param projectId Project Id for which auction details were set
     * @param coreContract Core contract address for which auction details were
     * set
     * @param auctionTimestampStart Timestamp when auction will start
     * @param priceDecayHalfLifeSeconds Half life of price decay, in seconds
     * @param startPrice Start price of auction
     * @param basePrice Base price of auction (end price)
     */
    event SetAuctionDetailsExp(
        uint256 indexed projectId,
        address indexed coreContract,
        uint40 auctionTimestampStart,
        uint40 priceDecayHalfLifeSeconds,
        uint256 startPrice,
        uint256 basePrice
    );

    /**
     * @notice Minimum allowed price decay half life on the minter updated to
     * `minimumPriceDecayHalfLifeSeconds`.
     * @param minimumPriceDecayHalfLifeSeconds minimum price decay half life
     * for new auctions, in seconds
     */
    event AuctionMinHalfLifeSecondsUpdated(
        uint256 minimumPriceDecayHalfLifeSeconds
    );

    // position of DA Exp Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant DAE_EXP_LIB_STORAGE_POSITION =
        keccak256("daexplib.storage");

    struct DAProjectConfig {
        // @dev max uint40 ~= 1.1e12 sec ~= 34 thousand years
        uint40 timestampStart;
        uint40 priceDecayHalfLifeSeconds;
        // @dev max uint88 ~= 3e26 Wei = ~300 million ETH, which is well above
        // the expected prices of any NFT mint in the foreseeable future.
        uint88 startPrice;
        uint88 basePrice;
    }

    // Diamond storage pattern is used in this library
    struct DAExpLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => DAProjectConfig)) DAProjectConfigs_;
    }

    /**
     * @notice Sets auction details for an exponential-price auction type.
     * @dev The function sets the auction start timestamp, price decay
     * half-life, starting, and base prices for an exponential-price auction.
     * @dev Minter implementations should ensure that any additional guard-
     * rails are properly checked outside of this function. For example, the
     * minter should check that _priceDecayHalfLifeSeconds is greater than the
     * minter's minimum allowable value for price decay half-life (if the
     * minter chooses to include that guard-rail).
     * @param projectId The project Id to set auction details for.
     * @param coreContract The core contract address to set auction details.
     * @param auctionTimestampStart The timestamp when the auction will start.
     * @param priceDecayHalfLifeSeconds The half-life time for price decay in
     * seconds.
     * @param startPrice The starting price of the auction.
     * @param basePrice The base price of the auction.
     * @param allowReconfigureAfterStart Bool indicating whether the auction
     * can be reconfigured after it has started. This is sometimes useful for
     * minter implementations that want to allow an artist to reconfigure the
     * auction after it has reached minter-local max invocations, for example.
     */
    function setAuctionDetailsExp(
        uint256 projectId,
        address coreContract,
        uint40 auctionTimestampStart,
        uint40 priceDecayHalfLifeSeconds,
        uint88 startPrice,
        uint88 basePrice,
        bool allowReconfigureAfterStart
    ) internal {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        require(
            DAProjectConfig_.timestampStart == 0 || // uninitialized
                block.timestamp < DAProjectConfig_.timestampStart || // auction not yet started
                allowReconfigureAfterStart, // specifically allowing reconfiguration after start
            "No modifications mid-auction"
        );
        require(
            block.timestamp < auctionTimestampStart,
            "Only future auctions"
        );
        require(
            startPrice > basePrice,
            "Auction start price must be greater than auction end price"
        );
        // @dev no coverage, as minter auction min half life may be more
        // restrictive than gt 0
        require(priceDecayHalfLifeSeconds > 0, "Only half life gt 0");

        // EFFECTS
        DAProjectConfig_.timestampStart = auctionTimestampStart;
        DAProjectConfig_.priceDecayHalfLifeSeconds = priceDecayHalfLifeSeconds;
        DAProjectConfig_.startPrice = startPrice;
        DAProjectConfig_.basePrice = basePrice;

        emit SetAuctionDetailsExp({
            projectId: projectId,
            coreContract: coreContract,
            auctionTimestampStart: auctionTimestampStart,
            priceDecayHalfLifeSeconds: priceDecayHalfLifeSeconds,
            startPrice: startPrice,
            basePrice: basePrice
        });
    }

    function resetAuctionDetails(
        uint256 projectId,
        address coreContract
    ) internal {
        // @dev all fields must be deleted, and none of them are a complex type
        // @dev getDAProjectConfig not used, as deletion of storage pointers is
        // not supported
        delete s().DAProjectConfigs_[coreContract][projectId];

        emit DALib.ResetAuctionDetails({
            projectId: projectId,
            coreContract: coreContract
        });
    }

    /**
     * @notice Gets price of minting a token given the project's
     * DAProjectConfig.
     * This function reverts if auction has not yet started, or if auction is
     * unconfigured, which is relied upon by certain minter implications for
     * security.
     * @param projectId Project Id to get price for
     * @param coreContract Core contract address to get price for
     * @return uint256 current price of token in Wei
     */
    function getPriceExp(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        DAProjectConfig storage DAProjectConfig_ = getDAProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // move parameters to memory if used more than once
        uint256 timestampStart = DAProjectConfig_.timestampStart;
        uint256 priceDecayHalfLifeSeconds = DAProjectConfig_
            .priceDecayHalfLifeSeconds;
        // @dev check also ensures we don't divide by priceDecayHalfLifeSeconds
        // of zero
        require(priceDecayHalfLifeSeconds > 0, "Only configured auctions");
        require(block.timestamp >= timestampStart, "Auction not yet started");
        uint256 decayedPrice = DAProjectConfig_.startPrice;
        uint256 elapsedTimeSeconds;
        unchecked {
            // already checked that block.timestamp > _timestampStart above
            elapsedTimeSeconds = block.timestamp - timestampStart;
        }
        // Divide by two (via bit-shifting) for the number of entirely completed
        // half-lives that have elapsed since auction start time.
        unchecked {
            // already required priceDecayHalfLifeSeconds > 0
            decayedPrice >>= elapsedTimeSeconds / priceDecayHalfLifeSeconds;
        }
        // Perform a linear interpolation between partial half-life points, to
        // approximate the current place on a perfect exponential decay curve.
        unchecked {
            // value of expression is provably always less than decayedPrice,
            // so no underflow is possible when the subtraction assignment
            // operator is used on decayedPrice.
            decayedPrice -=
                ((decayedPrice *
                    (elapsedTimeSeconds % priceDecayHalfLifeSeconds)) /
                    priceDecayHalfLifeSeconds) >>
                1; // divide by 2 via bitshift 1
        }
        uint256 basePrice = DAProjectConfig_.basePrice;
        if (decayedPrice < basePrice) {
            // Price may not decay below stay `basePrice`.
            return basePrice;
        }
        return decayedPrice;
    }

    /**
     * Gets auction base price for project `projectId` on core contract
     * `coreContract`.
     * @param projectId Project Id to get price for
     * @param coreContract Core contract address to get price for
     */
    function getAuctionBasePrice(
        uint256 projectId,
        address coreContract
    ) internal view returns (uint256) {
        return
            getDAProjectConfig({
                projectId: projectId,
                coreContract: coreContract
            }).basePrice;
    }

    /**
     * Loads the DAProjectConfig for a given project and core contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getDAProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (DAProjectConfig storage) {
        return s().DAProjectConfigs_[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The DAExpLibStorage struct.
     */
    function s() internal pure returns (DAExpLibStorage storage storageStruct) {
        bytes32 position = DAE_EXP_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
