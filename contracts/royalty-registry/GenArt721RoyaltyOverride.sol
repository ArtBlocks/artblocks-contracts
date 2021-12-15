// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

contract GenArt721RoyaltyOverride is ERC165, IArtblocksRoyaltyOverride {
    event ArtBlocksRoyaltyAddressForContractUpdated(
        address indexed contractAddress,
        address payable indexed artBlocksRoyaltyAddress
    );

    event ArtBlocksBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    mapping(address => address payable)
        public artBlocksRoyaltyAddressForContract;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    uint256 public artBlocksDefaultBps = 250; // 2.5 percent
    mapping(address => BpsOverride) public artBlocksBpsOverrideForContract;

    modifier onlyAdminOnContract(address _tokenContract) {
        require(
            IGenArt721CoreContract(_tokenContract).admin() == msg.sender,
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
     *  Update art blocks royalty payment address to be used
     *  for a specific token contract.
     */
    function updateArtBlocksRoyaltyAddressForContract(
        address _tokenContract,
        address payable _artBlocksRoyaltyAddress
    ) external onlyAdminOnContract(_tokenContract) {
        artBlocksRoyaltyAddressForContract[
            _tokenContract
        ] = _artBlocksRoyaltyAddress;
        emit ArtBlocksRoyaltyAddressForContractUpdated(
            _tokenContract,
            _artBlocksRoyaltyAddress
        );
    }

    /**
     *  Clear art blocks royalty payment address to be used
     *  for a specific token contract.
     */
    function clearArtBlocksRoyaltyAddressForContract(
        address _tokenContract
    ) external onlyAdminOnContract(_tokenContract) {
        artBlocksRoyaltyAddressForContract[_tokenContract] = payable(
            address(0)
        );
        emit ArtBlocksRoyaltyAddressForContractUpdated(
            _tokenContract,
            payable(address(0))
        );
    }

    /**
     *  Update art blocks royalty payment bps to be used
     *  for a specific token contract.
     *  Must be less than or equal to default bps.
     */
    function updateArtBlocksBpsForContract(
        address _tokenContract,
        uint256 _bps
    ) external onlyAdminOnContract(_tokenContract) {
        require(
            _bps <= artBlocksDefaultBps,
            "override bps for contract must be less than default"
        );
        artBlocksBpsOverrideForContract[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit ArtBlocksBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     *  Clear art blocks royalty payment bps override to be used
     *  for a specific token contract.
     */
    function clearArtBlocksBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        artBlocksBpsOverrideForContract[_tokenContract] = BpsOverride(
            false,
            0
        ); // initial values
        emit ArtBlocksBpsForContractUpdated(_tokenContract, false, 0);
    }

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
        ) = IGenArt721CoreContract(_tokenAddress).getRoyaltyData(_tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        // append art blocks royalty
        require(
            artBlocksRoyaltyAddressForContract[_tokenAddress] !=
                address(0),
            "Art Blocks royalty address must be defined for contract"
        );
        recipients_[2] = artBlocksRoyaltyAddressForContract[_tokenAddress];
        bps[2] = artBlocksBpsOverrideForContract[_tokenAddress].useOverride
            ? artBlocksBpsOverrideForContract[_tokenAddress].bps
            : artBlocksDefaultBps;
        return (recipients_, bps);
    }
}
