// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ISplitFactoryV2} from "./integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

interface ISplitProviderV0 {
    /**
     * @notice SplitInputs struct defines the inputs for requested splitters.
     * It is defined in a way easily communicated from the Art Blocks GenArt721V3 contract,
     * to allow for easy integration and minimal additional bytecode in the GenArt721V3 contract.
     */
    struct SplitInputs {
        address platformProviderSecondarySalesAddress;
        uint16 platformProviderSecondarySalesBPS;
        address renderProviderSecondarySalesAddress;
        uint16 renderProviderSecondarySalesBPS;
        uint8 artistTotalRoyaltyPercentage;
        address artist;
        address additionalPayee;
        uint8 additionalPayeePercentage;
    }

    /**
     * @notice Emitted when a new splitter contract is created.
     * @param splitter address of the splitter contract
     */
    event SplitterCreated(address indexed splitter);

    /**
     * @notice Gets or creates an immutable splitter contract at a deterministic address.
     * Splits in the splitter contract are determined by the input split parameters,
     * so we can safely create the splitter contract at a deterministic address (or use
     * the existing splitter contract if it already exists at that address).
     * @dev Uses the 0xSplits v2 implementation to create a splitter contract
     * @param splitInputs The split input parameters.
     * @return splitter The newly created splitter contract address.
     */
    function getOrCreateSplitter(
        SplitInputs calldata splitInputs
    ) external returns (address);

    /**
     * @notice Indicates the type of the contract, e.g. `SplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
