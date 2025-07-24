// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity 0.8.22;

import {AbstractPMPConfigureHook} from "./AbstractPMPConfigureHook.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/interfaces/IERC721.sol";
import {IPMPV0} from "../../interfaces/v0.8.x/IPMPV0.sol";
import {IDelegationRegistry as IDelegationRegistryV1} from "../../interfaces/v0.8.x/IDelegationRegistry.sol";
import {IDelegateRegistry as IDelegationRegistryV2} from "../../interfaces/v0.8.x/IDelegateRegistry.sol";

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
 * @title ConfigureHookLIFT
 * @author Art Blocks Inc.
 * @notice This hook verifies ownership of any custom squiggle PostParam setting.
 * It supports delegate.xyz V1 and V2, and also allows squiggle 9999 for any address that
 * signed the squiggle Relic contract on eth mainnet: 0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80
 */
contract ConfigureHookLIFT is AbstractPMPConfigureHook {
    address public constant SQUIGGLE_GENART_V0_ADDRESS =
        0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a;
    address public constant RELIC_CONTRACT_ADDRESS =
        0x9b917686DD68B68A780cB8Bf70aF46617A7b3f80;
    IDelegationRegistryV1 public constant DELEGATE_V1 =
        IDelegationRegistryV1(0x00000000000076A84feF008CDAbe6409d2FE638B);
    IDelegationRegistryV2 public constant DELEGATE_V2 =
        IDelegationRegistryV2(0x00000000000000447e69651d841bD8D104Bed493);
    bytes32 public constant DELEGATION_REGISTRY_TOKEN_OWNER_RIGHTS =
        bytes32("postmintparameters");
    uint256 private constant FINAL_SQUIGGLE_TOKEN_ID = 999999;

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
            keccak256(bytes("squiggleTokenId"))
        ) {
            // @dev can assume squiggle token id is configured as a uint256, so will show up as configuredValue
            uint256 squiggleTokenId = uint256(pmpInput.configuredValue);

            // @dev only allow squiggle token ids up to FINAL_SQUIGGLE_TOKEN_ID
            require(
                squiggleTokenId <= FINAL_SQUIGGLE_TOKEN_ID,
                "Invalid squiggle token id"
            );

            address liftOwner = IERC721(coreContract).ownerOf(tokenId);

            if (squiggleTokenId == FINAL_SQUIGGLE_TOKEN_ID) {
                // verify token owner inscribed relic contract
                (bool inscribed, ) = IRelic(RELIC_CONTRACT_ADDRESS)
                    .inscriptionByAddress(liftOwner);
                require(inscribed, "Not inscribed relic contract");
            } else {
                require(
                    isOwnerOrDelegate({
                        squiggleTokenId: squiggleTokenId,
                        liftOwner: liftOwner
                    }),
                    "Not owner or delegate"
                );
            }
        }
    }

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
}
