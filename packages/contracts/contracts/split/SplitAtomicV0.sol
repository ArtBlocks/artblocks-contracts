// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {ISplitAtomicV0, Split} from "../interfaces/v0.8.x/ISplitAtomicV0.sol";

import {IERC20} from "@openzeppelin-5.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-5.0/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SplitAtomicV0
 * @author Art Blocks Inc.
 * @notice This contract splits received funds according to the configured
 * `splits`, which are immutably configured at initialization time.
 * Each split is defined as a `recipient` address and a `basisPoints` value.
 * The total of all `basisPoints` values must add up to 10_000 (100%), which
 * is verified at initialization time. All splits must be non-zero.
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
    // simplified, initializable reentrancy guard
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private constant _NOT_INITIALIZED = 0;
    uint256 private _status; // initial value: _NOT_INITIALIZED (0)

    // public type
    bytes32 public constant type_ = "SplitAtomicV0";

    // private array of Splits
    Split[] private _splits;

    /**
     * @dev Prevents contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     * @dev prefer to use modifier here due to wrapped function behavior
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @notice receive function splits received funds according to the
     * configured `splits`.
     * Reverts if contract is not yet initialized.
     * Non-reentrant function.
     * @dev This function automatically splits funds when the native token of a
     * blockchain is sent to the contract. It is important to note that this
     * function uses an unspecified amount of gas, and therefore sending funds
     * to this contract via the deprecated `transfer` method is not supported.
     * @dev This function relies on being non-reentrant for security.
     */
    receive() external payable nonReentrant {
        // split received funds
        // @dev reverts if not already initialized
        _splitETH(msg.value);
    }

    /**
     * @notice Initializes the contract with the provided `splits`.
     * This function should be called atomically, immediately after deployment.
     * Only callable once.
     * @param splits Splits to configure the contract with. Must add up to
     * 10_000 BPS.
     */
    function initialize(Split[] calldata splits) external {
        // initialize reentrancy guard
        // @dev this reverts if already initialized, preventing this function
        // from ever being called more than once
        _reentrancyGuardInit();
        // validate splits
        uint256 totalBasisPoints = 0;
        uint256 splitsLength = splits.length;
        // @dev splits length implicitly checked to be > 0 via totalBasisPoints
        // check after loop
        for (uint256 i; i < splitsLength; ) {
            Split memory split = splits[i];
            uint256 bps = split.basisPoints;
            require(bps > 0 && bps <= 10_000, "Invalid basis points");
            // push the splits to the storage array
            _splits.push(split);
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
    function drainETH() external nonReentrant {
        // split contract balance
        uint256 balance = address(this).balance;
        if (balance > 0) {
            // @dev reverts if not initialized
            _splitETH(balance);
        }
        emit DrainedETH();
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
    function drainERC20(address ERC20TokenAddress) external nonReentrant {
        // split contract balance of ERC20 token
        uint256 balance = IERC20(ERC20TokenAddress).balanceOf(address(this));
        if (balance > 0) {
            // @dev reverts if not initialized
            _splitERC20({ERC20TokenAddress: ERC20TokenAddress, value: balance});
        }
        emit DrainedERC20(ERC20TokenAddress);
    }

    /**
     * @notice Returns the configured `splits`.
     * @return Split[] memory The configured `splits`.
     */
    function getSplits() external view returns (Split[] memory) {
        return _splits;
    }

    /**
     * @notice Splits the input `valueInWei` of ETH to the configured `splits`.
     * Reverts if any transfers fail. Reverts if called outside of a
     * non-reentrant function. Reverts if not initialized.
     * @param valueInWei The amount of ETH to split.
     */
    function _splitETH(uint256 valueInWei) internal {
        // require only called in the context of a non-reentrant function
        // @dev this provides fault-tolerant behavior for reentrancy guards
        // @dev this also implicitly verifies contract is initialized
        // @dev no cover on next line else banch due to fault-tolerant check
        require(_status == _ENTERED, "only in non-reentrant function");
        // split funds
        uint256 splitsLength = _splits.length;
        for (uint256 i; i < splitsLength; ) {
            Split memory split = _splits[i];
            // @dev overflow checked automatically in solidity 0.8
            // @dev integer division rounds down, which is conservatively safe
            // when splitting funds. Will not run out of funds, but may leave a
            // small amount behind (e.g. a few wei). Can always be drained
            // later, but likely never worth the gas.
            uint256 splitValue = (valueInWei * split.basisPoints) / 10_000;
            // send funds
            (bool success, ) = split.recipient.call{value: splitValue}("");
            require(success, "Payment failed");
            // @dev efficient unchecked increment
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Splits the input `value` of ERC20 token at `ERC20TokenAddress`
     * to the configured `splits`.
     * Reverts if any transfers fail. Reverts if called outside of a
     * non-reentrant function. Reverts if not initialized.
     * @param ERC20TokenAddress The address of the ERC20 token to split.
     * @param value The amount of the ERC20 token to split.
     */
    function _splitERC20(address ERC20TokenAddress, uint256 value) internal {
        // require only called in the context of a non-reentrant function
        // @dev this provides fault-tolerant behavior for reentrancy guards
        // @dev this also implicitly verifies contract is initialized
        // @dev no cover on next line else banch due to fault-tolerant check
        require(_status == _ENTERED, "only in non-reentrant function");
        // split funds
        uint256 splitsLength = _splits.length;
        IERC20 token = IERC20(ERC20TokenAddress);
        for (uint256 i; i < splitsLength; ) {
            Split memory split = _splits[i];
            // @dev overflow checked automatically in solidity 0.8
            // @dev integer division rounds down, which is conservatively safe
            // when splitting funds. Will not run out of funds, but may leave a
            // small amount behind (e.g. a few wei). Can always be drained
            // later, but likely never worth the gas.
            uint256 splitValue = (value * split.basisPoints) / 10_000;
            // transfer ERC20 tokens
            // @dev use SafeERC20 to only revert if ERC20 transfer returns
            // false, not if it returns nothing (which is the behavior of some
            // ERC20 tokens, and we don't want to forever lock those tokens)
            SafeERC20.safeTransfer({
                token: token,
                to: split.recipient,
                value: splitValue
            });
            // @dev efficient unchecked increment
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Initializes the reentrancy guard. This function will revert if
     * the contract is already initialized.
     */
    function _reentrancyGuardInit() private {
        // require not already initialized
        require(_status == _NOT_INITIALIZED, "Already initialized");
        // set status to not entered
        _status = _NOT_ENTERED;
    }

    /**
     * @notice Sets the reentrancy guard status to `_ENTERED`.
     * Reverts if the guard is already entered.
     */
    function _nonReentrantBefore() private {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;
    }

    /**
     * @notice Sets the reentrancy guard status to `_NOT_ENTERED`, allowing
     * calls to `nonReentrant` functions again.
     */
    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}
