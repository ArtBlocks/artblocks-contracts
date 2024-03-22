# artblocks-sdk

This SDK can assist in simplifying the process of configuring minters, integrating purchasing functionality, and streamlining integration between Art Blocks Engine and partner websites using the Art Blocks minter suite.

## Overview

The Art Blocks SDK is a TypeScript library that can be used to simplify the process of integrating with the Art Blocks minter suite. It can be used to:

- Configure a project's current minter
- Query available minters and update the selected minter for a project

### Add the SDK to your project

To get started with the SDK, you will need to install it as a dependency in your project:

```bash
npm install @artblocks/sdk --save
```

If you are using Yarn:

```bash
yarn add @artblocks/sdk
```

### Import and initialize the SDK

Once installed, you can import the SDK into your project and initialize it with your backend authentication token and a [viem PublicClient](https://viem.sh/docs/clients/public.html):

```javascript
import { ArtBlocksSDK } from "@artblocks/sdk";
import { createPublicClient } from "viem";

const artBlocksSDK = new ArtBlocksSDK({
  jwt: "my-jwt", // backend authentication token
  provider: createPublicClient(/*public client params*/), // viem PublicClient
});
```
