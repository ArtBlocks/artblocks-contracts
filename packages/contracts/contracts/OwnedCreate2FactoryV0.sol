// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

// @dev fixed to specific solidity version for clarity and for more clear
// source code verification purposes.
pragma solidity 0.8.22;

import {AdminACLV0} from "./AdminACLV0.sol";
import {EngineConfiguration} from "./interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";
import {IOwnedCreate2FactoryV0} from "./interfaces/v0.8.x/IOwnedCreate2FactoryV0.sol";
import {IAdminACLV0_Extended} from "./interfaces/v0.8.x/IAdminACLV0_Extended.sol";
import {GenArt721CoreV3_Curated} from "./GenArt721CoreV3_Curated.sol";

import "@openzeppelin-5.0/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin-5.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-5.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {Create2} from "@openzeppelin-5.0/contracts/utils/Create2.sol";

/**
 * @title OwnedCreate2FactoryV0
 * @author Art Blocks Inc.
 * @notice Owned, Create2 factory contract for deploying arbitrary contracts from a single wallet.
 * This contract is intended to be used as a factory for deploying other contracts, while also allowing
 * the owner to drain the contract's balance to a recipient address. The contract also provides a
 * function to execute a batch of calls, which can be useful for interacting with contracts that
 * might deem this contract eligible for airdrops, thereby avoiding loss of funds.
 */
contract OwnedCreate2FactoryV0 is Ownable, IOwnedCreate2FactoryV0 {
    // public type
    bytes32 public constant type_ = "IOwnedCreate2FactoryV0";

    // pseudorandom salt nonce to prevent collisions for multiple contract deployments in single block
    uint256 private _pseudorandomSaltNonce;

    /**
     * Represents a generic call operation.
     */
    struct Call {
        address to;
        bytes data;
    }

    /**
     * @notice creates this contract and deploys the curated contract
     * @param owner_ address of the initial owner of this contract to execute all future calls
     */
    constructor(address owner_) Ownable(owner_) {
        // input validation
        _onlyNonZeroAddress(owner_);
    }

    /**
     * @notice Deploy a new contract using create2.
     * Reverts if the initcode is empty.
     * Reverts if not called by the owner.
     * The address of the new contract is deterministic based on the salt and initcode, and may be obtained by calling
     * the `predictDeterministicAddress` function.
     * @param salt The salt to use for the deployment.
     * @param initcode The initcode of the contract to deploy.
     */
    function deploy(
        bytes32 salt,
        bytes calldata initcode
    ) external payable onlyOwner returns (address newContract) {
        // input validation
        // @dev Create2.deploy will revert if initcode is empty

        // deploy contract
        newContract = Create2.deploy({
            amount: msg.value,
            salt: salt,
            bytecode: initcode
        });

        emit ContractCreated({newContract: newContract});
        return newContract;
    }

    /**
     * @dev This contract is not intended to hold funds. This function,
     * `drainETH`, and `drainERC20` are implemented to prevent the loss
     * of funds that might be sent to this contract inadvertently.
     */
    receive() external payable {}

    /**
     * @notice Drains the contract's balance to the `recipient`.
     * @param recipient The address to send funds to.
     * Only callable by the owner.
     */
    function drainETH(address payable recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = recipient.call{value: balance}("");
            require(success, "Payment failed");
        }
    }

    /**
     * @notice Drains the contract's balance of an input ERC20 token to
     * the `recipient`.
     * @param ERC20TokenAddress The address of the ERC20 token to withdraw.
     * @param recipient The address to send ERC20 tokens to.
     * Only callable by the owner.
     */
    function drainERC20(
        address ERC20TokenAddress,
        address recipient
    ) external onlyOwner {
        IERC20 token = IERC20(ERC20TokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            SafeERC20.safeTransfer({
                token: token,
                to: recipient,
                value: balance
            });
        }
    }

    /**
     * @notice Execute a batch of calls.
     * @dev The calls are executed in order, reverting if any of them fails. Can
     * only be called by the owner. It is safe to check ownership only once here
     * because the owner status is only used to gate access to the function, not
     * to validate each individual call. Even if ownership is transferred during
     * the sequence of calls, it does not affect the execution logic or security,
     * as ownership is solely used to prevent unauthorized use of this batch
     * execution capability. This is particularly useful to safely interact
     * with contracts or addresses that might deem this contract eligible for
     * airdrops, thereby avoiding loss of funds.
     * @param _calls The calls to execute
     */
    function execCalls(
        Call[] calldata _calls
    )
        external
        onlyOwner
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        uint256 length = _calls.length;
        returnData = new bytes[](length);

        for (uint256 i = 0; i < length; ++i) {
            Call calldata calli = _calls[i];

            // check for existence of code at the target address
            if (calli.to.code.length == 0) {
                // when the call is to an EOA, the calldata must be empty.
                require(calli.data.length == 0, "Invalid call data");
            }

            (bool success, bytes memory data) = calli.to.call(calli.data);
            require(success, string(data));
            returnData[i] = data;
        }
    }

    /**
     * @dev Predict the deterministic address for a new deployment using create2.
     * @param salt Salt used to deterministically deploy the clone.
     * @param initcode The initcode of the contract to deploy.
     */

    function predictDeterministicAddress(
        bytes32 salt,
        bytes memory initcode
    ) external view returns (address predicted) {
        return
            Create2.computeAddress({
                salt: salt,
                bytecodeHash: keccak256(initcode)
            });
    }

    /**
     * @notice helper function to generate a pseudorandom salt
     * @return result pseudorandom salt
     */
    function _generatePseudorandomSalt() internal returns (bytes32 result) {
        // get and increment nonce to prevent same-block collisions
        uint256 nonce = _pseudorandomSaltNonce++;
        return
            keccak256(
                abi.encodePacked(
                    nonce,
                    block.timestamp,
                    block.number,
                    address(this)
                )
            );
    }

    /**
     * @notice helper function to convert a string to a bytes32.
     * Caution: This function only works properly for short strings.
     * @param source string to convert
     * @return result bytes32 representation of the string
     */
    function _stringToBytes32(
        string memory source
    ) internal pure returns (bytes32 result) {
        bytes memory tempString = bytes(source);
        if (tempString.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    /**
     * @notice helper function to validate that an address is non-zero.
     * Reverts if the address is zero.
     * @param address_ address to validate
     */
    function _onlyNonZeroAddress(address address_) internal pure {
        require(address_ != address(0), "Must input non-zero address");
    }
}
