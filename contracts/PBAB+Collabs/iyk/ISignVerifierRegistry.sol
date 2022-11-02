// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin-4.5/contracts/utils/introspection/IERC165.sol";

interface ISignVerifierRegistry is IERC165 {
    /**
     * @dev Emitted upon the registration of `signVerifier` to a previously unregistered ID `id`.
     */
    event Register(bytes32 id, address signVerifier);

    /**
     * @dev Emitted upon the update of `signVerifier` to a previously unregistered ID `id`, replacing `oldSignVerifier`.
     */
    event Update(bytes32 id, address signVerifier, address oldSignVerifier);

    function register(bytes32 id, address signVerifier) external;

    function update(bytes32 id, address signVerifier) external;

    function get(bytes32 id) external view returns (address);
}
