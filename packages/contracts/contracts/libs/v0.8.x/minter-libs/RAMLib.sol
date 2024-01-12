// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {IMinterFilterV1} from "../../../interfaces/v0.8.x/IMinterFilterV1.sol";

import {BitMaps256} from "../BitMap.sol";
import {ABHelpers} from "../ABHelpers.sol";
import {SplitFundsLib} from "./SplitFundsLib.sol";
import {MaxInvocationsLib} from "./MaxInvocationsLib.sol";

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
    using BitMaps256 for uint256;

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
        // array of bids for each slot
        mapping(uint256 slot => Bid[] bids) bidsBySlot;
        // --- slot metadata for efficiency ---
        // bitmap with index set only if one or more active bids exist for the corresponding slot
        uint256 slotsBitmap;
        // minimum bitmap index with an active bid
        uint8 minBidIndex;
        // maximum bitmap index with an unminted bid
        // TODO - this could be populated when finishing auction via function input, bitshifting to verify...
        uint8 maxUnmintedBidSlotIndex;
        // TODO - determine if this should be updated on insertion/removal, or initialized when finishing auction
        uint24 maxUnmintedBidArrayIndex;
        // --- auction parameters ---
        // @dev max uint24 is 16,777,215 > 1_000_000 max project size
        uint24 maxActiveBids;
        uint24 numActiveBids;
        // TODO start time, end time, min bid, bid spacing, etc.
        // --- auction state ---
        bool allWinningBidsSettled; // default false
    }

    struct Bid {
        uint8 slotIndex;
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
        // get first slot with an active bid
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        uint256 minBidIndex = RAMProjectConfig_.minBidIndex;
        // get the bids array for that slot
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[minBidIndex];
        // get the last active bid in the array
        // @dev get last because earlier bids (lower index) have priority
        minBid = bids[bids.length - 1];
    }

    // TODO must limit to only active auctions, etc.
    function placeBid(
        uint256 projectId,
        address coreContract,
        uint8 slotIndex,
        address bidder,
        uint256 minterRefundGasLimit
    ) internal {
        // load project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // determine if have reached max bids
        bool reachedMaxBids = RAMProjectConfig_.numActiveBids ==
            RAMProjectConfig_.maxActiveBids;
        if (reachedMaxBids) {
            // remove + refund the minimum Bid
            uint8 removedSlotIndex = removeMinBid({
                projectId: projectId,
                coreContract: coreContract,
                minterRefundGasLimit: minterRefundGasLimit
            });
            // require new bid is greater than removed minimum bid
            require(slotIndex > removedSlotIndex, "Insufficient bid value");
        }
        // insert the new Bid
        insertBid({
            RAMProjectConfig_: RAMProjectConfig_,
            slotIndex: slotIndex,
            bidder: bidder
        });
    }

    // TODO: add assumptions/protections about max bids, active auction, etc.
    function insertBid(
        RAMProjectConfig storage RAMProjectConfig_,
        uint8 slotIndex,
        address bidder
    ) private {
        // add the new Bid
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[slotIndex];
        bids.push(
            Bid({
                slotIndex: slotIndex,
                bidder: bidder,
                isSettled: false,
                isMinted: false
            })
        );
        // update metadata if first bid for this slot
        // @dev assumes minting has not yet started
        if (bids.length == 1) {
            // set the slot in the bitmap
            RAMProjectConfig_.slotsBitmap = RAMProjectConfig_.slotsBitmap.set(
                slotIndex
            );
            // update bitmap metadata - reduce min bid index if necessary
            if (slotIndex < RAMProjectConfig_.minBidIndex) {
                RAMProjectConfig_.minBidIndex = slotIndex;
            }
            // update bitmap metadata - increase max unminted bid index if necessary
            if (slotIndex > RAMProjectConfig_.maxUnmintedBidSlotIndex) {
                RAMProjectConfig_.maxUnmintedBidSlotIndex = slotIndex;
            }
        }
    }

    function removeMinBid(
        uint256 projectId,
        address coreContract,
        uint256 minterRefundGasLimit
    ) private returns (uint8 removedSlotIndex) {
        // get project config
        RAMProjectConfig storage RAMProjectConfig_ = getRAMProjectConfig({
            projectId: projectId,
            coreContract: coreContract
        });
        // get the minimum bid
        uint8 minBidIndex = RAMProjectConfig_.minBidIndex;
        // get the bids array for that slot
        Bid[] storage bids = RAMProjectConfig_.bidsBySlot[minBidIndex];
        // record the previous min bidder
        address removedBidder = bids[bids.length - 1].bidder;
        // pop the last active bid in the array
        // @dev implicitly deletes the last bid in the array
        // @dev appropriate because earlier bids (lower index) have priority;
        // TODO: gas-optimize this by only editing array length since once remove a bid, will never re-add on that slot
        bids.pop();
        // record the slot index of the removed bid as return value
        removedSlotIndex = minBidIndex;
        // update metadata if no more active bids for this slot
        if (bids.length == 0) {
            // clear the slot from the bitmap
            RAMProjectConfig_.slotsBitmap = RAMProjectConfig_.slotsBitmap.unset(
                minBidIndex
            );
            // update minBidIndex, efficiently starting at minBidIndex + 1
            // @dev intentionally reverts due to overflow if removing from the last slot
            RAMProjectConfig_.minBidIndex = uint8(
                RAMProjectConfig_.slotsBitmap.minBitSet(removedSlotIndex + 1)
            );
        }
        // refund the removed bidder
        uint256 removedBidAmount = bidValueFromSlotIndex({
            RAMProjectConfig_: RAMProjectConfig_,
            slotIndex: removedSlotIndex
        });
        SplitFundsLib.forceSafeTransferETH({
            to: removedBidder,
            amount: removedBidAmount,
            minterRefundGasLimit: minterRefundGasLimit
        });
    }

    function bidValueFromSlotIndex(
        RAMProjectConfig storage RAMProjectConfig_,
        uint8 slotIndex
    ) internal view returns (uint256 amount) {
        // TODO - update this
        return 22222222;
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
