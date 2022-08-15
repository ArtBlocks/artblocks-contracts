// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/0.8.x/IGenArt721CoreContractV3.sol";
import "../../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../../interfaces/0.8.x/IFilteredMinterMerkleV0.sol";

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.9;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH
 * for addresses in a Merkle allowlist.
 * This is designed to be used with IGenArt721CoreContractV3 contracts.
 * @author Art Blocks Inc.
 */
contract MinterMerkleV1 is ReentrancyGuard, IFilteredMinterMerkleV0 {
    using MerkleProof for bytes32[];

    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// This contract handles cores with interface IV3
    IGenArt721CoreContractV3 private immutable genArtCoreContract;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterMerkleV1";

    /// project minter configuration keys used by this minter
    bytes32 private constant CONFIG_MERKLE_ROOT = "merkleRoot";
    bytes32 private constant CONFIG_MINT_LIMITER_DISABLED =
        "mintLimiterDisabled";

    uint256 constant ONE_MILLION = 1_000_000;

    /// projectId => merkle root
    mapping(uint256 => bytes32) public projectMerkleRoot;
    /// projectId => purchaser address => has purchased one or more mints
    mapping(uint256 => mapping(address => bool)) public projectMintedBy;
    /// projectId => are addresses limited to one mint each?
    /// (default behavior is limit one mint per address)
    mapping(uint256 => bool) public projectMintLimiterDisabled;
    /// projectId => has project reached its maximum number of invocations?
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    /// projectId => project's maximum number of invocations
    mapping(uint256 => uint256) public projectMaxInvocations;
    /// projectId => price per token in wei - supersedes any defined core price
    mapping(uint256 => uint256) private projectIdToPricePerTokenInWei;
    /// projectId => price per token has been configured on this minter
    mapping(uint256 => bool) private projectIdToPriceIsConfigured;

    // modifier to restrict access to only AdminACL allowed calls
    // @dev defers which ACL contract is used to the core contract
    modifier onlyCoreAdminACL(bytes4 _selector) {
        require(
            genArtCoreContract.adminACLAllowed(
                msg.sender,
                address(this),
                _selector
            ),
            "Only Core AdminACL allowed"
        );
        _;
    }

    modifier onlyArtist(uint256 _projectId) {
        require(
            msg.sender ==
                genArtCoreContract.projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
        _;
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _genArt721Address Art Blocks core contract address for
     * which this contract will be a minter.
     * @param _minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(address _genArt721Address, address _minterFilter)
        ReentrancyGuard()
    {
        genArt721CoreAddress = _genArt721Address;
        genArtCoreContract = IGenArt721CoreContractV3(_genArt721Address);
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV0(_minterFilter);
        require(
            minterFilter.genArt721CoreAddress() == _genArt721Address,
            "Illegal contract pairing"
        );
    }

    /**
     * @notice Update the Merkle root for project `_projectId`.
     * @param _projectId Project ID to be updated.
     * @param _root root of Merkle tree defining addresses allowed to mint
     * on project `_projectId`.
     */
    function updateMerkleRoot(uint256 _projectId, bytes32 _root)
        external
        onlyArtist(_projectId)
    {
        projectMerkleRoot[_projectId] = _root;
        emit ConfigValueSet(_projectId, CONFIG_MERKLE_ROOT, _root);
    }

    /**
     * @notice Returns hashed address (to be used as merkle tree leaf).
     * Included as a public function to enable users to calculate their hashed
     * address in Solidity when generating proofs off-chain.
     * @param _address address to be hashed
     * @return bytes32 hashed address, via keccak256 (using encodePacked)
     */
    function hashAddress(address _address) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    /**
     * @notice Verify if address is allowed to mint on project `_projectId`.
     * @param _projectId Project ID to be checked.
     * @param _proof Merkle proof for address.
     * @param _address Address to check.
     * @return inAllowlist true only if address is allowed to mint and valid
     * Merkle proof was provided
     */
    function verifyAddress(
        uint256 _projectId,
        bytes32[] calldata _proof,
        address _address
    ) public view returns (bool) {
        return
            _proof.verifyCalldata(
                projectMerkleRoot[_projectId],
                hashAddress(_address)
            );
    }

    /**
     * @notice Toggles mint limit of one per address for project `_projectId`.
     * If mint limit is disabled, unlimited mints per address are allowed.
     * @param _projectId Project ID to toggle the mint limit.
     */
    function toggleProjectMintLimiter(uint256 _projectId)
        external
        onlyArtist(_projectId)
    {
        projectMintLimiterDisabled[_projectId] = !projectMintLimiterDisabled[
            _projectId
        ];
        emit ConfigValueSet(
            _projectId,
            CONFIG_MINT_LIMITER_DISABLED,
            projectMintLimiterDisabled[_projectId]
        );
    }

    /**
     * @notice Sets the maximum invocations of project `_projectId` based
     * on the value currently defined in the core contract.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev also checks and may refresh projectMaxHasBeenInvoked for project
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function setProjectMaxInvocations(uint256 _projectId)
        external
        onlyCoreAdminACL(this.setProjectMaxInvocations.selector)
    {
        uint256 invocations;
        uint256 maxInvocations;
        (invocations, maxInvocations, , , ) = genArtCoreContract
            .projectStateData(_projectId);
        // update storage with results
        projectMaxInvocations[_projectId] = maxInvocations;
        if (invocations < maxInvocations) {
            projectMaxHasBeenInvoked[_projectId] = false;
        }
    }

    /**
     * @notice Warning: Disabling purchaseTo is not supported on this minter.
     * This method exists purely for interface-conformance purposes.
     */
    function togglePurchaseToDisabled(uint256 _projectId)
        external
        view
        onlyArtist(_projectId)
    {
        revert("Action not supported");
    }

    /**
     * @notice Updates this minter's price per token of project `_projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * This price supersedes any legacy core contract price per token value.
     */
    function updatePricePerTokenInWei(
        uint256 _projectId,
        uint256 _pricePerTokenInWei
    ) external onlyArtist(_projectId) {
        projectIdToPricePerTokenInWei[_projectId] = _pricePerTokenInWei;
        projectIdToPriceIsConfigured[_projectId] = true;
        emit PricePerTokenInWeiUpdated(_projectId, _pricePerTokenInWei);
    }

    /**
     * @notice Inactive function - requires Merkle proof to purchase.
     */
    function purchase(uint256) external payable returns (uint256) {
        revert("Must provide Merkle proof");
    }

    /**
     * @notice Inactive function - requires Merkle proof to purchase.
     */
    function purchaseTo(address, uint256) public payable returns (uint256) {
        revert("Must provide Merkle proof");
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @param _proof Merkle proof.
     * @return tokenId Token ID of minted token
     */
    function purchase(uint256 _projectId, bytes32[] calldata _proof)
        external
        payable
        returns (uint256 tokenId)
    {
        tokenId = purchaseTo(msg.sender, _projectId, _proof);
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _proof Merkle proof.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        bytes32[] calldata _proof
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        require(
            !projectMaxHasBeenInvoked[_projectId],
            "Maximum number of invocations reached"
        );

        // load price of token into memory
        uint256 _pricePerTokenInWei = projectIdToPricePerTokenInWei[_projectId];

        require(
            msg.value >= _pricePerTokenInWei,
            "Must send minimum value to mint!"
        );

        // require artist to have configured price of token on this minter
        require(
            projectIdToPriceIsConfigured[_projectId],
            "Price not configured"
        );

        // no contract filter since Merkle tree controls allowed addresses

        // require valid Merkle proof
        require(
            verifyAddress(_projectId, _proof, msg.sender),
            "Invalid Merkle proof"
        );

        // limit mints per address by project
        if (projectMintedBy[_projectId][msg.sender]) {
            require(
                projectMintLimiterDisabled[_projectId],
                "Limit 1 mint per address"
            );
        } else {
            // EFFECTS
            projectMintedBy[_projectId][msg.sender] = true;
        }

        tokenId = minterFilter.mint(_to, _projectId, msg.sender);

        // What if this overflows, since default value of uint256 is 0?
        // that is intended, so that by default the minter allows infinite transactions,
        // allowing the artblocks contract to stop minting
        // uint256 tokenInvocation = tokenId % ONE_MILLION;
        unchecked {
            if (
                tokenId % ONE_MILLION == projectMaxInvocations[_projectId] - 1
            ) {
                projectMaxHasBeenInvoked[_projectId] = true;
            }
        }

        // INTERACTIONS
        _splitFundsETH(_projectId, _pricePerTokenInWei);

        return tokenId;
    }

    /**
     * @dev splits ETH funds between sender (if refund), foundation,
     * artist, and artist's additional payee for a token purchased on
     * project `_projectId`.
     */
    function _splitFundsETH(uint256 _projectId, uint256 _pricePerTokenInWei)
        internal
    {
        if (msg.value > 0) {
            bool success_;
            // send refund to sender
            uint256 refund = msg.value - _pricePerTokenInWei;
            if (refund > 0) {
                (success_, ) = msg.sender.call{value: refund}("");
                require(success_, "Refund failed");
            }
            // split remaining funds between foundation, artist, and artist's
            // additional payee
            (
                uint256 artblocksRevenue_,
                address payable artblocksAddress_,
                uint256 artistRevenue_,
                address payable artistAddress_,
                uint256 additionalPayeePrimaryRevenue_,
                address payable additionalPayeePrimaryAddress_
            ) = genArtCoreContract.getPrimaryRevenueSplits(
                    _projectId,
                    _pricePerTokenInWei
                );
            // Art Blocks payment
            if (artblocksRevenue_ > 0) {
                (success_, ) = artblocksAddress_.call{value: artblocksRevenue_}(
                    ""
                );
                require(success_, "Art Blocks payment failed");
            }
            // artist payment
            if (artistRevenue_ > 0) {
                (success_, ) = artistAddress_.call{value: artistRevenue_}("");
                require(success_, "Artist payment failed");
            }
            // additional payee payment
            if (additionalPayeePrimaryRevenue_ > 0) {
                (success_, ) = additionalPayeePrimaryAddress_.call{
                    value: additionalPayeePrimaryRevenue_
                }("");
                require(success_, "Additional Payee payment failed");
            }
        }
    }

    /**
     * @notice Process proof for an address. Returns Merkle root. Included to
     * enable users to easily verify a proof's validity.
     * @param _proof Merkle proof for address.
     * @param _address Address to process.
     * @return merkleRoot Merkle root for `_address` and `_proof`
     */
    function processProofForAddress(bytes32[] calldata _proof, address _address)
        external
        pure
        returns (bytes32)
    {
        return _proof.processProofCalldata(hashAddress(_address));
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(uint256 _projectId)
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        isConfigured = projectIdToPriceIsConfigured[_projectId];
        tokenPriceInWei = projectIdToPricePerTokenInWei[_projectId];
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }
}
