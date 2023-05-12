# Deploying Art Blocks Engine V3 Core Contracts

## Deployment Process

The following steps will deploy minters that integrate with V3 core contracts.

1. Create a minter deployment config file. See an example deployment file at `/deployments/engine/V3/minter-deploy-config.template.ts`
   a. The minter deployment config file should be placed in the `/deployments/engine/V3/partners/<your-partner-name>/` directory.
   b. The deployment config file should be named `minter-deploy-config-XX.<your-environment>.ts`, where XX is a deployment nonce from 0 (to track all and-on minter deployments)
2. Run the deployment script with the following command:

```bash
# if testnet
deploy:goerli:minter
# if mainnet
deploy:mainnet:minter
```

3. The deployment script will prompt you for the path to your deployment config file. Enter the path to your deployment config file when prompted. An example deployment config file path is shown below:

```bash
prompt: minter deployment config file:  deployments/engine/V3/internal-testing/dev-example/minter-deploy-config-01.dev.ts
```

4. The deployment script will attempt to deploy all contracts required for the minter, as well as allowlist the minter on the relevant minter filter contract. If the deployment is successful, the script will have verified all contracts on Etherscan. The script will also have created or appended to a deployment file for the deployment. The deployment file will be located at `/deployments/engine/V3/partners/<your-partner-name>/DEPLOYMENTS.md`. The script also saves all deployment log data to a file at `/deployments/engine/V3/partners/<your-partner-name>/MINTER_DEPLOYMENT_LOGS.log`. It is recommended that you commit these files to your repository for future reference.

## Follow-on Steps

The script may prompt you to perform some follow-on steps. These steps are required to complete the deployment process.

Although this process is automated, it is recommended to sanity check that the new minters have been deployed correctly.

Additionally, if the minter suite is to be indexed, the minter must be added to the relevant subgraph's config.
