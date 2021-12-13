// SPDX-License-Identifier: LGPL-3.0-only
// Creatd By: Art Blocks Inc.

import "../libs/0.8.x/ERC165.sol";

import "../interfaces/0.8.x/IArtblocksRoyaltyOverride.sol";
import "../interfaces/0.8.x/IGenArt721CoreContract.sol";

pragma solidity 0.8.9;

contract GenArt721RoyaltyOverride is ERC165, IArtblocksRoyaltyOverride {
    event AdminCoreContractUpdated(address indexed adminCoreContract);

    event RenderProviderDefaultPaymentAddressUpdated(
        address payable indexed renderProviderPaymentAddress
    );

    event RenderProviderPaymentAddressForContractUpdated(
        address indexed contractAddress,
        address payable indexed renderProviderPaymentAddress
    );

    event RenderProviderPaymentAddressForProjectUpdated(
        address indexed contractAddress,
        uint256 indexed projectNumber,
        address payable indexed renderProviderPaymentAddress
    );

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

    /**
     *  delegate authority to change AB royalty payment address and
     *  change admin core contract to a core contract's admin.
     */
    IGenArt721CoreContract public adminCoreContract;

    address payable public renderProviderDefaultPaymentAddress;
    mapping(address => address payable)
        public renderProviderPaymentAddressForContract;
    mapping(address => mapping(uint256 => address payable))
        public renderProviderPaymentAddressForProject;

    struct BpsOverride {
        bool useOverride;
        uint256 bps;
    }

    uint256 public renderProviderDefaultBps = 250; // 2.5 percent
    mapping(address => BpsOverride) public renderProviderBpsOverrideForContract;
    mapping(address => mapping(uint256 => BpsOverride))
        public renderProviderBpsOverrideForProject;

    uint256 constant ONE_MILLION = 1_000_000;

    modifier onlyAdmin() {
        require(adminCoreContract.admin() == msg.sender, "Only core admin");
        _;
    }

    modifier onlyAdminOnContract(address _tokenContract) {
        require(
            IGenArt721CoreContract(_tokenContract).admin() == msg.sender,
            "Only core admin for specified token contract"
        );
        _;
    }

    constructor(
        address _adminCoreContract,
        address payable _renderProviderDefaultPaymentAddress
    ) {
        _setAdminCoreContract(_adminCoreContract);
        _setRenderProviderDefaultPaymentAddress(_renderProviderDefaultPaymentAddress);
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
     *  This may be called by an admin address on the current
     *  adminCoreContract to update to a new core contract's admin.
     */
    function updateAdminCoreContract(address _adminCoreContract)
        external
        onlyAdmin
    {
        _setAdminCoreContract(_adminCoreContract);
    }

    function _setAdminCoreContract(address _adminCoreContract) private {
        adminCoreContract = IGenArt721CoreContract(_adminCoreContract);
        emit AdminCoreContractUpdated(_adminCoreContract);
    }

    /**
     *  This may be called by an admin address on the current
     *  adminCoreContract to route AB royalties to a new default address.
     */
    function updateRenderProviderDefaultPaymentAddress(
        address payable _renderProviderDefaultPaymentAddress
    ) external onlyAdmin {
        _setRenderProviderDefaultPaymentAddress(_renderProviderDefaultPaymentAddress);
    }

    function _setRenderProviderDefaultPaymentAddress(
        address payable _renderProviderDefaultPaymentAddress
    ) private {
        renderProviderDefaultPaymentAddress = _renderProviderDefaultPaymentAddress;
        emit RenderProviderDefaultPaymentAddressUpdated(
            renderProviderDefaultPaymentAddress
        );
    }

    /**
     *  Update render provider royalty payment address to be used
     *  for a specific token contract.
     */
    function updateRenderProviderPaymentAddressForContract(
        address _tokenContract,
        address payable _renderProviderPaymentAddress
    ) external onlyAdminOnContract(_tokenContract) {
        renderProviderPaymentAddressForContract[
            _tokenContract
        ] = _renderProviderPaymentAddress;
        emit RenderProviderPaymentAddressForContractUpdated(
            _tokenContract,
            _renderProviderPaymentAddress
        );
    }

    /**
     *  Update render provider royalty payment address to be used
     *  for a specific project on a specific token contract.
     */
    function updateRenderProviderPaymentAddressForProject(
        address _tokenContract,
        uint256 _projectNumber,
        address payable _renderProviderPaymentAddress
    ) external onlyAdminOnContract(_tokenContract) {
        renderProviderPaymentAddressForProject[_tokenContract][
            _projectNumber
        ] = _renderProviderPaymentAddress;
        emit RenderProviderPaymentAddressForProjectUpdated(
            _tokenContract,
            _projectNumber,
            _renderProviderPaymentAddress
        );
    }

    /**
     *  Update render provider royalty payment bps to be used
     *  for a specific token contract.
     *  Must be less than or equal to default bps.
     */
    function updateRenderProviderBpsForContract(address _tokenContract, uint256 _bps)
        external
        onlyAdminOnContract(_tokenContract)
    {
        require(
            _bps <= renderProviderDefaultBps,
            "override bps for contract must be less than default"
        );
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
        // prevent admin from rugging a project
        require(
            _bps <= renderProviderDefaultBps,
            "override bps for project must be less than default"
        );
        require(
            !renderProviderBpsOverrideForContract[_tokenContract].useOverride ||
                _bps <= renderProviderBpsOverrideForContract[_tokenContract].bps,
            "override bps for project must be less than default for contract"
        );
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

    function getRenderProviderPaymentAddress(address _tokenAddress, uint256 _tokenId)
        public
        view
        returns (address payable renderProviderPaymentAddress)
    {
        uint256 _projectNumber = _tokenId / (ONE_MILLION);
        // use project override if specified
        if (
            renderProviderPaymentAddressForProject[_tokenAddress][_projectNumber] !=
            address(0)
        ) {
            return
                renderProviderPaymentAddressForProject[_tokenAddress][
                    _projectNumber
                ];
        }
        // use contract override if specified
        if (renderProviderPaymentAddressForContract[_tokenAddress] != address(0)) {
            return renderProviderPaymentAddressForContract[_tokenAddress];
        }
        // default
        return renderProviderDefaultPaymentAddress;
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
        ) = IGenArt721CoreContract(_tokenAddress).getRoyaltyData(_tokenId);
        // translate to desired output
        recipients_[0] = payable(artistAddress);
        bps[0] = (uint256(100) - additionalPayeePercentage) * royaltyFeeByID;
        recipients_[1] = payable(additionalPayee);
        bps[1] = additionalPayeePercentage * royaltyFeeByID;
        // append render provider royalty
        recipients_[2] = getRenderProviderPaymentAddress(_tokenAddress, _tokenId);
        bps[2] = getRenderProviderRoyaltyBps(_tokenAddress, _tokenId);
        return (recipients_, bps);
    }
}
