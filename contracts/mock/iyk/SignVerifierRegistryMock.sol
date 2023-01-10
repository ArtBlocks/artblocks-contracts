// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../../PBAB+Collabs/9dcc-iyk/ISignVerifierRegistry.sol";
import "@openzeppelin-4.5/contracts/utils/introspection/ERC165.sol";

contract SignVerifierRegistryMock is ERC165, ISignVerifierRegistry {
    mapping(bytes32 => address) signVerifiers;

    constructor() {}

    function register(bytes32 id, address signVerifier) public {
        signVerifiers[id] = signVerifier;
    }

    function update(bytes32 id, address signVerifier) public {
        signVerifiers[id] = signVerifier;
    }

    function get(bytes32 id) public view returns (address) {
        return signVerifiers[id];
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(IERC165, ERC165) returns (bool) {
        return
            interfaceId == type(ISignVerifierRegistry).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
