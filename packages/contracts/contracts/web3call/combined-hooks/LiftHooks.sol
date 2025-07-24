// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPAugmentHook} from "../augment-hooks/AbstractPMPAugmentHook.sol";
import {AbstractPMPConfigureHook} from "../configure-hooks/AbstractPMPConfigureHook.sol";

import {IWeb3Call} from "../../interfaces/v0.8.x/IWeb3Call.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {Strings} from "@openzeppelin-5.0/contracts/utils/Strings.sol";
import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IDelegationRegistry as IDelegationRegistryV1} from "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import {IDelegateRegistry as IDelegationRegistryV2} from "../../interfaces/v0.8.x/IDelegateRegistry.sol";
import {IPMPConfigureHook} from "../../interfaces/v0.8.x/IPMPConfigureHook.sol";
import {IPMPAugmentHook} from "../../interfaces/v0.8.x/IPMPAugmentHook.sol";

interface IGenArt721V0_Minimal {
    function showTokenHashes(
        uint256 _tokenId
    ) external view returns (bytes32[] memory);
}

interface IRelic {
    // Query the inscription list by address; returning true/false for whether that address has inscribed,
    // and the number of squiggles under ownership (directly or through delegation)
    function inscriptionByAddress(
        address a
    ) external view returns (bool inscribed, uint256 squiggle_count);
}

/**
 * @title AugmentHookLIFT
 * @author Art Blocks Inc.
 * @notice This hook verifies ownership of any custom squiggle PostParam setting,
 * and injects the squiggle's token hash into the token's PMPs if ownership is passed.
 * It supports delegate.xyz V1 and V2, and also allows squiggle 9999 for any address that
 * inscribed the squiggle Relic contract on eth mainnet.
 * This hook has logic for both the augment and configure hooks.
 * It reverts if the squiggle token id doesn't pass relic or ownership checks during configuring.
 * It also removes the squiggle token id from the token's PMPs if it no longer passes ownership checks.
 */
contract LiftHooks is AbstractPMPAugmentHook, AbstractPMPConfigureHook {
    using Strings for uint256;

    address public immutable SQUIGGLE_GENART_V0_ADDRESS;
    address public immutable RELIC_CONTRACT_ADDRESS;

    IDelegationRegistryV1 public constant DELEGATE_V1 =
        IDelegationRegistryV1(0x00000000000076A84feF008CDAbe6409d2FE638B);
    IDelegationRegistryV2 public constant DELEGATE_V2 =
        IDelegationRegistryV2(0x00000000000000447e69651d841bD8D104Bed493);
    bytes32 public constant DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS =
        bytes32("postmintparameters");

    uint256 public constant FINAL_SQUIGGLE_TOKEN_ID = 9999;
    uint256 private constant _OOB_SQUIGGLE_TOKEN_ID = 10000;

    /**
     * @notice Constructor
     * @param _squiggleGenArtV0Address The address of the squiggle GenArt V0 contract.
     * For mainnet, use 0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a.
     * @param _relicContractAddress The address of the relic contract.
     * For mainnet, use 0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80.
     */
    constructor(
        address _squiggleGenArtV0Address,
        address _relicContractAddress
    ) {
        SQUIGGLE_GENART_V0_ADDRESS = _squiggleGenArtV0Address;
        RELIC_CONTRACT_ADDRESS = _relicContractAddress;
    }

    /**
     * @notice Execution logic to be executed when a token's PMP is configured.
     * @dev This hook is executed after the PMP is configured.
     * @param coreContract The address of the core contract that was configured.
     * @param tokenId The tokenId of the token that was configured.
     * @param pmpInput The PMP input that was used to successfully configure the token.
     */
    function onTokenPMPConfigure(
        address coreContract,
        uint256 tokenId,
        IPMPV0.PMPInput calldata pmpInput
    ) external view override {
        // only verify ownership if the squiggle token id is being configured
        if (
            keccak256(bytes(pmpInput.key)) ==
            keccak256(bytes("Featured_Squiggle"))
        ) {
            // @dev can assume squiggle token id is configured as a uint256, so will show up as configuredValue
            uint256 squiggleTokenId = uint256(pmpInput.configuredValue);

            // @dev only allow squiggle token ids up to FINAL_SQUIGGLE_TOKEN_ID
            // @dev no coverage - redundant check due to operationally enforced range check in PMPV0.sol
            require(
                squiggleTokenId <= FINAL_SQUIGGLE_TOKEN_ID,
                "Invalid squiggle token id"
            );

            address liftOwner = IERC721(coreContract).ownerOf(tokenId);

            require(
                passesSquiggleAccessCheck({
                    squiggleTokenId: squiggleTokenId,
                    liftOwner: liftOwner
                }),
                "Failed squiggle access check"
            );
        }
    }

    /**
     * @notice Augment the token parameters for a given token.
     * Augments the token parameters as described in the contract natspec doc.
     * @dev This hook is called when a token's PMPs are read.
     * @dev This must return all desired tokenParams, not just additional data.
     * @param coreContract The address of the core contract to call.
     * @param tokenId The tokenId of the token to get data for.
     * @param tokenParams The token parameters for the queried token.
     * @return augmentedTokenParams The augmented token parameters.
     */
    function onTokenPMPReadAugmentation(
        address coreContract,
        uint256 tokenId,
        IWeb3Call.TokenParam[] calldata tokenParams
    )
        external
        view
        override
        returns (IWeb3Call.TokenParam[] memory augmentedTokenParams)
    {
        // create a new augmentedTokenParams array with maximum length of
        // input tokenParams + 1 extra element for the squiggle's token hash
        uint256 originalLength = tokenParams.length;
        uint256 augmentedMaxLength = originalLength + 1;
        augmentedTokenParams = new IWeb3Call.TokenParam[](augmentedMaxLength);

        // allocate squiggle token id to a variable (may or may not be configured)
        uint256 squiggleTokenId = _OOB_SQUIGGLE_TOKEN_ID; // default to out of bounds if not configured

        // copy the original tokenParams into the new array, skipping the squiggle token id
        uint256 j = 0;
        for (uint256 i = 0; i < originalLength; i++) {
            if (
                keccak256(bytes(tokenParams[i].key)) ==
                keccak256(bytes("Featured_Squiggle"))
            ) {
                squiggleTokenId = parseUint(tokenParams[i].value);
                // skip the squiggle token id
                continue;
            } else {
                augmentedTokenParams[j++] = tokenParams[i];
            }
        }

        // if the squiggle token id is out of bounds, return the original tokenParams (no augmentation)
        if (squiggleTokenId == _OOB_SQUIGGLE_TOKEN_ID) {
            return tokenParams;
        }

        // verify ownership of the squiggle token id, and return the new array, but shortened to length of j
        {
            address liftOwner = IERC721(coreContract).ownerOf(tokenId);

            if (
                !passesSquiggleAccessCheck({
                    squiggleTokenId: squiggleTokenId,
                    liftOwner: liftOwner
                })
            ) {
                // stale squiggle token no longer passes ownership checks, so remove it from post params
                // shorten the new array to length of j
                assembly {
                    mstore(augmentedTokenParams, j)
                }
                return augmentedTokenParams;
            }
        }

        // ownership was passed, so we can inject the squiggle's token hash into the new array
        // @dev okay to assume squiggle exists since all squiggles are minted, passed previous checks
        bytes32 squiggleTokenHash = IGenArt721V0_Minimal(
            SQUIGGLE_GENART_V0_ADDRESS
        ).showTokenHashes(squiggleTokenId)[0];

        // inject the squiggles ID and hash into the new array
        augmentedTokenParams[j++] = IWeb3Call.TokenParam({
            key: "Featured_Squiggle",
            value: squiggleTokenId.toString()
        });
        augmentedTokenParams[j] = IWeb3Call.TokenParam({
            key: "Featured_Squiggle_Hash",
            value: uint256(squiggleTokenHash).toHexString()
        });

        // @dev no need to reduce the array length, since we guaranteed to be max length in this case

        // return the augmented tokenParams
        return augmentedTokenParams;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AbstractPMPAugmentHook, AbstractPMPConfigureHook)
        returns (bool)
    {
        return
            interfaceId == type(IPMPAugmentHook).interfaceId ||
            interfaceId == type(IPMPConfigureHook).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Checks if the liftOwner has access to the squiggle token id.
     * @dev This function is used to check if the liftOwner has access to the squiggle token id.
     * @param squiggleTokenId The token id of the squiggle to check access for.
     * @param liftOwner The address of the lift owner to check access for.
     * @return bool True if the liftOwner has access to the squiggle token id, false otherwise.
     */
    function passesSquiggleAccessCheck(
        uint256 squiggleTokenId,
        address liftOwner
    ) internal view returns (bool) {
        return
            passesRelicCheck(squiggleTokenId, liftOwner) ||
            isOwnerOrDelegate(squiggleTokenId, liftOwner);
    }

    /**
     * @notice Checks if the liftOwner is configuring squiggle 9999.
     * If so, it verifies that the liftOwner is inscribed in the relic contract.
     * @param squiggleTokenId The token id of the squiggle to check access for.
     * @param liftOwner The address of the lift owner to check access for.
     * @return bool True if the liftOwner is configuring squiggle 9999 and is
     * inscribed in the relic contract, false otherwise.
     */
    function passesRelicCheck(
        uint256 squiggleTokenId,
        address liftOwner
    ) internal view returns (bool) {
        if (squiggleTokenId == FINAL_SQUIGGLE_TOKEN_ID) {
            // verify token owner inscribed relic contract
            (bool inscribed, ) = IRelic(RELIC_CONTRACT_ADDRESS)
                .inscriptionByAddress(liftOwner);
            return inscribed;
        }
        return false;
    }

    /**
     * @notice Checks if the liftOwner is the owner of the squiggle token id or
     * a delegate of the vault that owns the squiggle token id.
     * Supports delegate.xyz V1 and V2.
     * @param squiggleTokenId The token id of the squiggle to check access for.
     * @param liftOwner The address of the lift owner to check access for.
     * @return bool True if the liftOwner is the owner of the squiggle token id or
     * a delegate of the squiggle token id, false otherwise.
     */
    function isOwnerOrDelegate(
        uint256 squiggleTokenId,
        address liftOwner
    ) internal view returns (bool) {
        address squiggleOwner = IERC721(SQUIGGLE_GENART_V0_ADDRESS).ownerOf(
            squiggleTokenId
        );

        // if the owner is the same, return true
        if (squiggleOwner == liftOwner) {
            return true;
        }

        // if the liftOwner is delegate of vault that owns squiggle(delegate.xyz V1 or V2), return true
        // @dev on v2, allow subdelegation rights consistent with PMPV0.sol
        return
            DELEGATE_V1.checkDelegateForToken({
                delegate: liftOwner,
                vault: squiggleOwner,
                contract_: SQUIGGLE_GENART_V0_ADDRESS,
                tokenId: squiggleTokenId
            }) ||
            DELEGATE_V2.checkDelegateForERC721({
                to: liftOwner,
                from: squiggleOwner,
                contract_: SQUIGGLE_GENART_V0_ADDRESS,
                tokenId: squiggleTokenId,
                rights: DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS
            });
    }

    /**
     * @notice Parses a string into a uint256.
     * @dev This function is used to parse a string into a uint256.
     * @param s The string to parse.
     * @return result The parsed uint256.
     */
    function parseUint(string memory s) internal pure returns (uint256 result) {
        bytes memory b = bytes(s);
        for (uint i = 0; i < b.length; i++) {
            // Require each character to be 0-9
            // @dev no coverage - operationally redundant check due to operationally enforced range check in PMPV0.sol
            require(b[i] >= 0x30 && b[i] <= 0x39, "Invalid character");
            result = result * 10 + (uint8(b[i]) - 48);
        }
    }
}
