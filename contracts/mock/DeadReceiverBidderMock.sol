// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.20;

import {DeadReceiverMock} from "./DeadReceiverMock.sol";

/**
 * @notice This reverts when receiving Ether.
 * Also exposes a createBidOnAuction function to create a bid on an auction
 * of a serial English auction minter.
 * @dev Mock contract for testing purposes.
 */
contract DeadReceiverBidderMock is DeadReceiverMock {
    function createBidOnAuction(
        address minter,
        uint256 tokenId
    ) external payable {
        (bool success, ) = minter.call{value: msg.value}(
            abi.encodeWithSignature("createBid(uint256)", tokenId)
        );
        require(success, "DeadReceiverBidderMock: call failed");
    }
}
