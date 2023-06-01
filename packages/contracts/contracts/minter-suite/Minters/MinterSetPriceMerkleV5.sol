// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import "../../interfaces/0.8.x/IGenArt721CoreContractV3_Base.sol";
import "../../interfaces/0.8.x/IDelegationRegistry.sol";
import "../../interfaces/0.8.x/ISharedMinterV0.sol";
import "../../interfaces/0.8.x/IMinterFilterV1.sol";
import "../../interfaces/0.8.x/IFilteredSharedMerkle.sol";

import "../../libs/0.8.x/MerkleLib.sol";
import "../../libs/0.8.x/SplitFundsLib.sol";
import "../../libs/0.8.x/MaxInvocationsLib.sol";

import "@openzeppelin-4.5/contracts/security/ReentrancyGuard.sol";

pragma solidity 0.8.19;

/**
 * @title Filtered Minter contract that allows tokens to be minted with ETH.
 * This is designed to be used with GenArt721CoreContractV3 flagship or
 * engine contracts.
 * @author Art Blocks Inc.
 * @notice Privileged Roles and Ownership:
 * This contract is designed to be managed, with limited powers.
 * Privileged roles and abilities are controlled by the project's artist, which
 * can be modified by the core contract's Admin ACL contract. Both of these
 * roles hold extensive power and can modify minter details.
 * Care must be taken to ensure that the admin ACL contract and artist
 * addresses are secure behind a multi-sig or other access control mechanism.
 * ----------------------------------------------------------------------------
 * The following functions are restricted to a project's artist:
 * - updatePricePerTokenInWei
 * - setProjectMaxInvocations
 * - manuallyLimitProjectMaxInvocations
 * ----------------------------------------------------------------------------
 * Additional admin and artist privileged roles may be described on other
 * contracts that this minter integrates with.
 */
contract MinterSetPriceMerkleV5 is
    ReentrancyGuard,
    ISharedMinterV0,
    IFilteredSharedMerkle
{
    /// Minter filter address this minter interacts with
    address public immutable minterFilterAddress;

    /// Minter filter this minter may interact with.
    IMinterFilterV1 private immutable minterFilter;

    /// minterType for this minter
    string public constant minterType = "MinterSetPriceMerkleV5";

    /// minter version for this minter
    string public constant minterVersion = "v5.0.0";

    uint256 constant ONE_MILLION = 1_000_000;

    /// contractAddress => projectId => base project config
    mapping(address => mapping(uint256 => ProjectConfig)) public projectConfig;

    /// contractAddress => projectId => purchaser address => qty of mints purchased for project
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        public projectUserMintInvocations;

    // STATE VARIABLES FOR SplitFundsLib
    // contractAddress => IsEngineCache
    mapping(address => SplitFundsLib.IsEngineCache) private _isEngineCaches;

    // STATE VARIABLES FOR MerkleLib
    /// Delegation registry address
    address public immutable delegationRegistryAddress;
    /// Delegation registry address
    IDelegationRegistry private immutable delegationRegistryContract;

    /// contractAddress => projectId => merkle specific project config
    mapping(address => mapping(uint256 => MerkleLib.MerkleProjectConfig))
        public merkleProjectConfig;

    // STATE VARIABLES FOR MaxInvocationsLib
    /// contractAddress => projectId => max invocations specific project config
    mapping(address => mapping(uint256 => MaxInvocationsLib.MaxInvocationsProjectConfig))
        public maxInvocationsProjectConfig;

    function _onlyArtist(
        uint256 _projectId,
        address _coreContract
    ) internal view {
        require(
            msg.sender ==
                IGenArt721CoreContractV3_Base(_coreContract)
                    .projectIdToArtistAddress(_projectId),
            "Only Artist"
        );
    }

    /**
     * @notice Initializes contract to be a Filtered Minter for
     * `_minterFilter`, integrated with Art Blocks core contract
     * at address `_genArt721Address`.
     * @param _minterFilter Minter filter for which this will be a
     * filtered minter.
     */
    constructor(
        address _minterFilter,
        address _delegationRegistryAddress
    ) ReentrancyGuard() {
        minterFilterAddress = _minterFilter;
        minterFilter = IMinterFilterV1(_minterFilter);

        delegationRegistryAddress = _delegationRegistryAddress;
        emit DelegationRegistryUpdated(_delegationRegistryAddress);
        delegationRegistryContract = IDelegationRegistry(
            _delegationRegistryAddress
        );
        // broadcast default max invocations per address for this minter
        emit DefaultMaxInvocationsPerAddress(
            MerkleLib.DEFAULT_MAX_INVOCATIONS_PER_ADDRESS
        );
    }

    /**
     * @notice Returns whether or not the provided address `_coreContract`
     * is an Art Blocks Engine core contract. Caches the result for future access.
     * @param _coreContract Address of the core contract to check.
     */
    function _isEngine(address _coreContract) internal returns (bool) {
        SplitFundsLib.IsEngineCache storage isEngineCache = _isEngineCaches[
            _coreContract
        ];
        if (isEngineCache.isCached) {
            return isEngineCache.isEngine;
        } else {
            bool isEngine = SplitFundsLib.getV3CoreIsEngine(
                _coreContract,
                isEngineCache
            );
            return isEngine;
        }
    }

    /**
     * @notice Syncs local maximum invocations of project `_projectId` based on
     * the value currently defined in the core contract.
     * @param _coreContract Core contract address for the given project.
     * @param _projectId Project ID to set the maximum invocations for.
     * @dev this enables gas reduction after maxInvocations have been reached -
     * core contracts shall still enforce a maxInvocation check during mint.
     */
    function syncProjectMaxInvocationsToCore(
        uint256 _projectId,
        address _coreContract
    ) public {
        _onlyArtist(_projectId, _coreContract);
        uint256 maxInvocations = MaxInvocationsLib
            .syncProjectMaxInvocationsToCore(
                _projectId,
                _coreContract,
                maxInvocationsProjectConfig
            );
        emit ProjectMaxInvocationsLimitUpdated(
            _projectId,
            _coreContract,
            maxInvocations
        );
    }

    /**
     * @notice Manually sets the local maximum invocations of project `_projectId`
     * with the provided `_maxInvocations`, checking that `_maxInvocations` is less
     * than or equal to the value of project `_project_id`'s maximum invocations that is
     * set on the core contract.
     * @dev Note that a `_maxInvocations` of 0 can only be set if the current `invocations`
     * value is also 0 and this would also set `maxHasBeenInvoked` to true, correctly short-circuiting
     * this minter's purchase function, avoiding extra gas costs from the core contract's maxInvocations check.
     * @param _projectId Project ID to set the maximum invocations for.
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocations Maximum invocations to set for the project.
     */
    function manuallyLimitProjectMaxInvocations(
        uint256 _projectId,
        address _coreContract,
        uint256 _maxInvocations
    ) external {
        _onlyArtist(_projectId, _coreContract);
        MaxInvocationsLib.manuallyLimitProjectMaxInvocations(
            _projectId,
            _coreContract,
            _maxInvocations,
            maxInvocationsProjectConfig
        );
        emit ProjectMaxInvocationsLimitUpdated(
            _projectId,
            _coreContract,
            _maxInvocations
        );
    }

    /**
     * @notice projectId => has project reached its maximum number of
     * invocations? Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached. A false negative will
     * only result in a gas cost increase, since the core contract will still
     * enforce a maxInvocation check during minting. A false positive is not
     * possible because the V3 core contract only allows maximum invocations
     * to be reduced, not increased. Based on this rationale, we intentionally
     * do not do input validation in this method as to whether or not the input
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxHasBeenInvoked(
        uint256 _projectId,
        address _coreContract
    ) external view returns (bool) {
        return
            maxInvocationsProjectConfig[_coreContract][_projectId]
                .maxHasBeenInvoked;
    }

    /**
     * @notice projectId => project's maximum number of invocations.
     * Optionally synced with core contract value, for gas optimization.
     * Note that this returns a local cache of the core contract's
     * state, and may be out of sync with the core contract. This is
     * intentional, as it only enables gas optimization of mints after a
     * project's maximum invocations has been reached.
     * @dev A number greater than the core contract's project max invocations
     * will only result in a gas cost increase, since the core contract will
     * still enforce a maxInvocation check during minting. A number less than
     * the core contract's project max invocations is only possible when the
     * project's max invocations have not been synced on this minter, since the
     * V3 core contract only allows maximum invocations to be reduced, not
     * increased. When this happens, the minter will enable minting, allowing
     * the core contract to enforce the max invocations check. Based on this
     * rationale, we intentionally do not do input validation in this method as
     * to whether or not the input `_projectId` is an existing project ID.
     * @param `_projectId` is an existing project ID.
     * @param `_coreContract` is an existing core contract address.
     */
    function projectMaxInvocations(
        uint256 _projectId,
        address _coreContract
    ) external view returns (uint256) {
        return
            uint256(
                maxInvocationsProjectConfig[_coreContract][_projectId]
                    .maxInvocations
            );
    }

    /**
     * @notice Updates this minter's price per token of project `_projectId`
     * to be '_pricePerTokenInWei`, in Wei.
     * This price supersedes any legacy core contract price per token value.
     * @dev Note that it is intentionally supported here that the configured
     * price may be explicitly set to `0`.
     * @param _projectId Project ID to set the price per token for.
     * @param _coreContract Core contract address for the given project.
     * @param _pricePerTokenInWei Price per token to set for the project, in Wei.
     */
    function updatePricePerTokenInWei(
        uint256 _projectId,
        address _coreContract,
        uint256 _pricePerTokenInWei
    ) external {
        _onlyArtist(_projectId, _coreContract);
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig = maxInvocationsProjectConfig[
                _coreContract
            ][_projectId];
        ProjectConfig storage _projectConfig = projectConfig[_coreContract][
            _projectId
        ];
        _projectConfig.pricePerTokenInWei = _pricePerTokenInWei;
        _projectConfig.priceIsConfigured = true;
        emit PricePerTokenInWeiUpdated(
            _projectId,
            _coreContract,
            _pricePerTokenInWei
        );

        // sync local max invocations if not initially populated
        // @dev if local max invocations and maxHasBeenInvoked are both
        // initial values, we know they have not been populated.
        if (
            _maxInvocationsProjectConfig.maxInvocations == 0 &&
            _maxInvocationsProjectConfig.maxHasBeenInvoked == false
        ) {
            syncProjectMaxInvocationsToCore(_projectId, _coreContract);
        }
    }

    /**
     * @notice Inactive function - requires Merkle proof to purchase.
     */
    function purchase(uint256, address) external payable returns (uint256) {
        revert("Must provide Merkle proof");
    }

    /**
     * @notice Inactive function - requires Merkle proof to purchase.
     */
    function purchaseTo(
        address,
        uint256,
        address
    ) public payable returns (uint256) {
        revert("Must provide Merkle proof");
    }

    /**
     * @notice Purchases a token from project `_projectId`.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Contract address of the core contract.
     * @param _proof Merkle proof for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchase(
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof
    ) external payable returns (uint256 tokenId) {
        tokenId = purchaseTo(
            msg.sender,
            _projectId,
            _coreContract,
            _proof,
            address(0)
        );
        return tokenId;
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Contract address of the core contract.
     * @param _proof Merkle proof for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof
    ) external payable returns (uint256 tokenId) {
        return purchaseTo(_to, _projectId, _coreContract, _proof, address(0));
    }

    /**
     * @notice Purchases a token from project `_projectId` and sets
     * the token's owner to `_to`.
     * @param _to Address to be the new token's owner.
     * @param _projectId Project ID to mint a token on.
     * @param _coreContract Contract address of the core contract.
     * @param _proof Merkle proof for the given project.
     * @return tokenId Token ID of minted token
     */
    function purchaseTo(
        address _to,
        uint256 _projectId,
        address _coreContract,
        bytes32[] calldata _proof,
        address _vault // acceptable to be `address(0)` if no vault
    ) public payable nonReentrant returns (uint256 tokenId) {
        // CHECKS
        MaxInvocationsLib.MaxInvocationsProjectConfig
            storage _maxInvocationsProjectConfig = maxInvocationsProjectConfig[
                _coreContract
            ][_projectId];
        ProjectConfig storage _projectConfig = projectConfig[_coreContract][
            _projectId
        ];
        MerkleLib.MerkleProjectConfig
            storage _merkleProjectConfig = merkleProjectConfig[_coreContract][
                _projectId
            ];

        // Note that `maxHasBeenInvoked` is only checked here to reduce gas
        // consumption after a project has been fully minted.
        // `_projectConfig.maxHasBeenInvoked` is locally cached to reduce
        // gas consumption, but if not in sync with the core contract's value,
        // the core contract also enforces its own max invocation check during
        // minting.
        require(
            !_maxInvocationsProjectConfig.maxHasBeenInvoked,
            "Max invocations reached"
        );

        // require artist to have configured price of token on this minter
        require(_projectConfig.priceIsConfigured, "Price not configured");

        // load price of token into memory
        uint256 pricePerTokenInWei = _projectConfig.pricePerTokenInWei;

        require(msg.value >= pricePerTokenInWei, "Min value to mint req.");

        // NOTE: delegate-vault handling **begins here**.

        // handle that the vault may be either the `msg.sender` in the case
        // that there is not a true vault, or may be `_vault` if one is
        // provided explicitly (and it is valid).
        address vault = msg.sender;
        if (_vault != address(0)) {
            // If a vault is provided, it must be valid, otherwise throw rather
            // than optimistically-minting with original `msg.sender`.
            // Note, we do not check `checkDelegateForAll` as well, as it is known
            // to be implicitly checked by calling `checkDelegateForContract`.
            bool isValidDelegee = delegationRegistryContract
                .checkDelegateForContract(
                    msg.sender, // delegate
                    _vault, // vault
                    _coreContract // contract
                );
            require(isValidDelegee, "Invalid delegate-vault pairing");
            vault = _vault;
        }

        // require valid Merkle proof
        require(
            MerkleLib.verifyAddress(
                _merkleProjectConfig.merkleRoot,
                _proof,
                vault
            ),
            "Invalid Merkle proof"
        );

        // limit mints per address by project
        uint256 _maxProjectInvocationsPerAddress = MerkleLib
            .projectMaxInvocationsPerAddress(_merkleProjectConfig);

        // note that mint limits index off of the `vault` (when applicable)
        require(
            projectUserMintInvocations[_coreContract][_projectId][vault] <
                _maxProjectInvocationsPerAddress ||
                _maxProjectInvocationsPerAddress == 0,
            "Max invocations reached"
        );

        // EFFECTS
        // increment user's invocations for this project
        unchecked {
            // this will never overflow since user's invocations on a project
            // are limited by the project's max invocations
            projectUserMintInvocations[_coreContract][_projectId][vault]++;
        }

        tokenId = minterFilter.mint_joo(
            _to,
            _projectId,
            _coreContract,
            msg.sender
        );

        MaxInvocationsLib.purchaseEffectsInvocations(
            _projectId,
            _coreContract,
            tokenId,
            maxInvocationsProjectConfig
        );

        // INTERACTIONS
        SplitFundsLib.splitFundsETH(
            _projectId,
            pricePerTokenInWei,
            _coreContract,
            _isEngine(_coreContract)
        );

        return tokenId;
    }

    /**
     * @notice Gets if price of token is configured, price of minting a
     * token on project `_projectId`, and currency symbol and address to be
     * used as payment. Supersedes any core contract price information.
     * @param _projectId Project ID to get price information for.
     * @param _coreContract Contract address of the core contract.
     * @return isConfigured true only if token price has been configured on
     * this minter
     * @return tokenPriceInWei current price of token on this minter - invalid
     * if price has not yet been configured
     * @return currencySymbol currency symbol for purchases of project on this
     * minter. This minter always returns "ETH"
     * @return currencyAddress currency address for purchases of project on
     * this minter. This minter always returns null address, reserved for ether
     */
    function getPriceInfo(
        uint256 _projectId,
        address _coreContract
    )
        external
        view
        returns (
            bool isConfigured,
            uint256 tokenPriceInWei,
            string memory currencySymbol,
            address currencyAddress
        )
    {
        ProjectConfig storage _projectConfig = projectConfig[_coreContract][
            _projectId
        ];
        isConfigured = _projectConfig.priceIsConfigured;
        tokenPriceInWei = _projectConfig.pricePerTokenInWei;
        currencySymbol = "ETH";
        currencyAddress = address(0);
    }

    // Merkle specific functionality below

    /**
     * @notice Update the Merkle root for project `_projectId` on core contract `_coreContract`.
     * @param _projectId Project ID to be updated.
     * @param _coreContract Core contract address for the given project.
     * @param _root root of Merkle tree defining addresses allowed to mint
     * on project `_projectId`.
     */
    function updateMerkleRoot(
        uint256 _projectId,
        address _coreContract,
        bytes32 _root
    ) external {
        _onlyArtist(_projectId, _coreContract);
        require(_root != bytes32(0), "Root must be provided");
        MerkleLib.updateMerkleRoot(
            merkleProjectConfig,
            _projectId,
            _coreContract,
            _root
        );
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_MERKLE_ROOT,
            _root
        );
    }

    /**
     * @notice Returns hashed address (to be used as merkle tree leaf).
     * Included as a public function to enable users to calculate their hashed
     * address in Solidity when generating proofs off-chain.
     * @param _address address to be hashed
     * @return bytes32 hashed address, via keccak256 (using encodePacked)
     */
    function hashAddress(address _address) external pure returns (bytes32) {
        return MerkleLib.hashAddress(_address);
    }

    /**
     * @notice Sets maximum allowed invocations per allowlisted address for
     * project `_project` to `limit`. If `limit` is set to 0, allowlisted
     * addresses will be able to mint as many times as desired, until the
     * project reaches its maximum invocations.
     * Default is a value of 1 if never configured by artist.
     * @param _projectId Project ID to toggle the mint limit.
     * @param _coreContract Core contract address for the given project.
     * @param _maxInvocationsPerAddress Maximum allowed invocations per
     * allowlisted address.
     * @dev default value stated above must be updated if the value of
     * CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE is changed.
     */
    function setProjectInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract,
        uint24 _maxInvocationsPerAddress
    ) external {
        _onlyArtist(_projectId, _coreContract);
        MerkleLib.setProjectInvocationsPerAddress(
            _projectId,
            _coreContract,
            _maxInvocationsPerAddress,
            merkleProjectConfig
        );
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_USE_MAX_INVOCATIONS_PER_ADDRESS_OVERRIDE,
            true
        );
        emit ConfigValueSet(
            _projectId,
            _coreContract,
            MerkleLib.CONFIG_MAX_INVOCATIONS_OVERRIDE,
            uint256(_maxInvocationsPerAddress)
        );
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
    function projectMaxInvocationsPerAddress(
        uint256 _projectId,
        address _coreContract
    ) public view returns (uint256) {
        MerkleLib.MerkleProjectConfig
            storage _projectConfig = merkleProjectConfig[_coreContract][
                _projectId
            ];
        return MerkleLib.projectMaxInvocationsPerAddress(_projectConfig);
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
        address _coreContract,
        address _address
    )
        external
        view
        returns (
            bool projectLimitsMintInvocationsPerAddress,
            uint256 mintInvocationsRemaining
        )
    {
        MerkleLib.MerkleProjectConfig
            storage _merkleProjectConfig = merkleProjectConfig[_coreContract][
                _projectId
            ];
        uint256 maxInvocationsPerAddress = MerkleLib
            .projectMaxInvocationsPerAddress(_merkleProjectConfig);

        if (maxInvocationsPerAddress == 0) {
            // project does not limit mint invocations per address, so leave
            // `projectLimitsMintInvocationsPerAddress` at solidity initial
            // value of false. Also leave `mintInvocationsRemaining` at
            // solidity initial value of zero, as indicated in this function's
            // documentation.
        } else {
            projectLimitsMintInvocationsPerAddress = true;
            uint256 userMintInvocations = projectUserMintInvocations[
                _coreContract
            ][_projectId][_address];
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
}
