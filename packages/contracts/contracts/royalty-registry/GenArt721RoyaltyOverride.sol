// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../interfaces/v0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/v0.8.x/IGenArt721CoreContractV3.sol";

import "@openzeppelin-4.5/contracts/utils/introspection/ERC165.sol";

pragma solidity 0.8.9;

/**
 * @title Royalty Registry override for Art Blocks token contracts.
 * @author Art Blocks Inc.
 */
contract GenArt721RoyaltyOverride is ERC165, IArtblocksRoyaltyOverride {
    /**
     * @notice Art Blocks royalty payment address for `contractAddress`
     * updated to be `artblocksRoyaltyAddress`.
     */
    event ArtblocksRoyaltyAddressForContractUpdated(
        address indexed contractAddress,
        address payable indexed artblocksRoyaltyAddress
    );

    /**
     * @notice Art Blocks royalty payment basis points for `tokenAddress`
     * updated to be `bps` if `useOverride`, else updated to use default
     * BPS.
     */
    event ArtblocksBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    /// token contract => Art Blocks royalty payment address
    mapping(address => address payable)
        public tokenAddressToArtblocksRoyaltyAddress;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    /// Default Art Blocks royalty basis points if no BPS override is set.
    uint256 public constant ARTBLOCKS_DEFAULT_BPS = 250; // 2.5 percent
    /// token contract => if bps override is set, and bps value.
    mapping(address => BpsOverride) public tokenAddressToArtblocksBpsOverride;

    modifier onlyAdminOnContract(address _tokenContract) {
        require(
            IGenArt721CoreContractV3(_tokenContract).admin() == msg.sender,
            "Only core admin for specified token contract"
        );
        _;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165, IERC165) returns (bool) {
        return
            // register interface 0x9ca7dc7a - getRoyalties(address,uint256)
            interfaceId == type(IArtblocksRoyaltyOverride).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Updates Art Blocks royalty payment address for `_tokenContract`
     * to be `_artblocksRoyaltyAddress`.
     * @param _tokenContract Token contract to be updated.
     * @param _artblocksRoyaltyAddress Address to receive royalty payments.
     */
    function updateArtblocksRoyaltyAddressForContract(
        address _tokenContract,
        address payable _artblocksRoyaltyAddress
    ) external onlyAdminOnContract(_tokenContract) {
        tokenAddressToArtblocksRoyaltyAddress[
            _tokenContract
        ] = _artblocksRoyaltyAddress;
        emit ArtblocksRoyaltyAddressForContractUpdated(
            _tokenContract,
            _artblocksRoyaltyAddress
        );
    }

    /**
     * @notice Updates Art Blocks royalty payment BPS for `_tokenContract` to be
     * `_bps`.
     * @param _tokenContract Token contract to be updated.
     * @param _bps Art Blocks royalty basis points.
     * @dev `_bps` must be less than or equal to default bps
     */
    function updateArtblocksBpsForContract(
        address _tokenContract,
        uint256 _bps
    ) external onlyAdminOnContract(_tokenContract) {
        require(
            _bps <= ARTBLOCKS_DEFAULT_BPS,
            "override bps for contract must be less than or equal to default"
        );
        tokenAddressToArtblocksBpsOverride[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit ArtblocksBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     * @notice Clears any overrides of Art Blocks royalty payment BPS for
     *  `_tokenContract`.
     * @param _tokenContract Token contract to be cleared.
     * @dev token contracts without overrides use default BPS value.
     */
    function clearArtblocksBpsForContract(
        address _tokenContract
    ) external onlyAdminOnContract(_tokenContract) {
        tokenAddressToArtblocksBpsOverride[_tokenContract] = BpsOverride(
            false,
            0
        ); // initial values
        emit ArtblocksBpsForContractUpdated(_tokenContract, false, 0);
    }

    /**
     * @notice Gets royalites of token ID `_tokenId` on token contract
     * `_tokenAddress`.
     * @param _tokenAddress Token contract to be queried.
     * @param _tokenId Token ID to be queried.
     * @return recipients_ array of royalty recipients
     * @return bps array of basis points for each recipient, aligned by index
     */
    function getRoyalties(
        address _tokenAddress,
        uint256 _tokenId
    )
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
        ) = IGenArt721CoreContractV3(_tokenAddress).getRoyaltyData(_tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        // append art blocks royalty
        require(
            tokenAddressToArtblocksRoyaltyAddress[_tokenAddress] != address(0),
            "Art Blocks royalty address must be defined for contract"
        );
        recipients_[2] = tokenAddressToArtblocksRoyaltyAddress[_tokenAddress];
        bps[2] = tokenAddressToArtblocksBpsOverride[_tokenAddress].useOverride
            ? tokenAddressToArtblocksBpsOverride[_tokenAddress].bps
            : ARTBLOCKS_DEFAULT_BPS;
        return (recipients_, bps);
    }
}
