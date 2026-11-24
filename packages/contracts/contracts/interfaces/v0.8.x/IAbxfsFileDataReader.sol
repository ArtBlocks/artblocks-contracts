// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

/**
 * @title IAbxfsFileDataReader
 * @notice Read interface of the ABX FS FileDataReader, the companion contract that returns an ABX
 * FS file's stored data (its chunks joined) for any file-level codec. FileDataReader is stateless,
 * immutable and deployed by CREATE2 at the same address on every chain ABX FS supports.
 * @dev Mirrors the subset of ABX FS `FileDataReader` read by the generator. See
 * https://github.com/ArtBlocks/abxfs (packages/contracts-companion/src/FileDataReader.sol).
 * Every chunk returned is checked against the content hash ABX FS's ChunkStore recorded for it.
 */
interface IAbxfsFileDataReader {
    /**
     * @notice A whole file's data, base64-encoded (RFC 4648, padded).
     * @param cid ABX FS file CID.
     * @param maxBytes Refuse files whose data is larger than this many bytes.
     * @param maxChunks Refuse files with more than this many chunks.
     * @return mimeType The file's MIME type (of its content, not of the encoded data).
     * @return codec The file-level codec token (e.g. "gzip"), zero for none; when set, the data
     * is the encoded form.
     * @return outputHash `keccak256(content)` for a file with a codec, zero otherwise.
     * @return base64 The file's data, base64-encoded.
     */
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
        );
}
