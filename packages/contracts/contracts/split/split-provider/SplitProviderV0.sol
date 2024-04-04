// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";
import {ISplitFactoryV2} from "../../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";
import {ISplitWalletV2} from "../../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitWalletV2.sol";

/**
 * @title SplitProviderV0
 * @author Art Blocks Inc.
 * @notice Split Provider to get or create immutable split contracts.
 * This version of SplitProvider integrates with 0xSplits v2 to provide
 * immutable split contracts.
 * All split contracts will be created with the following properties:
 * - The split contract will be immutable.
 * - The split contract will be created with the provided split parameters.
 * - The split contract will be created at a deterministic address, given the
 *   input split parameters (as well as the 0xSplits SplitFactoryV2 address).
 */
contract SplitProviderV0 is ISplitProviderV0 {
    bytes32 private constant TYPE = "SplitProviderV0";
    bytes32 private constant _SALT = bytes32(0); // zero salt for cheapest execution gas
    address private constant _OWNER = address(0); // no owner, immutable

    ISplitFactoryV2 private immutable _splitFactoryV2;

    mapping(address splitter => address creator) private _splitterCreators;

    /**
     * @notice Construct a new SplitProviderV0 contract.
     * @param splitFactoryV2Address The immutable 0xSplits SplitFactoryV2 address.
     */
    constructor(ISplitFactoryV2 splitFactoryV2Address) {
        _splitFactoryV2 = ISplitFactoryV2(splitFactoryV2Address);
    }

    /**
     * @notice Creates a new splitter contract owned by this contract at a new address.
     * Sets msg.sender as the creator of the new splitter, enabling it to update the splitter
     * via future calls to `updateSplitter` on this contract.
     * @dev Uses the 0xSplits v2 implementation to create an owned splitter contract,
     * with owner as this SplitProvider contract.
     * @param splitInputs The split input parameters.
     * @return splitter The newly created splitter contract address.
     */
    function createSplitter(
        SplitInputs calldata splitInputs
    ) external override returns (address) {
        // create Split struct from SplitInputs
        ISplitFactoryV2.Split memory splitParams = _getSplitParams({
            splitInputs: splitInputs
        });
        // create new splitter contract
        address newSplitter = _splitFactoryV2.createSplit({
            _splitParams: splitParams,
            _owner: address(this),
            _creator: msg.sender
        });
        // update storage with msg.sender as the creator of the new splitter
        _splitterCreators[newSplitter] = msg.sender;

        // emit event for new splitter creation
        emit SplitterCreated({splitter: newSplitter, splitParams: splitParams});

        return newSplitter;
    }

    /**
     * @notice Modifies the split parameters of an existing splitter contract.
     * Only the original creator of the splitter may call this function.
     * @dev Uses the 0xSplits v2 implementation to modify the split parameters of an existing splitter contract.
     * @param splitter The splitter contract address to modify. Must be owned by this contract.
     * @param splitInputs The split input parameters.
     */
    function updateSplitter(
        address splitter,
        SplitInputs calldata splitInputs
    ) external override {
        // verify caller is the creator of the splitter
        // @dev this also verifies the splitter exists and is a valid splitter contract,
        // as only valid splitter contracts will have a creator
        _onlyCreator(splitter);
        // create Split struct from SplitInputs
        ISplitFactoryV2.Split memory splitParams = _getSplitParams({
            splitInputs: splitInputs
        });
        // distribute funds prior to updating the split to avoid misallocation
        // of previously sent funds that are undistributed
        // TODO distributeFunds(splitter);
        // modify existing splitter contract
        ISplitWalletV2(splitter).updateSplit({_split: splitParams});

        // emit event for updated splitter
        emit SplitterUpdated({splitter: splitter, splitParams: splitParams});
    }

    /**
     * @notice Get the immutable 0xSplits SplitFactoryV2 address used by this SplitProviderV0.
     * @return splitFactoryV2 The 0xSplits SplitFactoryV2 address.
     */
    function getSplitFactoryV2() external view returns (ISplitFactoryV2) {
        return _splitFactoryV2;
    }

    /**
     * Gets the creator of a splitter contract.
     * The creator of a splitter is the msg.sender that called `createSplitter` to deploy the splitter.
     * Returns the zero address if the splitter was not deployed via a call to `deploySplitter` on this contract.
     * @param splitter Splitter to get the creator of.
     * @return creator The creator of the splitter.
     */
    function getSplitterCreator(
        address splitter
    ) external view returns (address creator) {
        creator = _splitterCreators[splitter];
    }

    /**
     * @notice Indicates the type of the contract, e.g. `SplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32) {
        return TYPE;
    }

    /**
     * @notice Reverts if the caller is not the creator of the splitter contract.
     * @param splitter The splitter contract address to modify.
     */
    function _onlyCreator(address splitter) private view {
        require(
            _splitterCreators[splitter] == msg.sender,
            "SplitProviderV0: Only creator"
        );
    }

    function _getSplitParams(
        SplitInputs calldata splitInputs
    ) private pure returns (ISplitFactoryV2.Split memory splitParams) {
        // define allocations in BPS to avoid any rounding errors
        uint256 ArtistAndAdditionalRoyaltyPercentage = splitInputs
            .artistTotalRoyaltyPercentage;
        uint256 ArtistAndAdditionalRoyaltyBPS = 100 *
            ArtistAndAdditionalRoyaltyPercentage;
        // load render provider royalty BPS
        uint256 renderProviderRoyaltyBPS = splitInputs
            .renderProviderSecondarySalesBPS;
        // load platform provider royalty BPS
        uint256 platformProviderRoyaltyBPS = splitInputs
            .platformProviderSecondarySalesBPS;

        // edge case: no royalties due; revert
        if (
            ArtistAndAdditionalRoyaltyPercentage +
                renderProviderRoyaltyBPS +
                platformProviderRoyaltyBPS ==
            0
        ) {
            revert("SplitProviderV0: No royalties due");
        }

        bool artistNonZero = ArtistAndAdditionalRoyaltyPercentage > 0 &&
            splitInputs.additionalPayeePercentage < 100;
        bool additionalPayeeNonZero = ArtistAndAdditionalRoyaltyPercentage >
            0 &&
            splitInputs.additionalPayeePercentage > 0;
        bool renderNonZero = renderProviderRoyaltyBPS > 0;
        bool platformNonZero = platformProviderRoyaltyBPS > 0;

        // allocate memory for splitParams arrays
        uint256 partyLength = (artistNonZero ? 1 : 0) +
            (additionalPayeeNonZero ? 1 : 0) +
            (renderNonZero ? 1 : 0) +
            (platformNonZero ? 1 : 0);
        splitParams.recipients = new address[](partyLength);
        splitParams.allocations = new uint256[](partyLength);
        splitParams.totalAllocation =
            ArtistAndAdditionalRoyaltyBPS +
            renderProviderRoyaltyBPS +
            platformProviderRoyaltyBPS;

        // populate each party's split
        uint256 currentIndex = 0;
        if (artistNonZero) {
            splitParams.recipients[currentIndex] = splitInputs.artist;
            // @dev percent * 100 converts to BPS
            splitParams.allocations[currentIndex++] =
                ArtistAndAdditionalRoyaltyPercentage *
                (100 - splitInputs.additionalPayeePercentage);
        }
        if (additionalPayeeNonZero) {
            splitParams.recipients[currentIndex] = splitInputs.additionalPayee;
            // @dev percent * 100 converts to BPS
            splitParams.allocations[currentIndex++] =
                ArtistAndAdditionalRoyaltyPercentage *
                splitInputs.additionalPayeePercentage;
        }
        if (renderNonZero) {
            splitParams.recipients[currentIndex] = splitInputs
                .renderProviderSecondarySalesAddress;
            splitParams.allocations[currentIndex++] = renderProviderRoyaltyBPS;
        }
        if (platformNonZero) {
            splitParams.recipients[currentIndex] = splitInputs
                .platformProviderSecondarySalesAddress;
            splitParams.allocations[
                currentIndex // no need to increment, last element
            ] = platformProviderRoyaltyBPS;
        }

        // @dev TODO leave distribution incentive as zero
    }
}
