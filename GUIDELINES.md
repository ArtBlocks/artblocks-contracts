# Style Guidelines

> Please read through our [Solidity Gotchas](./solidity-gotchas.md) and [Testing Philosophy](./test/README.md) sections before contributing.

> In addition to meeting our style guidelines, all code must pass all tests and be formatted with prettier before being merged into the main branch. To run the tests, run `yarn test`. To format the code, run `yarn format`.

While not all existing code may strictly adhere to these guidelines, we are working to improve the codebase over time.

We aim to follow the following guidelines when contributing new code:

- We follow the [OpenZeppelin Design Guidelines](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/GUIDELINES.md)
  - Importantly, this includes following the recommendations documented in the [Solidity style guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Additionally, we prefer to not use Solidity's `modifier` abstraction, and instead prefer to use `internal` functions prefixed with `_only`
  - This is largely due to the fact that modifiers can easily bloat the bytecode size of a contract.
  - We also prefer to keep our contracts as readable as possible, and the `modifier` abstraction is slightly confusing for new Solidity developers (e.g. use of `_;`).
