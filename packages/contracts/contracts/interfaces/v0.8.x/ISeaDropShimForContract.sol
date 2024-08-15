// SPDX-License-Identifier: MIT

// @dev file adds event for indicating a shim contract compatible with SeaDrop, and points to the corresponding NFT
// contract
pragma solidity ^0.8.22;

interface ISeaDropShimForContract {
    /**
     * @dev Emit event when a shim-minter compatible with SeaDrop that mints tokens on a different contract is deployed
     */
    event SeaDropShimForContract(address nftContract);
}
