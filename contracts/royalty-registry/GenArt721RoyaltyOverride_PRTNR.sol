// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreV2_PBAB.sol";

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

pragma solidity 0.8.9;

/**
 * @title Royalty Registry override for Art Blocks PRTNR token contracts.
 * @author Art Blocks Inc.
 * @dev Designed to interface V2_PBAB core contract, with assumptions valid for
 * PRTNR setups: render provider address is populated, but platform address and
 * platform percentages are irrelevant.
 */
contract GenArt721RoyaltyOverride_PRTNR is ERC165, IArtblocksRoyaltyOverride {
    /**
     * @notice Render provider royalty payment basis points for `tokenAddress`
     * updated to be `bps` if `useOverride`, else updated to use default BPS.
     */
    event RenderProviderBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    /// token contract => Platform royalty payment address
    mapping(address => address payable)
        public tokenAddressToPlatformRoyaltyAddress;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    /// Default Render Provider royalty basis points if no BPS override is set.
    uint256 public constant RENDER_PROVIDER_DEFAULT_BPS = 250; // 2.5 percent
    /// token contract => if render provider bps override is set, and bps value.
    mapping(address => BpsOverride)
        public tokenAddressToRenderProviderBpsOverride;

    modifier onlyAdminOnContract(address _tokenContract) {
        require(
            IGenArt721CoreV2_PBAB(_tokenContract).admin() == msg.sender,
            "Only core admin for specified token contract"
        );
        _;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165, IERC165)
        returns (bool)
    {
        return
            // register interface 0x9ca7dc7a - getRoyalties(address,uint256)
            interfaceId == type(IArtblocksRoyaltyOverride).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Updates render provider royalty payment BPS for `_tokenContract`
     * to be `_bps`.
     * @param _tokenContract Token contract to be updated.
     * @param _bps Render provider royalty payment basis points.
     */
    function updateRenderProviderBpsForContract(
        address _tokenContract,
        uint256 _bps
    ) external onlyAdminOnContract(_tokenContract) {
        require(_bps <= 10000, "invalid bps");
        tokenAddressToRenderProviderBpsOverride[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit RenderProviderBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     * @notice Clears any overrides of render provider royalty payment BPS
     * for `_tokenContract`.
     * @param _tokenContract Token contract to be cleared.
     * @dev token contracts without overrides use default BPS value.
     */
    function clearRenderProviderBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        tokenAddressToRenderProviderBpsOverride[_tokenContract] = BpsOverride(
            false,
            0
        ); // initial values
        emit RenderProviderBpsForContractUpdated(_tokenContract, false, 0);
    }

    /**
     * @notice Gets royalites of token ID `_tokenId` on token contract
     * `_tokenAddress`.
     * @param _tokenAddress Token contract to be queried.
     * @param _tokenId Token ID to be queried.
     * @return recipients_ array of royalty recipients
     * @return bps array of basis points for each recipient, aligned by index
     */
    function getRoyalties(address _tokenAddress, uint256 _tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps)
    {
        recipients_ = new address payable[](3);
        bps = new uint256[](3);
        // get standard royalty data for artist and additional payee
        (
            address artistAddress,
            address additionalPayee,
            uint256 additionalPayeePercentage,
            uint256 royaltyFeeByID
        ) = IGenArt721CoreV2_PBAB(_tokenAddress).getRoyaltyData(_tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        // render provider royalty
        recipients_[2] = payable(
            IGenArt721CoreV2_PBAB(_tokenAddress).renderProviderAddress()
        );
        bps[2] = tokenAddressToRenderProviderBpsOverride[_tokenAddress]
            .useOverride
            ? tokenAddressToRenderProviderBpsOverride[_tokenAddress].bps
            : RENDER_PROVIDER_DEFAULT_BPS;
        return (recipients_, bps);
    }
}
