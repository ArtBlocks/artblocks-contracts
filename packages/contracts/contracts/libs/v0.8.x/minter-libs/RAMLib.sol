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

    // position of RAM Lib storage, using a diamond storage pattern
    // for this library
    bytes32 constant RAM_LIB_STORAGE_POSITION = keccak256("ramlib.storage");

    // project-specific parameters
    struct RAMProjectConfig {
        // array of bids for each slot
        mapping(uint256 slot => Bid[] bids) bidsBySlot;
        // --- slot metadata for efficiency ---
        // a slot is set only if one or more active bids exist for that slot
        uint256 slotsBitmap;
        // minimum bitmap index with an active bid
        uint8 minBidIndex;
        // maximum bitmap index with an unminted bid
        uint8 maximumUnmintedBidIndex;
        bool allWinningBidsSettled; // default false
        // --- auction parameters ---
        // TODO start time, end time, min bid, bid spacing, etc.
    }

    struct Bid {
        uint256 amount;
        address bidder;
        bool isSettled; // TODO: could remove this if amount is changed when settling
        bool winningBid;
    }

    // Diamond storage pattern is used in this library
    struct RAMLibStorage {
        mapping(address coreContract => mapping(uint256 projectId => RAMProjectConfig)) RAMProjectConfigs;
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
