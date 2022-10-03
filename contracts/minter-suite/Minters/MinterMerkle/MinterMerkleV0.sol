// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../../interfaces/0.8.x/IGenArt721CoreContractV1.sol";
import "../../../interfaces/0.8.x/IMinterFilterV0.sol";
import "../../../interfaces/0.8.x/IFilteredMinterMerkleV0.sol";

import "@openzeppelin-4.7/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin-4.7/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin-4.7/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.9;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH
 * for addresses in a Merkle allowlist.
 * @author Art Blocks Inc.
 */
contract MinterMerkleV0 is ReentrancyGuard, IFilteredMinterMerkleV0 {
    using MerkleProof for bytes32[];

    /// Core contract address this minter interacts with
    address public immutable genArt721CoreAddress;

    /// This contract handles cores with interface IV1
    IGenArt721CoreContractV1 private immutable genArtCoreContract;

    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV0 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterMerkleV0";

    /// project minter configuration keys used by this minter
    bytes32 private constant CONFIG_MERKLE_ROOT = "merkleRoot";
    bytes32 private constant CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE =
        "useMaxMintsPerAddrOverride"; // shortened to fit in 32 bytes
    bytes32 private constant CONFIG_MAX_INVOCATIONS_OVERRIDE =
        "maxMintsPerAddrOverride"; // shortened to match format of previous key

    uint256 constant ONE_MILLION = 1_000_000;

    uint256 public constant DEFAULT_MAX_INVOCATIONS_PER_ADDRESS = 1;

    /// projectId => merkle root
    mapping(uint256 => bytes32) public projectMerkleRoot;
    /// projectId => are max invocations per address overrides enabled
    /// (default is false, so DEFAULT_MAX_INVOCATIONS_PER_ADDRESS per address)
    mapping(uint256 => bool) public projectUseMaxInvocationsPerAddressOverride;
    /// projectId => max invocations per address override
    mapping(uint256 => uint256) public projectMaxInvocationsPerAddressOverride;
    /// projectId => has project reached its maximum number of invocations?
    mapping(uint256 => bool) public projectMaxHasBeenInvoked;
    /// projectId => project's maximum number of invocations
    mapping(uint256 => uint256) public projectMaxInvocations;
    /// projectId => price per token in wei - supersedes any defined core price
    mapping(uint256 => uint256) private projectIdToPricePerTokenInWei;
    /// projectId => price per token has been configured on this minter
    mapping(uint256 => bool) private projectIdToPriceIsConfigured;

    /// projectId => purchaser address => qty of mints purchased for project
    mapping(uint256 => mapping(address => uint256))
        public projectUserMintInvocations;

    modifier onlyCoreWhitelisted() {
        require(
            genArtCoreContract.isWhitelisted(msg.sender),
            "Only Core whitelisted"
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
        genArtCoreContract = IGenArt721CoreContractV1(_genArt721Address);
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
        require(_root != bytes32(0), "Root must be provided");
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
     * @notice Sets maximum allowed invocations per allowlisted address for
     * project `_project` to `limit`. If `limit` is set to 0, allowlisted
     * addresses will be able to mint as many times as desired, until the
     * project reaches its maximum invocations.
     * Default is a value of 1 if never configured by artist.
     * @param _projectId Project ID to toggle the mint limit.
     * @param _maxInvocationsPerAddress Maximum allowed invocations per
     * allowlisted address.
     * @dev default value stated above must be updated if the value of
     * CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE is changed.
     */
    function setProjectInvocationsPerAddress(
        uint256 _projectId,
        uint24 _maxInvocationsPerAddress
    ) external onlyArtist(_projectId) {
        // use override value instead of the contract's default
        // @dev this never changes from true to false; default value is only
        // used if artist has never configured project invocations per address
        projectUseMaxInvocationsPerAddressOverride[_projectId] = true;
        // update the override value
        projectMaxInvocationsPerAddressOverride[
            _projectId
        ] = _maxInvocationsPerAddress;
        // generic events
        emit ConfigValueSet(
            _projectId,
            CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            true
        );
        emit ConfigValueSet(
            _projectId,
            CONFIG_MAX_INVOCATIONS_OVERRIDE,
            uint256(_maxInvocationsPerAddress)
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
        onlyCoreWhitelisted
    {
        uint256 invocations;
        uint256 maxInvocations;
        (, , invocations, maxInvocations, , , , , ) = genArtCoreContract
            .projectTokenInfo(_projectId);
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

        require(
            msg.value >= projectIdToPricePerTokenInWei[_projectId],
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
        uint256 _maxProjectInvocationsPerAddress = projectUseMaxInvocationsPerAddressOverride[
                _projectId
            ]
                ? projectMaxInvocationsPerAddressOverride[_projectId]
                : DEFAULT_MAX_INVOCATIONS_PER_ADDRESS;

        // FINAL CHECK, WITH FOLLOW-ON EFFECTS
        require(
            projectUserMintInvocations[_projectId][msg.sender] <
                _maxProjectInvocationsPerAddress ||
                _maxProjectInvocationsPerAddress == 0,
            "Maximum number of invocations per address reached"
        );

        // EFFECTS
        // increment user's invocations for this project
        unchecked {
            // this will never overflow since user's invocations on a project
            // are limited by the project's max invocations
            projectUserMintInvocations[_projectId][msg.sender]++;
        }

        // mint token
        tokenId = minterFilter.mint(_to, _projectId, msg.sender);

        // what if projectMaxInvocations[_projectId] is 0 (default value)?
        // that is intended, so that by default the minter allows infinite transactions,
        // allowing the artblocks contract to stop minting
        // uint256 tokenInvocation = tokenId % ONE_MILLION;
        if (
            projectMaxInvocations[_projectId] > 0 &&
            tokenId % ONE_MILLION == projectMaxInvocations[_projectId] - 1
        ) {
            projectMaxHasBeenInvoked[_projectId] = true;
        }

        // INTERACTIONS
        _splitFundsETH(_projectId);

        return tokenId;
    }

    /**
     * @dev splits ETH funds between sender (if refund), foundation,
     * artist, and artist's additional payee for a token purchased on
     * project `_projectId`.
     * @dev utilizes transfer() to send ETH, so access lists may need to be
     * populated when purchasing tokens.
     */
    function _splitFundsETH(uint256 _projectId) internal {
        if (msg.value > 0) {
            uint256 pricePerTokenInWei = projectIdToPricePerTokenInWei[
                _projectId
            ];
            uint256 refund = msg.value - pricePerTokenInWei;
            if (refund > 0) {
                (bool success_, ) = msg.sender.call{value: refund}("");
                require(success_, "Refund failed");
            }
            uint256 foundationAmount = (pricePerTokenInWei *
                genArtCoreContract.artblocksPercentage()) / 100;
            if (foundationAmount > 0) {
                (bool success_, ) = genArtCoreContract.artblocksAddress().call{
                    value: foundationAmount
                }("");
                require(success_, "Foundation payment failed");
            }
            uint256 projectFunds = pricePerTokenInWei - foundationAmount;
            uint256 additionalPayeeAmount;
            if (
                genArtCoreContract.projectIdToAdditionalPayeePercentage(
                    _projectId
                ) > 0
            ) {
                additionalPayeeAmount =
                    (projectFunds *
                        genArtCoreContract.projectIdToAdditionalPayeePercentage(
                            _projectId
                        )) /
                    100;
                if (additionalPayeeAmount > 0) {
                    (bool success_, ) = genArtCoreContract
                        .projectIdToAdditionalPayee(_projectId)
                        .call{value: additionalPayeeAmount}("");
                    require(success_, "Additional payment failed");
                }
            }
            uint256 creatorFunds = projectFunds - additionalPayeeAmount;
            if (creatorFunds > 0) {
                (bool success_, ) = genArtCoreContract
                    .projectIdToArtistAddress(_projectId)
                    .call{value: creatorFunds}("");
                require(success_, "Artist payment failed");
            }
        }
    }

    /**
     * @notice projectId => maximum invocations per allowlisted address. If a
     * a value of 0 is returned, there is no limit on the number of mints per
     * allowlisted address.
     * Default behavior is limit 1 mint per address.
     * This value can be changed at any time by the artist.
     * @dev default value stated above must be updated if the value of
     * CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE is changed.
     */
    function projectMaxInvocationsPerAddress(uint256 _projectId)
        public
        view
        returns (uint256)
    {
        if (projectUseMaxInvocationsPerAddressOverride[_projectId]) {
            return uint256(projectMaxInvocationsPerAddressOverride[_projectId]);
        } else {
            return DEFAULT_MAX_INVOCATIONS_PER_ADDRESS;
        }
    }

    /**
     * @notice Returns remaining invocations for a given address.
     * If `projectLimitsMintInvocationsPerAddress` is false, individual
     * addresses are only limited by the project's maximum invocations, and a
     * dummy value of zero is returned for `mintInvocationsRemaining`.
     * If `projectLimitsMintInvocationsPerAddress` is true, the quantity of
     * remaining mint invocations for address `_address` is returned as
     * `mintInvocationsRemaining`.
     * Note that mint invocations per address can be changed at any time by the
     * artist of a project.
     * Also note that all mint invocations are limited by a project's maximum
     * invocations as defined on the core contract. This function may return
     * a value greater than the project's remaining invocations.
     */
    function projectRemainingInvocationsForAddress(
        uint256 _projectId,
        address _address
    )
        external
        view
        returns (
            bool projectLimitsMintInvocationsPerAddress,
            uint256 mintInvocationsRemaining
        )
    {
        uint256 maxInvocationsPerAddress = projectMaxInvocationsPerAddress(
            _projectId
        );
        if (maxInvocationsPerAddress == 0) {
            // project does not limit mint invocations per address, so leave
            // `projectLimitsMintInvocationsPerAddress` at solidity initial
            // value of false. Also leave `mintInvocationsRemaining` at
            // solidity initial value of zero, as indicated in this function's
            // documentation.
        } else {
            projectLimitsMintInvocationsPerAddress = true;
            uint256 userMintInvocations = projectUserMintInvocations[
                _projectId
            ][_address];
            // if user has not reached max invocations per address, return
            // remaining invocations
            if (maxInvocationsPerAddress > userMintInvocations) {
                unchecked {
                    // will never underflow due to the check above
                    mintInvocationsRemaining =
                        maxInvocationsPerAddress -
                        userMintInvocations;
                }
            }
            // else user has reached their maximum invocations, so leave
            // `mintInvocationsRemaining` at solidity initial value of zero
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
