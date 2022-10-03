// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract SignVerifierRegistryMock {
    mapping(bytes32 => address) signVerifiers;

    constructor() {}

    function register(bytes32 id, address signVerifier) public {
        signVerifiers[id] = signVerifier;
    }

    function get(bytes32 id) public view returns (address) {
        return signVerifiers[id];
    }
}
