// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin-4.5/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    // add a banned address to enable testing of unsuccessful transfers
    address public bannedReceiver;

    constructor(uint256 initialSupply) ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, initialSupply);
    }

    function updateBannedAddress(address account) external {
        bannedReceiver = account;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(to != bannedReceiver, "ERC20Mock: transfer to banned address");
        super._afterTokenTransfer(from, to, amount);
    }
}
