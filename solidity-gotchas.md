# Solidity Gotchas

A collection of Solidity gotchas, recommendations, and other things to be aware of.

This is ever-evolving and mostly based on our own experiences, so please feel free to contribute!

In no particular order :)

## Contents

- [ABI.encodePacked](#abiencodepacked)
- [Hard-Coded Addresses](#hard-coded-addresses)
- [Contract Inheritance](#contract-inheritance)
- [Events in Interfaces](#events-in-interfaces)
- [Minimum Useful Capability](#minimum-useful-capability)

## ABI.encodePacked

When using `ABI.encodePacked` to concatenate multiple items, beware that if two sequential items are dynamic types, it is easy to craft collisions if the hash value by moving parts of one item into the other. See more details in [this section of the Solidity docs](https://docs.soliditylang.org/en/v0.8.17/abi-spec.html?highlight=abi.encodePacked#non-standard-packed-mode).

## Hard-Coded Addresses

Hard-coded addresses in a smart contract should generally be avoided. This is largly because the address of a contract can be different on different networks, resulting in a contract that is not easily reusable. This can lead to unexpected behavior or unnecessary contract version updates. It also makes it harder to test your contract, and can result in using mocked contract responses instead of real ones based on compiling the hard-coded contract from source code in tests.

The preferred pattern is to define what would be a hard-coded address an an immutable variable, and then set it in the constructor. This allows the address to be set at deployment time, and also allows tests to mimic what will be executed in production.

## Contract Inheritance

While at times useful, complex contract inheritance patterns can lead to code that is difficult to understand and maintain. In general, we want our contracts to be as readible and easy to read as possible. This helps prevent bugs, and also lowers the threhold of Solidity knowledge that a user must have to be able to read our contract before more confidently interacting with it. Therefore, it is best to avoid complex inheritance patterns, and instead at times reuse code.

We do, however, highly recommend using contract interfaces to define the public interface of a contract. This allows us to define the public interface of a contract in a single place, and then use that interface in other contracts. It also enforces that the public interface of a contract is consistent across all contracts that implement it (at the compiler-level). This is especially useful when we have multiple contracts that implement the same interface, and we want to be able to easily swap out one contract for another.

## Events in Interfaces

Through trial and error, we have learned that including all Solidity events in a contract interface leads to much simpler subgraph development. This is because the subgraph can then rely on the contract interface to define the events that it needs to listen for instead of handling an event from each version of a contract. This is especially useful when we have multiple contracts that implement the same interface, for example, when we have multiple versions of a given minter that all conform to the same interface.

## Minimum Useful Capability

All capability in Solidity code can lead to an almost exponential amount of complexity in downstream products such as a frontend. It also adds complexity that can lead to bugs, and can also make it harder to test your contract. Therefore, it is best to only add capability to your contract when it is needed. This is especially true for capability that is not needed for the core functionality of your contract.

For example, we used to have a `disablePurchaseTo` functionality on our minter contracts. It was determined that we no longer wanted to support this functionality (for philosophical reasons), so instead of leaving the capability in the smart contract, we removed it entirely. This resulted in a simpler contract, a simpler subgraph, and also a simpler frontend (since one less state had to be handled). Just because you can do something in Solidity, doesn't mean you should :)
