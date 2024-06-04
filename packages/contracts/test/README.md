## Initial Setup

See the [README](../README.md) for the initial setup.

Once the repository is cloned an dependencies are installed, you can run the tests with:

    yarn test

All tests must be passed before a pull request can be merged into `main`.

# Testing Overview

## Goal

First and foremost, tests in this repository are implemented to prevent bugs from reaching testnets and mainnet.

Tests are also intended to be readable and easy to understand, while fostering an innovative and collaborative environment.

## Philosophy

A few guiding principles for tests are:

- Lines of code should always be executed in a local (Hardhat) environment before being executed on testnet or mainnet.
- Coverage is required. All code should be tested before merging into `main`.
- Coverage is not enough. Tests should be designed to test edge cases, and to test the code in ways that may not obvious. Extra tests are encouraged.
- Tests should be written to test the code as it is written, not as it is expected to be written.
  - For example, testing an integration between two compiled contracts is preferrable to testing an integration by mocking a response from the second contract. This does not mean that mocking is not useful, only that it should be used sparingly.
- Tests should be straightforward to understand, while still eliminating as much boilerplate and code duplication as possible.
- Tests are only supplemental to formal audits and reviews.

A few guiding principles when writing our Smart Contracts are:

- Code should be written to be as simple as possible, while still being efficient and secure.
- In general, a preference of using Interfaces and/or Libraries over complex inheritance patterns is encouraged. This is to reduce the complexity of the codebase, and to make it easier to understand.
- It is encouraged to read carefully if copy/pasting code from one contract to another -- double & triple check things, even if it takes extra development time.
  - We have found bugs this way in the past!
- All contracts should be indexable by our subgraph indexing layer, preferably using only event data as triggers.
  - This makes subgraph code simpler, faster, and compatible with more blockchains.
  - Note that defining all events in a contract's interface also simplifies subgraph code requirements during version updates.
- All contacts that may be updated in the future should be versioned.
  - Versions should be broadcast in some way such that integrating contracts and/or indexers can easily determine the version of a contract.
- Contracts should be as minimally permissioned as possible, with the goal of maximizing decentralization and minimizing trust of any centralized party.

## Implementation

Currently, Hardhat is used to run all tests. Hardhat is a testing framework that runs on top of the Ethereum Virtual Machine (EVM). This allows tests to be written in JavaScript, and run against a local EVM. This local EVM is much faster than a testnet.

A few key details to note about our testing implementation:

- Tests are intended to be wholly deterministic, and should not rely on any external resources.
- Tests should be able to be run in any order, and should not rely on any state from previous tests.
- Tests should utilize [Hardhat fixtures](https://hardhat.org/tutorial/testing-contracts#reusing-common-test-setups-with-fixtures) to efficiently setup tests.
  - We typically use a fixture named `_beforeEach` to setup tests in a given file, similar to how `beforeEach` is used in Mocha, but with all the speed benefits of Hardhat fixtures. Additionally, we typically return a single `config` object from the `_beforeEach` fixture.
- We do not currently fork mainnet or testnets to run tests. This is due to the relatively simple nature of integration with external contracts at this time.
  - If our integrations with external contracts become more complex in the future, we may consider forking mainnet or testnets to run tests. Alternatively, we may consider using git submodules to pull in external contracts, and run tests against those contracts.
- To improve readability, tests are written in TypeScript. Additionally, we define a few augmentations in `../augmentations.d.ts` to improve readability and type safety. For example, we use a set of named accounts (`type TestAccountsArtBlocks`) to improve readability by naming hardhat's accounts a set of commonly used roles.

## Development Culture

While tests are an important part of the development process, an even more important part is the culture that surrounds them. A few core tenets of our development culture are:

- Open communication is encouraged. If you have questions, ask them! If you have ideas, share them! If you have concerns, raise them!
- Respect is required. We are all here to work together to build something great. We are all here to learn from each other, help one another, and to have fun! A respectful and collaborative environment is required to achieve this.
- Developers are empowered to schedule as much smart contract development and review time as they feel is needed to deliver a high quality and safe product. If you need more time to write or review a PR, take it! If you need more time to understand a PR, take it! If you feel that a third-party audit is needed, raise the concern. Timelines can be adjusted; building a safe product that the team feels confident in is paramount.
- All code should be reviewed by at least one other developer before merging into `main`, preferably by multiple developers. This is to ensure that code is readable, understandable, and secure.
- Detailed PR descriptions are encouraged. This is to ensure that reviewers can understand the context of the PR, and to ensure that the PR description can be used as a reference in the future.
- Developers are encouraged to ask questions, and to share ideas. This is the best way to learn, and to improve the codebase.
- Developers are encouraged to share their knowledge with others. This is the best way to improve the codebase.
- Highlighting risks is encouraged. If you see a potential risk that is not being addressed, raise it! If you see a potential risk that is being addressed, but you think it can be addressed better, raise it!
- Preventing bugs in deployed contracts is a team effort. If a bug is found, it should be considered an opportunity to improve our development system based on lessons learned. A single engineer is never soley responsible for a bug; many engineers are involved in our development process (writing code, reviewing code, reviewing tests, following our established process, etc.), and a bug represents a failure of our process, not an individual.

# Future Improvements

The following are some ideas for future improvements to our testing implementation:

- We do not currently use Hardhat fixtures to speed up tests. We should refactor our tests to use fixtures where possible.
  - (captured in https://github.com/ArtBlocks/artblocks-contracts/issues/371)
- We do not currently include coverage reports in our automatic CI runs. We should add this to our CI runs.
  - (captured in https://github.com/ArtBlocks/artblocks-contracts/issues/245)
- We do not currently implement a static analysis tool. We should add a static analysis tool, such as [slither](https://github.com/crytic/slither).
  - (captured in https://github.com/ArtBlocks/artblocks-contracts/issues/372)

Potential improvements that have benefits and drawbacks:

- Forking mainnet or testnets to run tests. This would allow us to test against real-world data, but would also require us to maintain a forked node API key, and would raise the level of complexity for contributors.
- Using git submodules to pull in (more complex) external contracts, and run tests against those contracts.

# Helpful Examples

## Isolate Tests

`describe.only()` is a helpful pattern to use while developing your tests. With this method any tests that fall outside of your isolated describe block(s) will be ignored, and this can speed up your development/testing cycle by an order of magnitude.

```ts
describe.only("common tests", async function () {
  await AdminACLV0V1_Common("AdminACLV0");
});
```

> Note there is a CI check that will fail if you commit a test with `describe.only()` in it, to prevent this from being accidentally committed.

## Mocking contract at address(smock)

Calls to external contracts at specific addresses can be faked -- this may be really helpful when your contract relies on dependency contracts. However, it can hide lots of complexity and edge-cases that could break your contract, so mocking contracts should be used carefully :) In general, it's better to test your contract against a real contract, if possible.

```ts
import { expectRevert } from "@openzeppelin/test-helpers";
import  { expect } from "chai";
import { smock, FakeContract } from "@defi-wonderland/smock";
import { IDelegationRegistry } from "../../../scripts/contracts";

  describe(`MinterHolderV2_${coreContractName}`, async function () {
    let fakeDelegationRegistry: FakeContract<IDelegationRegistry>;

    beforeEach(async function () {
        // mock delegate.cash registry with Goerli/mainnet-deployed address
        fakeDelegationRegistry = await smock.fake("IDelegationRegistry", {
            address: "0x00000000000076A84feF008CDAbe6409d2FE638B",
        });
    });

    it("calls checkDelegateForToken with the right vault params", async function () {
        // set up the mock to return true when called with valid input params
        fakeDelegationRegistry.checkDelegateForToken.whenCalledWith("validInputParams").returns(true);

        // minter will only mint if the delegate is valid due to mock above
        await this.minter.connect(this.accounts.user)
          ["purchaseTo(address,uint256)"](
            allowlistedVault,
            this.projectZero,
            {
              value: this.pricePerTokenInWei,
            }
          );

        // check that the mock was called
        expect(fakeDelegationRegistry.checkDelegateForToken).to.have.been.calledOnce;

        // check that the mock was called with the right params
        expect(fakeDelegationRegistry.checkDelegateForToken).to.have.been.calledWith
        (
          "0x48742D38a0809135EFd643c1150BfC137example",
          3
          );
      });

      it("does NOT allow purchases with the wrong pairing", async function () {
        // fake always returning invalid delegate
        fakeDelegationRegistry.checkDelegateForToken.returns(false);

        const allowlistedVault = this.accounts.artist.address;

        // expect revert when trying to purchase with invalid delegate
        await expectRevert(
            await this.minter.connect(this.accounts.user)
            ["purchaseTo(address,uint256)"](
                "0xInCoRrEcCtAdDrEsS123456789",
                this.projectZero,
                {
                value: this.pricePerTokenInWei,
                }
            );
          "Invalid delegate-vault pairing"
        );
      });
```
