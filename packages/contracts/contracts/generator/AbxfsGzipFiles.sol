// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.
pragma solidity ^0.8.17;

import {IAbxfsFileStore} from "../interfaces/v0.8.x/IAbxfsFileStore.sol";

/**
 * @title AbxfsGzipFiles
 * @author Art Blocks Inc.
 * @notice Reads gzip-codec files from the ABX FS FileStore.
 * @dev ABX FS stores a gzip file's raw gzip bytes, not base64 text, so callers emitting a
 * `data:...;base64,` script tag must base64-encode the result. Reads go through the FileStore
 * (the ABX FS store layer) rather than the ABX FS ContentReader companion, which by design refuses
 * files with a codec because it returns decoded content.
 */
library AbxfsGzipFiles {
    bytes32 internal constant GZIP_CODEC = "gzip";

    /**
     * @notice Returns the stored gzip bytes of ABX FS file `cid`, chunks joined.
     * @dev Reverts if `cid` is not a gzip-codec file on `fileStore`'s chain. A CID that is not a
     * file at all also reverts here, because FileStore reports it with a zero codec.
     * @param fileStore ABX FS FileStore to read from.
     * @param cid ABX FS file CID.
     * @return data The file's stored gzip bytes.
     */
    function readGzip(
        address fileStore,
        bytes32 cid
    ) internal view returns (bytes memory data) {
        IAbxfsFileStore.FileInfo memory info = IAbxfsFileStore(fileStore)
            .getFileInfo(cid);
        require(info.codec == GZIP_CODEC, "ABX FS file missing or not gzip");

        uint256 size = info.size;
        uint256 chunkCount = info.chunkCount;
        data = new bytes(size);
        uint256 offset;
        for (uint256 i = 0; i < chunkCount; ++i) {
            bytes memory chunk = IAbxfsFileStore(fileStore).readChunk(cid, i);
            uint256 chunkLength = chunk.length;
            require(
                offset + chunkLength <= size,
                "ABX FS chunk exceeds file size"
            );
            // @dev Word copy, because the generator compiles for an EVM target without MCOPY.
            // The final partial word is masked so bytes past this chunk are left untouched.
            assembly ("memory-safe") {
                let dst := add(add(data, 0x20), offset)
                let src := add(chunk, 0x20)
                let full := and(chunkLength, not(31))
                for {
                    let j := 0
                } lt(j, full) {
                    j := add(j, 0x20)
                } {
                    mstore(add(dst, j), mload(add(src, j)))
                }
                let rem := sub(chunkLength, full)
                if rem {
                    let mask := sub(shl(mul(sub(32, rem), 8), 1), 1)
                    let d := add(dst, full)
                    mstore(
                        d,
                        or(
                            and(mload(add(src, full)), not(mask)),
                            and(mload(d), mask)
                        )
                    )
                }
            }
            offset += chunkLength;
        }
        require(offset == size, "ABX FS file size mismatch");
    }
}
