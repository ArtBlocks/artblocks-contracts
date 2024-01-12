// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {ABHelpers} from "../ABHelpers.sol";
import {SplitFundsLib} from "./SplitFundsLib.sol";
import {MaxInvocationsLib} from "./MaxInvocationsLib.sol";
import {MinHeapLib} from "../MinHeapLib.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";
import {SafeCast} from "@openzeppelin-5.0/contracts/utils/math/SafeCast.sol";

/**
 * @title Art Blocks RAM Minter Library
 * @notice This library is designed for the Art Blocks platform. It includes
 * Structs and functions that help with ranked auction minters.
 * @author Art Blocks Inc.
 */

library RAMLib {
    using SafeCast for uint256;
    using MinHeapLib for MinHeapLib.MinHeap;

    /**
     * @notice Admin-controlled refund gas limit updated
     * @param refundGasLimit Gas limit to use when refunding the previous
     * highest bidder, prior to using fallback force-send to refund
     */
    event MinterRefundGasLimitUpdated(uint24 refundGasLimit);

    // position of RAM Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant RAM_LIB_STORAGE_POSITION = keccak256("ramlib.storage");

    // project-specific parameters
    struct RAMProjectConfig {
        // min heap to track bids
        MinHeapLib.MinHeap minHeap;
        // mapping of bid id to bid
        // @dev TODO could be moved outside of project config if deconflicted, and if useful?
        // @dev TODO - probably make this deterministic and queriable for niave lookup of wallet's bids
        mapping(bytes32 id => Bid bid) bids;
        // --- auction parameters ---
        // @dev max uint24 is 16,777,215 > 1_000_000 max project size
        uint24 maxActiveBids;
        // TODO start time, end time, min bid, bid spacing, etc.
        // --- auction state ---
        // track number of bids settled to determine if all bids have been settled
        uint24 numBidsSettled;
        bool allWinningBidsSettled; // default false
    }

    struct Bid {
        uint256 amount;
        address bidder;
        bool isSettled; // TODO: could remove this if amount is changed when settling
        bool isMinted; // TODO: determine if this is needed
    }

    // Diamond storage pattern is used in this library
    struct RAMLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => RAMProjectConfig)) RAMProjectConfigs;
    }

    function getMinBid(
        uint256 projectId,
        address coreContract
    ) internal view returns (Bid storage minBid) {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // get the minimum bid ID
        bytes32 minBidId = RAMProjectConfig_.minHeap.peek().id;
        // get the bid
        minBid = RAMProjectConfig_.bids[minBidId];
    }

    // TODO must limit to only active auctions, etc.
    function placeBid(
        uint256 projectId,
        address coreContract,
        uint256 bidValue,
        address bidder,
        uint24 bidderProjectNonce,
        uint256 minBidPercentIncrease,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // determine if have reached max bids
        bool reachedMaxBids = RAMProjectConfig_.minHeap.numElements() ==
            RAMProjectConfig_.maxActiveBids;
        if (reachedMaxBids) {
            // remove + refund the minimum Bid
            MinHeapLib.Node memory removedMinBid = RAMProjectConfig_
                .minHeap
                .removeMin();
            SplitFundsLib.forceSafeTransferETH({
                to: RAMProjectConfig_.bids[removedMinBid.id].bidder,
                amount: removedMinBid.value,
                minterRefundGasLimit: minterRefundGasLimit
            });
            // require new bid value is greater than removed minimum bid
            // @dev overflow checked automatically in Solidity 0.8
            require(
                bidValue > (removedMinBid.value * 100) / minBidPercentIncrease,
                "Insufficient bid value"
            );
        }
        // insert the new Bid
        bytes32 bidId = bidIdFromInputs({
            coreContract: coreContract,
            projectId: projectId,
            bidder: bidder,
            bidderProjectNonce: bidderProjectNonce
        });
        RAMProjectConfig_.minHeap.insert(
            MinHeapLib.Node({value: bidValue, id: bidId})
        );
    }

    function bidIdFromInputs(
        address coreContract,
        uint256 projectId,
        address bidder,
        uint24 bidderProjectNonce
    ) internal pure returns (bytes32 id) {
        return
            keccak256(
                abi.encodePacked(
                    coreContract,
                    projectId,
                    bidder,
                    bidderProjectNonce
                )
            );
    }

    /**
     * Loads the RAMProjectConfig for a given project and core
     * contract.
     * @param projectId Project Id to get config for
     * @param coreContract Core contract address to get config for
     */
    function getRAMProjectConfig(
        uint256 projectId,
        address coreContract
    ) internal view returns (RAMProjectConfig storage) {
        return s().RAMProjectConfigs[coreContract][projectId];
    }

    /**
     * @notice Return the storage struct for reading and writing. This library
     * uses a diamond storage pattern when managing storage.
     * @return storageStruct The SEALibStorage struct.
     */
    function s() internal pure returns (RAMLibStorage storage storageStruct) {
        bytes32 position = RAM_LIB_STORAGE_POSITION;
        assembly ("memory-safe") {
            storageStruct.slot := position
        }
    }
}
