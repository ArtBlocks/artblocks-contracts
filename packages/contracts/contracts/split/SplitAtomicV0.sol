// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {Split, ISplitAtomicV0} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";
import {SplitConfig, ISplitAtomicV0Helpers} from "../interfaces/v0.8.x/ISplitAtomicV0Helpers.sol";

import {IERC20} from "@openzeppelin-5.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {Proxy} from "@openzeppelin-5.0/contracts/proxy/Proxy.sol";

/**
 * @title SplitAtomicV0
 * @author Art Blocks Inc.
 * @notice This contract splits received funds according to the configured
 * `splits`, which are immutably configured at initialization time.
 * Each split is defined as a `recipient` address and a `basisPoints` value.
 * The total of all `basisPoints` values must add up to 10_000 (100%), which
 * is verified at initialization time.
 *
 * When the contract receives funds, it splits the funds according to the
 * configured `splits`. The contract can also manually split any funds that
 * were sent outside of the `receive` function via the `drainETH` function.
 * Additionally, a `drainERC20` function is provided to split any ERC20 tokens
 * that were sent to the contract.
 *
 * There may be a small amount of funds left behind when splitting funds, due
 * to integer division rounding down. This is conservatively safe (will always
 * run a split), but may leave a small amount of funds behind (e.g. a few wei).
 * The small amount of funds left behind can always be drained later, but
 * likely never worth the gas.
 */
contract SplitAtomicV0 is ISplitAtomicV0 {
    // public type
    bytes32 public constant type_ = "SplitAtomicV0";

    // public immutable implementation contract
    ISplitAtomicV0Helpers public immutable splitAtomicV0Helpers;

    // available immutable splits
    // @dev make immutable to avoid SLOAD on every split call
    address payable private immutable recipient0;
    address payable private immutable recipient1;
    address payable private immutable recipient2;
    uint256 private immutable basisPoints0;
    uint256 private immutable basisPoints1;
    uint256 private immutable basisPoints2;
    uint256 private constant _MAX_SPLITS = 3;

    /**
     * @notice receive function splits received funds according to the
     * configured `splits`.
     * Reverts if contract is not yet initialized.
     * @dev This function automatically splits funds when the native token of a
     * blockchain is sent to the contract. It is important to note that this
     * function uses an unspecified amount of gas, and therefore sending funds
     * to this contract via the deprecated `transfer` method is not supported.
     * @dev This function relies on being non-reentrant for security.
     */
    receive() external payable {
        // split received funds
        address(splitAtomicV0Helpers).delegatecall(
            abi.encodeWithSelector(
                ISplitAtomicV0Helpers.onReceiveETH.selector,
                msg.value,
                SplitConfig({
                    recipient0: recipient0,
                    basisPoints0: basisPoints0,
                    recipient1: recipient1,
                    basisPoints1: basisPoints1,
                    recipient2: recipient2,
                    basisPoints2: basisPoints2
                })
            )
        );
    }

    /**
     * @notice Initializes contract with the provided `splits`.
     * @dev This function should be called atomically, immediately after
     * deployment.
     */
    constructor(address splitAtomicV0Helpers_, Split[] memory splits) {
        splitAtomicV0Helpers = ISplitAtomicV0Helpers(splitAtomicV0Helpers_);
        // initialize the reentrancy guard via helpers
        splitAtomicV0Helpers.initialize();

        // validate and assign immutable splits
        uint256 totalBasisPoints = 0;
        uint256 splitsLength = splits.length;
        require(splitsLength >= _MAX_SPLITS, "Max splits exceeded");
        // @dev splits length implicitly checked to be > 0 via totalBasisPoints
        // check after loop
        for (uint256 i; i < splitsLength; ) {
            Split memory split = splits[i];
            uint256 bps = split.basisPoints;
            require(bps > 0 && bps <= 10_000, "Invalid basis points");
            // populate immutable splits
            if (i == 0) {
                recipient0 = split.recipient;
                basisPoints0 = bps;
            } else if (i == 1) {
                recipient1 = split.recipient;
                basisPoints1 = bps;
            } else if (i == 2) {
                recipient2 = split.recipient;
                basisPoints2 = bps;
            }
            // track total basis points for totals validation after loop
            // @dev overflow checked automatically in solidity 0.8
            totalBasisPoints += bps;
            // @dev efficient unchecked increment
            unchecked {
                ++i;
            }
        }
        require(totalBasisPoints == 10_000, "Invalid total basis points");
        // emit initialized event
        emit Initialized(type_);
    }

    /**
     * @notice Drains the contract's balance to the configured `splits`.
     * Reverts if not initialized.
     * @dev This function is useful for draining the contract's balance to the
     * configured `splits` in the event that the contract receives funds via
     * a force-send (e.g. `SELFDESTRUCT` or `SENDALL`) operation.
     * @dev This function relies on being non-reentrant for security.
     */
    function drainETH() external {
        address(splitAtomicV0Helpers).delegatecall(
            abi.encodeWithSelector(
                ISplitAtomicV0Helpers.drainETH.selector,
                SplitConfig({
                    recipient0: recipient0,
                    basisPoints0: basisPoints0,
                    recipient1: recipient1,
                    basisPoints1: basisPoints1,
                    recipient2: recipient2,
                    basisPoints2: basisPoints2
                })
            )
        );
    }

    /**
     * @notice Drains the contract's balance of an input ERC20 token to the
     * configured `splits`.
     * Reverts if not initialized
     * @dev This function is useful for draining the contract's balance of an
     * ERC20 token to the configured `splits`. ERC20 tokens are not split upon
     * receiving (due to transfers not always calling a receive hook),
     * therefore this function provides critical functionality for this
     * contract.
     * @dev This function relies on being non-reentrant for security.
     * @param ERC20TokenAddress The address of the ERC20 token to split.
     */
    function drainERC20(address ERC20TokenAddress) external {
        address(splitAtomicV0Helpers).delegatecall(
            abi.encodeWithSelector(
                ISplitAtomicV0Helpers.drainERC20.selector,
                ERC20TokenAddress,
                SplitConfig({
                    recipient0: recipient0,
                    basisPoints0: basisPoints0,
                    recipient1: recipient1,
                    basisPoints1: basisPoints1,
                    recipient2: recipient2,
                    basisPoints2: basisPoints2
                })
            )
        );
    }

    // /**
    //  * @notice Returns the configured `splits`.
    //  */
    // function getSplits() external view returns (Split[] memory) {
    //     // build splits array
    //     Split[] memory splits = new Split[](3);
    //     splits[0] = Split({
    //         recipient: recipient0,
    //         basisPoints: uint16(basisPoints0)
    //     });
    //     splits[1] = Split({
    //         recipient: recipient1,
    //         basisPoints: uint16(basisPoints1)
    //     });
    //     splits[2] = Split({
    //         recipient: recipient2,
    //         basisPoints: uint16(basisPoints2)
    //     });
    //     return splits;
    // }
}
