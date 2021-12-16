// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreV2_PBAB.sol";

pragma solidity 0.8.9;

contract GenArt721RoyaltyOverride_PBAB is ERC165, IArtblocksRoyaltyOverride {
    event PlatformRoyaltyAddressForContractUpdated(
        address indexed contractAddress,
        address payable indexed platformRoyaltyAddress
    );

    event RenderProviderBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    event PlatformBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    mapping(address => address payable)
        public platformRoyaltyAddressForContract;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    uint256 public renderProviderDefaultBps = 250; // 2.5 percent
    uint256 public platformDefaultBps = 250; // 2.5 percent
    mapping(address => BpsOverride) public renderProviderBpsOverrideForContract;
    mapping(address => BpsOverride) public platformBpsOverrideForContract;

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
     *  Update platform provider royalty payment address to be used
     *  for a specific token contract.
     */
    function updatePlatformRoyaltyAddressForContract(
        address _tokenContract,
        address payable _platformRoyaltyAddress
    ) external onlyAdminOnContract(_tokenContract) {
        platformRoyaltyAddressForContract[
            _tokenContract
        ] = _platformRoyaltyAddress;
        emit PlatformRoyaltyAddressForContractUpdated(
            _tokenContract,
            _platformRoyaltyAddress
        );
    }

    /**
     *  Update render provider royalty payment bps to be used
     *  for a specific token contract.
     */
    function updateRenderProviderBpsForContract(
        address _tokenContract,
        uint256 _bps
    ) external onlyAdminOnContract(_tokenContract) {
        require(_bps <= 10000, "invalid bps");
        renderProviderBpsOverrideForContract[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit RenderProviderBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     *  Update platform provider royalty payment bps to be used
     *  for a specific token contract.
     */
    function updatePlatformBpsForContract(address _tokenContract, uint256 _bps)
        external
        onlyAdminOnContract(_tokenContract)
    {
        require(_bps <= 10000, "invalid bps");
        platformBpsOverrideForContract[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit PlatformBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     *  Clear render provider royalty payment bps override to be used
     *  for a specific token contract.
     */
    function clearRenderProviderBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        renderProviderBpsOverrideForContract[_tokenContract] = BpsOverride(
            false,
            0
        ); // initial values
        emit RenderProviderBpsForContractUpdated(_tokenContract, false, 0);
    }

    /**
     *  Clear platform provider royalty payment bps override to be used
     *  for a specific token contract.
     */
    function clearPlatformBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        platformBpsOverrideForContract[_tokenContract] = BpsOverride(false, 0); // initial values
        emit PlatformBpsForContractUpdated(_tokenContract, false, 0);
    }

    function getRoyalties(address _tokenAddress, uint256 _tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps)
    {
        recipients_ = new address payable[](4);
        bps = new uint256[](4);
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
        // append platform provider royalty
        require(
            platformRoyaltyAddressForContract[_tokenAddress] != address(0),
            "Platform royalty address must be defined for contract"
        );
        recipients_[2] = platformRoyaltyAddressForContract[_tokenAddress];
        bps[2] = platformBpsOverrideForContract[_tokenAddress].useOverride
            ? platformBpsOverrideForContract[_tokenAddress].bps
            : platformDefaultBps;
        // append render provider royalty
        recipients_[3] = payable(
            IGenArt721CoreV2_PBAB(_tokenAddress).renderProviderAddress()
        );
        bps[3] = renderProviderBpsOverrideForContract[_tokenAddress].useOverride
            ? renderProviderBpsOverrideForContract[_tokenAddress].bps
            : renderProviderDefaultBps;
        return (recipients_, bps);
    }
}
