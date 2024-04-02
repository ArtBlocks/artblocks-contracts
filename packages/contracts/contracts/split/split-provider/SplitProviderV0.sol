// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {ISplitProviderV0} from "../../interfaces/v0.8.x/ISplitProviderV0.sol";
import {ISplitFactoryV2} from "../../interfaces/v0.8.x/integration-refs/splits-0x-v2/ISplitFactoryV2.sol";

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

    // factor for converting from BPS to 0xSplits percentage basis factor of 1e6
    uint256 private constant BPS_TO_0XSPLITS_PERCENTAGE_BASIS_FACTOR =
        1_000_000 / 10_000;
    // cap on distribution incentive BPS to 6.5%
    uint256 private constant MAX_DISTRIBUTION_INCENTIVE_BPS = 650;

    ISplitFactoryV2 private immutable _splitFactoryV2;

    /**
     * @notice Construct a new SplitProviderV0 contract.
     * @param splitFactoryV2Address The immutable 0xSplits SplitFactoryV2 address.
     */
    constructor(ISplitFactoryV2 splitFactoryV2Address) {
        _splitFactoryV2 = ISplitFactoryV2(splitFactoryV2Address);
        // validate max distribution BPS cannot overflow uint16, eliminating need for check in _validateAndGetSplitParams0xSplits
        require(
            MAX_DISTRIBUTION_INCENTIVE_BPS *
                BPS_TO_0XSPLITS_PERCENTAGE_BASIS_FACTOR <=
                type(uint16).max,
            "invalid max distribution incentive BPS"
        );
    }

    /**
     * @notice Get or create an immutable splitter contract at an address determined
     * by the split parameters (as well as 0xSplits _splitFactoryV2 address).
     * @dev Uses the 0xSplits v2 implementation to create immutable splitter contracts,
     * with owner of 0 and salt of 0.
     * @param providerSplitParams The split parameters in the format used for inputs to this contract.
     * @return splitter The splitter contract address.
     */
    function getOrCreateSplitter(
        ProviderSplitParams calldata providerSplitParams
    ) external returns (address) {
        // convert input split params to 0xSplits Split struct format
        // @dev also validate input split params at same time for gas efficiency
        ISplitFactoryV2.Split
            memory splitParams0xSplits = _validateAndGetSplitParams0xSplits({
                providerSplitParams: providerSplitParams
            });
        // return existing splitter if already exists
        // @dev fully deterministic deployment address based on splitParams, owner, and salt
        // @dev design choice to delegate to 0xSplits SplitFactoryV2 for isDeployed check, - it could be done here but would introduce more contract risk
        (address splitter, bool isDeployed_) = _splitFactoryV2.isDeployed({
            _splitParams: splitParams0xSplits,
            _owner: _OWNER,
            _salt: _SALT
        });
        if (!isDeployed_) {
            // need to deploy new splitter
            // @dev no need to re-assign returned address, as it is deterministic and already assigned during isDeployed call
            _splitFactoryV2.createSplitDeterministic({
                _splitParams: splitParams0xSplits,
                _owner: _OWNER,
                _creator: address(this),
                _salt: _SALT
            });
            // emit event for new splitter creation
            emit SplitterCreated({
                splitter: splitter,
                providerSplitParams: providerSplitParams
            });
        }
        return splitter;
    }

    /**
     * @notice Check if splitter already exists for a given providerSplitParams.
     * @dev This function assumes the behavior of this contract; owner of 0 and salt of 0.
     * @dev Forwards the call to the 0xSplits SplitFactoryV2 implementation.
     * @param providerSplitParams The split parameters in the format used for inputs to this contract.
     * @return spliterAddress The split factory address.
     * @return isDeployed_ True if the splitter already exists.
     */
    function isDeployed(
        ProviderSplitParams calldata providerSplitParams
    ) external view returns (address spliterAddress, bool isDeployed_) {
        // convert input split params to 0xSplits Split struct format
        // @dev also validate input split params at same time for gas efficiency
        ISplitFactoryV2.Split
            memory splitParams0xSplits = _validateAndGetSplitParams0xSplits({
                providerSplitParams: providerSplitParams
            });
        // assign return values via call to 0xSplits SplitFactoryV2
        (spliterAddress, isDeployed_) = _splitFactoryV2.isDeployed({
            _splitParams: splitParams0xSplits,
            _owner: _OWNER,
            _salt: _SALT
        });
    }

    /**
     * @notice Predict the address of a new split based on the providerSplitParams
     * (as well as 0xSplits _splitFactoryV2 address).
     * @param providerSplitParams The split parameters in the format used for inputs to this contract.
     * @return spliterAddress Address of the split, if created.
     */
    function getDeterministicAddress(
        ProviderSplitParams calldata providerSplitParams
    ) external view returns (address spliterAddress) {
        // convert input split params to 0xSplits Split struct format
        // @dev also validate input split params at same time for gas efficiency
        ISplitFactoryV2.Split
            memory splitParams0xSplits = _validateAndGetSplitParams0xSplits({
                providerSplitParams: providerSplitParams
            });
        // assign return value via call to 0xSplits SplitFactoryV2
        spliterAddress = _splitFactoryV2.predictDeterministicAddress({
            _splitParams: splitParams0xSplits,
            _owner: _OWNER,
            _salt: _SALT
        });
    }

    /**
     * @notice Get the immutable 0xSplits SplitFactoryV2 address used by this SplitProviderV0.
     * @return splitFactoryV2 The 0xSplits SplitFactoryV2 address.
     */
    function getSplitFactoryV2() external view returns (ISplitFactoryV2) {
        return _splitFactoryV2;
    }

    /**
     * @notice Get the maximum distribution incentive BPS allowed by this SplitProviderV0.
     * @return MAX_DISTRIBUTION_INCENTIVE_BPS The maximum distribution incentive BPS.
     */
    function getMaxDistributionIncentiveBPS() external pure returns (uint256) {
        return MAX_DISTRIBUTION_INCENTIVE_BPS;
    }

    /**
     * @notice Indicates the type of the contract, e.g. `SplitProviderV0`.
     * @return type_ The type of the contract.
     */
    function type_() external pure returns (bytes32) {
        return TYPE;
    }

    /**
     * Validates and converts the input split parameters to 0xSplits Split struct format.
     * Reverts if the input split parameters are invalid.
     * @param providerSplitParams The split provider's input split parameters.
     * @return splitParams0xSplits The split parameters in 0xSplits Split struct format.
     */
    function _validateAndGetSplitParams0xSplits(
        ProviderSplitParams calldata providerSplitParams
    ) private pure returns (ISplitFactoryV2.Split memory splitParams0xSplits) {
        uint256 totalAllocation; // init value of zero, require 10_000 total allocation after iteration
        uint256 splitParamsLength = providerSplitParams.providerSplits.length;
        splitParams0xSplits.recipients = new address[](splitParamsLength);
        splitParams0xSplits.allocations = new uint256[](splitParamsLength);
        for (uint256 i = 0; i < splitParamsLength; i++) {
            splitParams0xSplits.recipients[i] = providerSplitParams
                .providerSplits[i]
                .recipient;
            uint256 basisPoints = providerSplitParams
                .providerSplits[i]
                .basisPoints;
            splitParams0xSplits.allocations[i] = basisPoints;
            totalAllocation += basisPoints;
        }
        require(totalAllocation == 10_000, "total allocation must be 10_000");
        // @dev assign to constant instead of MLOAD for gas efficiency
        splitParams0xSplits.totalAllocation = 10_000;
        // validate input distribution incentive BPS is lte MAX_DISTRIBUTION_INCENTIVE_BPS
        require(
            providerSplitParams.distributionIncentiveBPS <=
                MAX_DISTRIBUTION_INCENTIVE_BPS,
            "only dist incentive lte 6.5%"
        );
        // assign distribution incentive, converting from BPS to 0xSplits percentage basis factor
        // @dev check for overflow/truncation not needed, as max limits were already checked in constructor
        splitParams0xSplits.distributionIncentive = uint16(
            providerSplitParams.distributionIncentiveBPS *
                BPS_TO_0XSPLITS_PERCENTAGE_BASIS_FACTOR
        );

        return splitParams0xSplits;
    }
}
