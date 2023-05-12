// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../interfaces/0.8.x/IMinterFilterV1.sol";

pragma solidity 0.8.19;

/**
 * @title NON-PRODUCTION shared minter used for testing purposes only.
 * In general, this is intended to integrate with IMinterFilterV1, and should
 * be used for integration testing purposes only.
 * @author Art Blocks Inc.
 */
contract DummySharedMinter {
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "DummyMinter";

    /// minter version for this minter
    string public constant minterVersion = "v0.0.0";

    uint256 constant ONE_MILLION = 1_000_000;

    function _onlyArtist(
        uint256 _projectId,
        address _coreContract
    ) internal view {
        require(
            msg.sender ==
                IGenArt721CoreContractV3_Base(_coreContract)
                    .projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`.
     * @param _minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(address _minterFilter) {
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV1(_minterFilter);
    }

    function purchase(
        uint256 _projectId,
        address _coreContract
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo(msg.sender, _projectId, _coreContract);
        return tokenId;
    }

    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract
    ) public payable returns (uint256 tokenId) {
        tokenId = minterFilter.mint_joo(
            _to,
            _projectId,
            _coreContract,
            msg.sender
        );
        // intentionally does not split funds to keep this dummy minter simple
        return tokenId;
    }
}
