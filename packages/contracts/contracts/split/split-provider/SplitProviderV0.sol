// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";
import {ISplitFactoryV2} from "../../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

import {ERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";

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
contract SplitProviderV0 is ISplitProviderV0, ERC165 {
    bytes32 private constant TYPE = "SplitProviderV0";

    ISplitFactoryV2 private immutable _splitFactoryV2;

    /**
     * @notice Construct a new SplitProviderV0 contract.
     * @param splitFactoryV2Address The immutable 0xSplits SplitFactoryV2 address.
     */
    constructor(ISplitFactoryV2 splitFactoryV2Address) {
        _splitFactoryV2 = ISplitFactoryV2(splitFactoryV2Address);
    }

    /**
     * @notice Gets or creates an immutable splitter contract at a deterministic address.
     * Splits in the splitter contract are determined by the input split parameters,
     * so we can safely create the splitter contract at a deterministic address (or use
     * the existing splitter contract if it already exists at that address).
     * @dev Uses the 0xSplits v2 implementation to create a splitter contract
     * @dev Intentionally unpermissioned; no owner required; all created splits
     * are immutable and deterministic
     * @param splitInputs The split input parameters.
     * @return splitter The newly created splitter contract address.
     */
    function getOrCreateSplitter(
        SplitInputs calldata splitInputs
    ) external override returns (address) {
        // create Split struct from SplitInputs
        ISplitFactoryV2.Split memory splitParams = _getSplitParams({
            splitInputs: splitInputs
        });
        // use sender as salt to ensure unique splitters across contracts/partners for accounting
        bytes32 salt = bytes32(bytes20(msg.sender));
        // determine if splitter already exists
        (address splitter, bool exists) = _splitFactoryV2.isDeployed({
            _splitParams: splitParams,
            _owner: address(0), // no owner, immutable,
            _salt: salt
        });
        if (!exists) {
            // create new splitter contract
            // @dev no need to re-assign returned address; isDeployed already populated
            _splitFactoryV2.createSplitDeterministic({
                _splitParams: splitParams,
                _owner: address(0), // no owner, immutable
                _creator: address(this),
                _salt: salt
            });

            // emit event for new splitter creation
            emit SplitterCreated({
                splitter: splitter,
                splitParams: splitParams
            });
        }

        return splitter;
    }

    /**
     * @notice Get the immutable 0xSplits SplitFactoryV2 address used by this SplitProviderV0.
     * @return splitFactoryV2 The 0xSplits SplitFactoryV2 address.
     */
    function getSplitFactoryV2() external view returns (ISplitFactoryV2) {
        return _splitFactoryV2;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        // broadcast support of the getOrCreateSplitter function
        // @dev intentionally only including getOrCreateSplitter, as that is the only function
        // that is intended to be used for on-chain integration (_type is for indexing and introspection only)
        return
            interfaceId == this.getOrCreateSplitter.selector ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Indicates the type of the contract, e.g. `SplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32) {
        return TYPE;
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
