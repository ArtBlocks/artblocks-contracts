# Art Blocks Monorepo

This monorepo contains packages and configurations for open source components of the Art Blocks ecosystem.

## Packages

### @artblocks/contracts

This package contains all the smart contracts for the Art Blocks ecosystem and is published as the npm package `@artblocks/contracts`, providing developers with access to the contracts and their associated ABIs.

**Features:**

- Includes all Art Blocks smart contracts
- Published as the `@artblocks/contracts` npm package
- Provides contracts and ABIs for developers to use in their projects

**Documentation:**

- [README for @artblocks/contracts](./packages/contracts/README.md)

### @artblocks/sdk

The upcoming SDK to make client-side interactions with the Art Blocks ecosystem easier. Initial scope includes functions around purchasing and minter configuration for projects. This is not yet functional and has not published package.

**Features:**

- Simplifies client-side interactions with Art Blocks
- Functions for purchasing and minter configuration

**Documentation:**

- [README for @artblocks/sdk](./packages/sdk/README.md)

## Shared Configurations

### eslint-config-custom

This directory contains a shared ESLint configuration used across the repository. It's not published as a separate package.

### tsconfig

This directory contains a shared TypeScript configuration used across the repository. It's not published as a separate package.

# License

The Art Blocks `artblocks-contracts` repo is open source software licensed under the GNU Lesser General Public License v3.0. For full license text, please see our [LICENSE](https://github.com/ArtBlocks/artblocks-contracts/blob/main/packages/contracts/LICENSE) declaration file.
