// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {ABHelpers} from "../libs/v0.8.x/ABHelpers.sol";
import {IArtblocksRoyaltyOverride} from "../interfaces/v0.8.x/IArtblocksRoyaltyOverride.sol";

import {Ownable} from "@openzeppelin-5.0/contracts/access/Ownable.sol";
import {ERC165, IERC165} from "@openzeppelin-5.0/contracts/utils/introspection/ERC165.sol";

/**
 * @title GenArt721RoyaltyOverrideSplits
 * @author Art Blocks Inc.
 * @notice Royalty Registry override contract that maps each
 * (core contract, project) pair to a royalty configuration consisting of
 * a splitter address and a BPS value. All configuration is managed by a
 * single owner.
 */
contract GenArt721RoyaltyOverrideSplits is
    ERC165,
    IArtblocksRoyaltyOverride,
    Ownable
{
    using ABHelpers for uint256;

    uint16 public constant MAX_BPS = 10000;

    /**
     * @notice Royalty configuration for a single project.
     * @dev Packed into a single storage slot (20 + 2 = 22 bytes).
     * @param splitter Address of the royalty splitter contract.
     * @param bps Royalty basis points (0–10000).
     */
    struct RoyaltyConfig {
        address splitter;
        uint16 bps;
    }

    /**
     * @notice Royalty configuration for a project has been updated.
     * @dev A splitter of address(0) with bps of 0 indicates the project
     * has been unconfigured.
     */
    event RoyaltyConfigUpdated(
        address indexed coreContract,
        uint256 indexed projectId,
        address splitter,
        uint16 bps
    );

    /// core contract => project ID => royalty configuration
    mapping(address coreContract => mapping(uint256 projectId => RoyaltyConfig config))
        public royaltyConfigs;

    constructor(address owner_) Ownable(owner_) {}

    /**
     * @notice Sets the royalty configuration for a given core contract and
     * project.
     * @param coreContract Core contract address.
     * @param projectId Project ID on the core contract.
     * @param splitter Address of the royalty splitter contract. Must not be
     * the zero address.
     * @param bps Royalty basis points (0–10000).
     */
    function setRoyaltyConfig(
        address coreContract,
        uint256 projectId,
        address splitter,
        uint16 bps
    ) external onlyOwner {
        require(splitter != address(0), "Must not be zero address");
        require(bps <= MAX_BPS, "Exceeds max BPS");
        royaltyConfigs[coreContract][projectId] = RoyaltyConfig(splitter, bps);
        emit RoyaltyConfigUpdated(coreContract, projectId, splitter, bps);
    }

    /**
     * @notice Removes the royalty configuration for a given core contract and
     * project.
     * @param coreContract Core contract address.
     * @param projectId Project ID on the core contract.
     */
    function removeRoyaltyConfig(
        address coreContract,
        uint256 projectId
    ) external onlyOwner {
        delete royaltyConfigs[coreContract][projectId];
        emit RoyaltyConfigUpdated(coreContract, projectId, address(0), 0);
    }

    /**
     * @notice Gets royalties for token `tokenId` on contract `tokenAddress`.
     * Returns the configured splitter as the sole recipient with the
     * configured BPS. Reverts if no splitter is configured, causing the
     * Royalty Registry to fall through to other lookup methods.
     * @param tokenAddress Token contract to be queried.
     * @param tokenId Token ID to be queried.
     * @return recipients_ Single-element array with the splitter address.
     * @return bps Single-element array with the configured BPS value.
     */
    function getRoyalties(
        address tokenAddress,
        uint256 tokenId
    )
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps)
    {
        uint256 projectId = tokenId.tokenIdToProjectId();
        RoyaltyConfig storage config = royaltyConfigs[tokenAddress][projectId];
        require(config.splitter != address(0), "No royalty configured");
        recipients_ = new address payable[](1);
        bps = new uint256[](1);
        recipients_[0] = payable(config.splitter);
        bps[0] = config.bps;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IArtblocksRoyaltyOverride).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
