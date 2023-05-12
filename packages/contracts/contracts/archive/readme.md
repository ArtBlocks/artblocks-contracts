## Directory Overview

The file(s) in this directory remain under the root `/contracts/` directory, and are therefore compiled. they are no longer being actively developed, however, and should be considered deprecated. The contracts are in this directory for one or more of the following reasons:

- They must be included in our published npm package
  - For example, the legacy Art Blocks V1 core contract's ABI created by Hardhat during compiling, must be available in the npm package
- They must be available for integration testing purposes
  - For example, tests may want to ensure new minters are compatible with legacy core contracts

## Directory Structure

In general, the directory structure of this directory mimics the directory structure of the `/contracts/` directory.

## Contract modifications

All contracts in this directory should be considered deprecated, and should not be modified. The exception is that when a contract is archived, import paths must be updated to continue to allow the contract to be compiled.
