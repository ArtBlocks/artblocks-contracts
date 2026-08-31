// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.22;

import {AbstractTransferHook} from "../engine/V3/transfer-hooks/AbstractTransferHook.sol";
import {IGenArt721CoreContractV3_Base} from "../interfaces/v0.8.x/IGenArt721CoreContractV3_Base.sol";
import {IGenArt721CoreContractV3_Engine} from "../interfaces/v0.8.x/IGenArt721CoreContractV3_Engine.sol";

import {IERC721} from "@openzeppelin-5.0/contracts/token/ERC721/IERC721.sol";

/**
 * @title Mock transfer hook for testing V3 Engine transfer hooks.
 * @notice Records hook inputs, optionally reverts, and can attempt reentrancy
 * into transfer / mint / configure / lock on the calling core.
 * @dev Intentionally does NOT restrict which cores it will serve, so a single
 * instance can be used across the Engine and Engine Flex test suites.
 * Production hooks must restrict `coreContract`.
 */
contract MockTransferHook is AbstractTransferHook {
    event TokenTransferred(
        address indexed coreContract,
        uint256 indexed tokenId,
        address from,
        address to,
        address operator
    );

    address public lastCoreContract;
    uint256 public lastTokenId;
    address public lastFrom;
    address public lastTo;
    address public lastOperator;
    bytes32 public lastTokenHash;
    uint256 public callCount;

    bool public shouldRevert;
    bool public reenterTransfer;
    bool public reenterConfigure;
    bool public reenterLock;
    address public reenterTransferTo;

    /// when set, reentrant transfer targets an explicit token rather than the
    /// token this hook was invoked for (used to test cross-project blocking)
    bool public reenterCustomToken;
    address public reenterCustomFrom;
    uint256 public reenterCustomTokenId;

    /// when set, the hook attempts to purchase through a minter, which
    /// reenters the core's mint path
    bool public reenterPurchase;
    address public reenterPurchaseMinter;
    uint256 public reenterPurchaseProjectId;

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function setReenterTransfer(
        bool _reenterTransfer,
        address _reenterTransferTo
    ) external {
        reenterTransfer = _reenterTransfer;
        reenterTransferTo = _reenterTransferTo;
    }

    function setReenterCustomToken(
        bool _reenterCustomToken,
        address _reenterCustomFrom,
        uint256 _reenterCustomTokenId
    ) external {
        reenterCustomToken = _reenterCustomToken;
        reenterCustomFrom = _reenterCustomFrom;
        reenterCustomTokenId = _reenterCustomTokenId;
    }

    function setReenterPurchase(
        bool _reenterPurchase,
        address _minter,
        uint256 _projectId
    ) external {
        reenterPurchase = _reenterPurchase;
        reenterPurchaseMinter = _minter;
        reenterPurchaseProjectId = _projectId;
    }

    function setReenterConfigure(bool _reenterConfigure) external {
        reenterConfigure = _reenterConfigure;
    }

    function setReenterLock(bool _reenterLock) external {
        reenterLock = _reenterLock;
    }

    function _onTokenTransfer(
        address coreContract,
        uint256 tokenId,
        address from,
        address to,
        address operator
    ) internal override {
        lastCoreContract = coreContract;
        lastTokenId = tokenId;
        lastFrom = from;
        lastTo = to;
        lastOperator = operator;
        lastTokenHash = IGenArt721CoreContractV3_Base(coreContract)
            .tokenIdToHash(tokenId);
        unchecked {
            callCount++;
        }

        emit TokenTransferred(coreContract, tokenId, from, to, operator);

        if (shouldRevert) {
            revert("MockTransferHook: Intentional revert");
        }

        if (reenterTransfer) {
            if (reenterCustomToken) {
                IERC721(coreContract).transferFrom(
                    reenterCustomFrom,
                    reenterTransferTo,
                    reenterCustomTokenId
                );
            } else {
                IERC721(coreContract).transferFrom(
                    to,
                    reenterTransferTo,
                    tokenId
                );
            }
        }

        if (reenterPurchase) {
            // @dev bubble the revert reason so the core's custom error is
            // observable by the test, rather than being swallowed here
            (bool success, bytes memory returnData) = reenterPurchaseMinter
                .call(
                    abi.encodeWithSignature(
                        "purchase(uint256)",
                        reenterPurchaseProjectId
                    )
                );
            if (!success) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        }

        if (reenterConfigure) {
            IGenArt721CoreContractV3_Engine(coreContract)
                .configureProjectTransferHook(tokenId / 1_000_000, address(0));
        }

        if (reenterLock) {
            IGenArt721CoreContractV3_Engine(coreContract)
                .lockProjectTransferHook(tokenId / 1_000_000, address(this));
        }
    }
}
