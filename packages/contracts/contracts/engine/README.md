## Overview of this Directory

This directory is intended to contain all common Art Blocks Engine smart contract source code, as well as any other relevant information about contracts that are in development. That may include directories specific to each partner prior to mainnet deployments.

## Forked Engine Contracts

We welcome submission of forked versions of our engine contracts. If you would like to fork our contracts, please create a new directory in this directory with the name of your project. Please include a CHANGELOG.md file with a description of the changes implemented in the fork.

Additionally, the following requirements must be met for all forked contracts:

- The forked contracts must conform to the same interface as the original contracts.
  - They may implement a forked interface, as long as the new interface only extends the original interface.
  - This requirement is to ensure that our indexing and other services can continue to function as expected.
- Core, AdminACL, and Minter contracts may be forked
  - We do not recommend forking the MitnerFilter contract, as it is a critical component of our indexing model that is in active development.

## Data Management Process

After a partner's contracts are deployed to mainnet and no longer in development, the contracts should be migrated to the `/posterity/engine/` directory.

Note: any deployment logs should be maintained in the `/deployments/V3/partners/<partner>/` or `/deployments/V2/<partner>/` directory.
