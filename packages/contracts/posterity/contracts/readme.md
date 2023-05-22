## Directory Overview

The file(s) in this directory do NOT remain under the root `/contracts/` directory, and are therefore NOT compiled. The contracts are in this directory for one or more of the following reasons:

- They are a point of reference that show contracts that were never published, at which point they should go in the `./reference-only/` directory
- They are contracts that were previously published, but are no longer actively developed, and are not required to be included in our published npm package
  - For example, V2_PBAB contracts that were minor forks of the base V2_PBAB contracts, without any ABI changes. In this case, frontends can use the base V2_PBAB ABI, and the Engine-partner-specific contract ABI is not required to be included in the npm package (since it would be redundant to the base V2_PBAB ABI)

## Directory Structure

In general, the directory structure of this directory mimics the directory structure of the `/contracts/` directory.

## Contract modifications

All contracts in this directory should be considered deprecated, and should not be modified. Import paths should not be updated, because the contracts in this directory are not compiled.
