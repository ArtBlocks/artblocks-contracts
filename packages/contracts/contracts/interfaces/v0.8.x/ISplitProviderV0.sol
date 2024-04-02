// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

pragma solidity ^0.8.0;

import {ISplitFactoryV2} from "./integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

interface ISplitProviderV0 {
    /**
     * @notice Emitted when a new splitter contract is created.
     * @param splitter address of the splitter contract
     * @param providerSplitParams The split parameters in the format used for inputs to this contract.
     */
    event SplitterCreated(
        address indexed splitter,
        ProviderSplitParams providerSplitParams
    );

    /**
     * @notice Packed split data for a single split
     * @dev This is in the format used for inputs to this contract, and is not the same as the
     * 0xSplits Split struct.
     * @param recipient The address of the recipient
     * @param basisPoints The basis points of the split
     */
    struct ProviderSplit {
        address recipient;
        uint16 basisPoints;
    }

    /**
     * @notice Complete split data for a single split.
     * @dev This is in the format used for inputs to this contract, and is not the same as the
     * 0xSplits Split struct.
     * @param splitParams The split parameters.
     */
    struct ProviderSplitParams {
        ProviderSplit[] providerSplits;
        // incentive for distribution, defined in BPS (DIFFERENT THAN 0XSPLITS FACTORY WHICH USES 1e6)
        uint16 distributionIncentiveBPS;
    }

    /**
     * @notice Get or create an immutable splitter contract at an address determined
     * by the split parameters (as well as 0xSplits SplitFactoryV2 address).
     * @dev Uses the 0xSplits v2 implementation to create immutable splitter contracts,
     * with owner of 0 and salt of 0.
     * @param providerSplitParams The split provider's input split parameters.
     * @return splitter The splitter contract address.
     */
    function getOrCreateSplitter(
        ProviderSplitParams calldata providerSplitParams
    ) external returns (address);

    /**
     * @notice Indicates the type of the contract, e.g. `ISplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32);
}
