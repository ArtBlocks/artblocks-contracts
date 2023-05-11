// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.19;

import {GasLimitReceiverMock} from "./GasLimitReceiverMock.sol";

/**
 * @notice This reverts when receiving Ether.
 * Also exposes a createBidOnAuction function to create a bid on an auction
 * of a serial English auction minter.
 * @dev Mock contract for testing purposes.
 */
contract GasLimitReceiverBidderMock is GasLimitReceiverMock {
    function createBidOnAuction(
        address minter,
        uint256 tokenId
    ) external payable {
        (bool success, ) = minter.call{value: msg.value}(
            abi.encodeWithSignature("createBid(uint256)", tokenId)
        );
        require(success, "GasLimitReceiverBidderMock: call failed");
    }
}
