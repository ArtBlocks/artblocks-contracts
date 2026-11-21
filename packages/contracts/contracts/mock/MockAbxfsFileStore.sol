// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

import {IAbxfsFileStore} from "../interfaces/v0.8.x/IAbxfsFileStore.sol";

/**
 * @title MockAbxfsFileStore
 * @notice Test double for the ABX FS FileStore read interface. Files are set directly, with an
 * explicit codec and size so tests can describe malformed files as well as valid ones.
 * @dev Like the real FileStore, getFileInfo returns a zero-valued struct for an unknown CID.
 */
contract MockAbxfsFileStore is IAbxfsFileStore {
    struct MockFile {
        bytes32 codec;
        uint256 size;
        bytes[] chunks;
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
        file.codec = codec;
        file.size = size;
        delete file.chunks;
        for (uint256 i = 0; i < chunks.length; i++) {
            file.chunks.push(chunks[i]);
        }
    }

    function getFileInfo(
        bytes32 cid
    ) external view returns (FileInfo memory info) {
        MockFile storage file = _files[cid];
        if (file.chunks.length == 0) {
            return info;
        }
        info.root = keccak256(abi.encode(cid));
        info.chunkCount = file.chunks.length;
        info.size = file.size;
        info.mimeType = "text/javascript";
        info.codec = file.codec;
    }

    function readChunk(
        bytes32 cid,
        uint256 index
    ) external view returns (bytes memory data) {
        return _files[cid].chunks[index];
    }
}
