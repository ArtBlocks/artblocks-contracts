// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IMultiContractRoyaltyOverride.sol";
import "../interfaces/0.8.x/IArtblocksRoyaltyRegistryOverride.sol";
import "../interfaces/0.8.x/IOwnedByArtblocksContractUpdateable.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

contract ArtblocksRoyaltyRegistryOverride is
    ERC165,
    IOwnedByArtblocksContractUpdateable,
    IArtblocksRoyaltyRegistryOverride
{
    event ArtblocksRoyaltyPaymentAddressUpdated(
        address payable indexed artblocksRoyaltyPaymentAddress
    );

    event DefaultArtblocksRoyaltyBpsUpdated(uint256 indexed bps);

    event OverrideArtblocksRoyaltyBpsUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 indexed bps
    );

    IGenArt721CoreContract public artblocksContract;

    address payable public artblocksRoyaltyPaymentAddress;
    uint256 public defaultArtblocksRoyaltyBps;
    mapping(address => bool) public useArtblocksRoyaltyBpsOverride;
    mapping(address => uint256) private artblocksRoyaltyBpsOverride;

    modifier onlyCoreWhitelisted() {
        require(
            artblocksContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
        );
        _;
    }

    constructor(
        address _genArt721Address,
        address payable _artblocksRoyaltyPaymentAddress
    ) {
        // delegate whitelisting logic to artblocksContract
        _setArtblocksContract(_genArt721Address);
        // set default artblocks royalty payment address and bps
        _setArtblocksRoyaltyPaymentAddress(_artblocksRoyaltyPaymentAddress);
        _setDefaultArtblocksRoyaltyBps(250); // 2.5 percent
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    // register interface 0x9ca7dc7a - getRoyalties(address,uint256)
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165)
        returns (bool)
    {
        return
            interfaceId == type(IMultiContractRoyaltyOverride).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function updateArtblocksContract(address _genArt721Address)
        external
        onlyCoreWhitelisted
    {
        // delegate whitelisting logic to artblocksContract
        _setArtblocksContract(_genArt721Address);
    }

    function _setArtblocksContract(address _genArt721Address) private {
        artblocksContract = IGenArt721CoreContract(_genArt721Address);
        emit ArtblocksContractUpdated(_genArt721Address);
    }

    function updateArtblocksRoyaltyPaymentAddress(
        address payable _artblocksRoyaltyPaymentAddress
    ) external onlyCoreWhitelisted {
        _setArtblocksRoyaltyPaymentAddress(_artblocksRoyaltyPaymentAddress);
    }

    function _setArtblocksRoyaltyPaymentAddress(
        address payable _artblocksRoyaltyPaymentAddress
    ) private {
        artblocksRoyaltyPaymentAddress = _artblocksRoyaltyPaymentAddress;
        emit ArtblocksRoyaltyPaymentAddressUpdated(
            _artblocksRoyaltyPaymentAddress
        );
    }

    function updateDefaultArtblocksRoyaltyBps(uint256 _bps)
        external
        onlyCoreWhitelisted
    {
        _setDefaultArtblocksRoyaltyBps(_bps);
    }

    function _setDefaultArtblocksRoyaltyBps(uint256 _bps) private {
        require(_bps <= 10_000, "bps must be less than 10_000");
        defaultArtblocksRoyaltyBps = _bps;
        emit DefaultArtblocksRoyaltyBpsUpdated(_bps);
    }

    // override the default artblocks bps for token contract at _tokenAddress
    function overrideArtblocksRoyaltyBps(address _tokenAddress, uint256 _bps)
        external
        onlyCoreWhitelisted
    {
        require(_bps <= 10_000, "bps must be less than 10_000");
        useArtblocksRoyaltyBpsOverride[_tokenAddress] = true;
        artblocksRoyaltyBpsOverride[_tokenAddress] = _bps;
        emit OverrideArtblocksRoyaltyBpsUpdated(_tokenAddress, true, _bps);
    }

    // clear override for token contract at _tokenAddress
    function clearArtblocksRoyaltyBpsOverride(address _tokenAddress)
        external
        onlyCoreWhitelisted
    {
        useArtblocksRoyaltyBpsOverride[_tokenAddress] = false;
        // not used, set bps mapping to uint256 initial value
        artblocksRoyaltyBpsOverride[_tokenAddress] = 0;
        emit OverrideArtblocksRoyaltyBpsUpdated(_tokenAddress, false, 0);
    }

    function getArtblocksRoyaltyBps(address _tokenAddress)
        public
        view
        override
        returns (uint256 bps)
    {
        if (useArtblocksRoyaltyBpsOverride[_tokenAddress]) {
            return artblocksRoyaltyBpsOverride[_tokenAddress];
        }
        return defaultArtblocksRoyaltyBps;
    }

    function getRoyalties(address tokenAddress, uint256 tokenId)
        external
        view
        returns (address payable[] memory recipients_, uint256[] memory bps)
    {
        // get standard AB Royalty Info
        (
            address artistAddress,
            address additionalPayee,
            uint256 additionalPayeePercentage,
            uint256 royaltyFeeByID
        ) = IGenArt721CoreContract(tokenAddress).getRoyaltyData(tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        recipients_[2] = payable(artblocksRoyaltyPaymentAddress);
        bps[2] = getArtblocksRoyaltyBps(tokenAddress);
        return (recipients_, bps);
    }
}
