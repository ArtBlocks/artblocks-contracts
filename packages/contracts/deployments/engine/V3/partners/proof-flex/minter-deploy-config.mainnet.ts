// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterSetPriceV4",
    genArt721V3CoreAddress: "0x294fED5F1D3D30cfA6Fe86A937dC3141EEc8bC6d",
    minterFilterAddress: "0x21A95e1E97478db730b9564089A8Ca1D9aCF5B79",
  },
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterMerkleV5",
    genArt721V3CoreAddress: "0x294fED5F1D3D30cfA6Fe86A937dC3141EEc8bC6d",
    minterFilterAddress: "0x21A95e1E97478db730b9564089A8Ca1D9aCF5B79",
  },
];
