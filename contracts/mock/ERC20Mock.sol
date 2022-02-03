// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libs/0.8.x/ERC20.sol";

contract MockToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, initialSupply);
    }
}
