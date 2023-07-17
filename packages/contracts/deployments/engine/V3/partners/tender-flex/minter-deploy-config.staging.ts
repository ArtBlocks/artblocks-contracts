// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDAExpV4",
    genArt721V3CoreAddress: "0xFd0d90a09F8a994A4BAF0896685aaB3275C70Db1",
    minterFilterAddress: "0x355C1eB98b95B00203BBF66C54184E7AC88652EC",
  },
];
