# Core V3 (Engine + Engine Flex) Changelog

_This document is intended to document and explain the differences between the Art Blocks Core V3 used for Art Blocks flagship purposes, relative to the Art Blocks Core V3 contract used for the Art Blocks Engine and Engine Flex products._

V3 performance metrics are available in [V3_Performance.md](V3_Performance.md)

## The following changes were made in the Core V3 Engine contract:

- Removes reference to "curation registry" concept
- Removes on-chain reference to previous flagship core contracts
- Changes "artblocks" payee to be split into a "renderProvider" and "platformProvider" set of payees
- Removes "backwards compatible" oriented financial view-only methods
- Updates royalty-limit logic to account for two providers – "render" and "platform" providers.
- TODO: consider making a global "auto approve" proposals setting, that is determined at time of contract deployment, that likely should default to `true` based on most partners Engine settings
- TODO: integrates with the Engine registration event emitter (https://github.com/ArtBlocks/artblocks-contracts/issues/358)
