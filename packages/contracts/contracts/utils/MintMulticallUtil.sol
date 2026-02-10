// SPDX-License-Identifier: MIT
// !!!!! EXPERIMENTAL CONTRACT - NOT FOR PRODUCTION USE !!!!!
// USE AT YOUR OWN RISK. THIS CONTRACT HAS NOT BEEN AUDITED.
// Art Blocks Inc. assumes no liability for any loss or damage arising from use
// of this contract.

pragma solidity 0.8.22;

import {Ownable} from "@openzeppelin-5.0/contracts/access/Ownable.sol";

/// @notice Minimal interface for MinterSetPriceV5 purchaseTo function
/// @dev Only the purchaseTo function is needed for this utility
interface IMinterSetPriceV5 {
    function purchaseTo(
        address to,
        uint256 projectId,
        address coreContract
    ) external payable returns (uint256 tokenId);
}

/**
 * @title MintMulticallUtil
 * @author Art Blocks Inc.
 * @notice EXPERIMENTAL - NOT FOR PRODUCTION USE - USE AT YOUR OWN RISK
 * @dev A personal "multicall" utility contract for MinterSetPriceV5.
 * Enables a single transaction to call `purchaseTo` on the minter N times,
 * effectively batching multiple mints into one transaction.
 *
 * WARNING: This contract is experimental and has not been audited. It is
 * provided as-is with no guarantees. Use at your own risk.
 */
contract MintMulticallUtil is Ownable {
    /// @notice Emitted after each successful mint
    /// @param tokenId The token ID of the newly minted token
    /// @param to The address that received the minted token
    event TokenMinted(uint256 indexed tokenId, address indexed to);

    /// @notice Error thrown when array length does not match numMints
    error ArrayLengthMismatch();
    /// @notice Error thrown when numMints is zero
    error ZeroMints();
    /// @notice Error thrown when a refund transfer fails
    error RefundFailed();

    /**
     * @notice Constructor sets the owner of this contract.
     * @param owner_ The address that will own this contract and be
     * authorized to call purchaseToMulti.
     */
    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Calls purchaseTo on the given minter contract `numMints` times
     * in a single transaction.
     * @dev Only callable by the contract owner. Forwards equal shares of
     * msg.value to each purchaseTo call. Any remaining ETH after all mints
     * is refunded to the caller.
     * @param minter The MinterSetPriceV5 contract address to call
     * purchaseTo on.
     * @param numMints The number of tokens to mint.
     * @param toAddresses An array of addresses to mint tokens to, with
     * length equal to numMints.
     * @param projectId The project ID on the core contract to mint from.
     * @param coreContract The Art Blocks core contract address.
     */
    function purchaseToMulti(
        address minter,
        uint256 numMints,
        address[] calldata toAddresses,
        uint256 projectId,
        address coreContract
    ) external payable onlyOwner {
        if (numMints == 0) {
            revert ZeroMints();
        }
        if (toAddresses.length != numMints) {
            revert ArrayLengthMismatch();
        }

        uint256 pricePerMint = msg.value / numMints;

        for (uint256 i = 0; i < numMints; ) {
            uint256 tokenId = IMinterSetPriceV5(minter).purchaseTo{value: pricePerMint}(
                toAddresses[i],
                projectId,
                coreContract
            );

            emit TokenMinted(tokenId, toAddresses[i]);

            unchecked {
                ++i;
            }
        }

        // Refund any remaining ETH (from rounding)
        uint256 remaining = address(this).balance;
        if (remaining > 0) {
            (bool success, ) = payable(msg.sender).call{value: remaining}("");
            if (!success) {
                revert RefundFailed();
            }
        }
    }
}
