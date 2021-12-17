// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

contract GenArt721RoyaltyOverride is ERC165, IArtblocksRoyaltyOverride {
    event ArtblocksRoyaltyAddressForContractUpdated(
        address indexed contractAddress,
        address payable indexed artblocksRoyaltyAddress
    );

    event ArtblocksBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    mapping(address => address payable)
        public artblocksRoyaltyAddressForContract;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    uint256 public artblocksDefaultBps = 250; // 2.5 percent
    mapping(address => BpsOverride) public artblocksBpsOverrideForContract;

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
    function updateArtblocksRoyaltyAddressForContract(
        address _tokenContract,
        address payable _artblocksRoyaltyAddress
    ) external onlyAdminOnContract(_tokenContract) {
        artblocksRoyaltyAddressForContract[
            _tokenContract
        ] = _artblocksRoyaltyAddress;
        emit ArtblocksRoyaltyAddressForContractUpdated(
            _tokenContract,
            _artblocksRoyaltyAddress
        );
    }

    /**
     *  Update art blocks royalty payment bps to be used
     *  for a specific token contract.
     *  Must be less than or equal to default bps.
     */
    function updateArtblocksBpsForContract(address _tokenContract, uint256 _bps)
        external
        onlyAdminOnContract(_tokenContract)
    {
        require(
            _bps <= artblocksDefaultBps,
            "override bps for contract must be less than or equal to default"
        );
        artblocksBpsOverrideForContract[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit ArtblocksBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     *  Clear art blocks royalty payment bps override to be used
     *  for a specific token contract.
     */
    function clearArtblocksBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        artblocksBpsOverrideForContract[_tokenContract] = BpsOverride(false, 0); // initial values
        emit ArtblocksBpsForContractUpdated(_tokenContract, false, 0);
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
            artblocksRoyaltyAddressForContract[_tokenAddress] != address(0),
            "Art Blocks royalty address must be defined for contract"
        );
        recipients_[2] = artblocksRoyaltyAddressForContract[_tokenAddress];
        bps[2] = artblocksBpsOverrideForContract[_tokenAddress].useOverride
            ? artblocksBpsOverrideForContract[_tokenAddress].bps
            : artblocksDefaultBps;
        return (recipients_, bps);
    }
}
