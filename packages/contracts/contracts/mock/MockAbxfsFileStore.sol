// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

import {IAbxfsFileStore} from "../interfaces/v0.8.x/IAbxfsFileStore.sol";

/**
 * @title MockAbxfsFileStore
 * @notice Test double for the ABX FS FileStore read interface. Files are set directly, with an
 * explicit codec and size so tests can describe malformed files as well as valid ones.
 * @dev Reads only constant addresses and its own storage, so its runtime code can be placed at
 * the canonical FileStore address with `hardhat_setCode`. Like the real FileStore,
 * getFileInfo, locateByte and readChunk revert for a CID that is not a file.
 */
contract MockAbxfsFileStore is IAbxfsFileStore {
    error FileNotFound(bytes32 cid);
    error OffsetOutOfRange(uint256 offset, uint256 size);

    struct MockFile {
        bool exists;
        bytes32 codec;
        uint256 size;
        // chunk data held as contract code (SSTORE2 layout: 0x00 then the data), like ABX FS
        address[] chunks;
    }

    mapping(bytes32 cid => MockFile file) internal _files;

    /**
     * @notice Sets file `cid`. `size` is reported as-is, so a test can make it disagree with the
     * chunks.
     */
    function setFile(
        bytes32 cid,
        bytes32 codec,
        uint256 size,
        bytes[] calldata chunks
    ) external {
        MockFile storage file = _files[cid];
        file.exists = true;
        file.codec = codec;
        file.size = size;
        delete file.chunks;
        for (uint256 i = 0; i < chunks.length; i++) {
            file.chunks.push(_writeCode(chunks[i]));
        }
    }

    function fileExists(bytes32 cid) external view returns (bool) {
        return _files[cid].exists;
    }

    function getFileInfo(
        bytes32 cid
    ) external view returns (FileInfo memory info) {
        MockFile storage file = _file(cid);
        info.root = keccak256(abi.encode(cid));
        info.chunkCount = file.chunks.length;
        info.size = file.size;
        info.mimeType = "text/javascript";
        info.codec = file.codec;
        info.outputHash = file.codec == bytes32(0)
            ? bytes32(0)
            : keccak256(abi.encode(cid, "content"));
    }

    function locateByte(
        bytes32 cid,
        uint256 offset
    )
        external
        view
        returns (
            uint256 index,
            uint256 chunkStart,
            bytes32 chunkId,
            uint256 chunkSize
        )
    {
        MockFile storage file = _file(cid);
        for (; index < file.chunks.length; index++) {
            chunkSize = file.chunks[index].code.length - 1;
            if (offset < chunkStart + chunkSize) {
                return (
                    index,
                    chunkStart,
                    keccak256(abi.encode(file.chunks[index])),
                    chunkSize
                );
            }
            chunkStart += chunkSize;
        }
        revert OffsetOutOfRange(offset, chunkStart);
    }

    function readChunk(
        bytes32 cid,
        uint256 index
    ) external view returns (bytes memory data) {
        address pointer = _file(cid).chunks[index];
        data = new bytes(pointer.code.length - 1);
        assembly {
            extcodecopy(pointer, add(data, 0x20), 1, mload(data))
        }
    }

    function _writeCode(bytes memory data) internal returns (address pointer) {
        // returns `0x00 ‖ data` as the deployed code
        bytes memory init = abi.encodePacked(
            hex"61",
            uint16(data.length + 1),
            hex"80600a3d393df300",
            data
        );
        assembly {
            pointer := create(0, add(init, 0x20), mload(init))
        }
        require(pointer != address(0), "chunk write failed");
    }

    function _file(bytes32 cid) internal view returns (MockFile storage file) {
        file = _files[cid];
        if (!file.exists) revert FileNotFound(cid);
    }
}
