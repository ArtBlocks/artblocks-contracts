// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity 0.8.22;

import {IAbxfsFileStore} from "../interfaces/v0.8.x/IAbxfsFileStore.sol";
import {IAbxfsFileDataReader} from "../interfaces/v0.8.x/IAbxfsFileDataReader.sol";
import {Base64} from "@openzeppelin-5.0/contracts/utils/Base64.sol";

/**
 * @title MockAbxfsFileDataReader
 * @notice Test double for the ABX FS FileDataReader: joins a file's chunks as read from the
 * FileStore at the canonical address (in tests, a MockAbxfsFileStore placed there).
 * @dev Reads only constant addresses, so its runtime code can be placed at the canonical
 * FileDataReader address with `hardhat_setCode`. Reverts like FileDataReader when the chunks
 * disagree with the recorded size or a limit is exceeded.
 */
contract MockAbxfsFileDataReader is IAbxfsFileDataReader {
    IAbxfsFileStore constant FILE_STORE =
        IAbxfsFileStore(0x8b6077a1d6953D96687005B9408D56A655b4d155);

    error ByteLimitExceeded(uint256 bytesRequired, uint256 maxBytes);
    error ChunkLimitExceeded(uint256 chunksRequired, uint256 maxChunks);
    error InvalidFileLength();

    function readFileDataBase64(
        bytes32 cid,
        uint256 maxBytes,
        uint256 maxChunks
    )
        external
        view
        returns (
            string memory mimeType,
            bytes32 codec,
            bytes32 outputHash,
            string memory base64
        )
    {
        IAbxfsFileStore.FileInfo memory info = FILE_STORE.getFileInfo(cid);
        if (info.size > maxBytes) {
            revert ByteLimitExceeded(info.size, maxBytes);
        }
        if (info.chunkCount > maxChunks) {
            revert ChunkLimitExceeded(info.chunkCount, maxChunks);
        }
        bytes memory data;
        for (uint256 i = 0; i < info.chunkCount; i++) {
            data = bytes.concat(data, FILE_STORE.readChunk(cid, i));
        }
        if (data.length != info.size) revert InvalidFileLength();
        return (
            info.mimeType,
            info.codec,
            info.outputHash,
            Base64.encode(data)
        );
    }
}
