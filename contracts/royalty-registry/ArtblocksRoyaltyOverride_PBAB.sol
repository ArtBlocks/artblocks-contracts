// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreV2_PBAB.sol";

pragma solidity 0.8.9;

contract ArtblocksRoyaltyOverride_PBAB is ERC165, IArtblocksRoyaltyOverride {
    event RenderProviderBpsForContractUpdated(
        address indexed tokenAddress,
        bool indexed useOverride,
        uint256 bps
    );

    event RenderProviderBpsForProjectUpdated(
        address indexed tokenAddress,
        uint256 indexed projectNumber,
        bool indexed useOverride,
        uint256 bps
    );

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    uint256 public renderProviderDefaultBps = 250; // 2.5 percent
    mapping(address => BpsOverride) public renderProviderBpsOverrideForContract;
    mapping(address => mapping(uint256 => BpsOverride))
        public renderProviderBpsOverrideForProject;

    uint256 constant ONE_MILLION = 1_000_000;

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
     *  Update render provider royalty payment bps to be used
     *  for a specific token contract.
     */
    function updateRenderProviderBpsForContract(address _tokenContract, uint256 _bps)
        external
        onlyAdminOnContract(_tokenContract)
    {
        renderProviderBpsOverrideForContract[_tokenContract] = BpsOverride(
            true,
            _bps
        );
        emit RenderProviderBpsForContractUpdated(_tokenContract, true, _bps);
    }

    /**
     *  Update render provider royalty payment bps to be used
     *  for a specific project.
     *  Must be less than or equal to default bps.
     */
    function updateRenderProviderBpsForProject(
        address _tokenContract,
        uint256 _projectNumber,
        uint256 _bps
    ) external onlyAdminOnContract(_tokenContract) {
        renderProviderBpsOverrideForProject[_tokenContract][
            _projectNumber
        ] = BpsOverride(true, _bps);
        emit RenderProviderBpsForProjectUpdated(
            _tokenContract,
            _projectNumber,
            true,
            _bps
        );
    }

    /**
     *  Clear render provider royalty payment bps override to be used
     *  for a specific token contract.
     */
    function clearRenderProviderBpsForContract(address _tokenContract)
        external
        onlyAdminOnContract(_tokenContract)
    {
        renderProviderBpsOverrideForContract[_tokenContract] = BpsOverride(false, 0); // initial values
        emit RenderProviderBpsForContractUpdated(_tokenContract, false, 0);
    }

    /**
     *  Clear render provider royalty payment bps to be used
     *  for a specific project.
     */
    function clearRenderProviderBpsForProject(
        address _tokenContract,
        uint256 _projectNumber
    ) external onlyAdminOnContract(_tokenContract) {
        renderProviderBpsOverrideForProject[_tokenContract][
            _projectNumber
        ] = BpsOverride(false, 0); // initial values
        emit RenderProviderBpsForProjectUpdated(
            _tokenContract,
            _projectNumber,
            false,
            0
        );
    }

    function getRenderProviderRoyaltyBps(address _tokenAddress, uint256 _tokenId)
        public
        view
        returns (uint256 bps)
    {
        uint256 _projectNumber = _tokenId / (ONE_MILLION);
        // use project override if specified
        if (
            renderProviderBpsOverrideForProject[_tokenAddress][_projectNumber]
                .useOverride
        ) {
            return
                renderProviderBpsOverrideForProject[_tokenAddress][_projectNumber]
                    .bps;
        }
        // use contract override if specified
        if (renderProviderBpsOverrideForContract[_tokenAddress].useOverride) {
            return renderProviderBpsOverrideForContract[_tokenAddress].bps;
        }
        // default
        return renderProviderDefaultBps;
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
        ) = IGenArt721CoreV2_PBAB(_tokenAddress).getRoyaltyData(_tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        // append render provider royalty
        recipients_[2] = payable(IGenArt721CoreV2_PBAB(_tokenAddress).renderProviderAddress());
        bps[2] = getRenderProviderRoyaltyBps(_tokenAddress, _tokenId);
        return (recipients_, bps);
    }
}
