# Deploying Art Blocks Engine V3 Core Contracts

## Deployment Process

The following steps will deploy the core contracts for the Art Blocks Engine V3.

1. Create a deployment config file. See an example deployment file at `/deployments/engine/V3/partners/dev-example/deployment-config.dev.ts`
   a. The deployment config file should be placed in the `/deployments/engine/V3/partners/<your-partner-name>/` directory.
   b. The deployment config file should be named `deployment-config.<your-environment>.ts`
2. Run the deployment script with the following command:

```bash
# if dev
yarn deploy:dev:v3-engine
# if staging
yarn deploy:staging:v3-engine
# if mainnet
yarn deploy:mainnet:v3-engine
```

3. The deployment script will prompt you for the path to your deployment config file. Enter the path to your deployment config file when prompted. An example deployment config file path is shown below:

```bash
prompt: deployment config file:  deployments/engine/V3/partners/dev-example/deployment-config.dev.ts
```

4. The deployment script will attempt to deploy all contracts required for the Art Blocks Engine V3. If the deployment is successful, the script will have verified all contracts on Etherscan. The script will also have created or appended to a deployment file for the deployment. The deployment file will be located at `/deployments/engine/V3/partners/<your-partner-name>/DEPLOYMENTS.md`. The script also saves all deployment log data to a file at `/deployments/engine/V3/partners/<your-partner-name>/DEPLOYMENT_LOGS.log`. It is recommended that you commit these files to your repository for future reference.

## Off-chain DB updates

The script will also update the off-chain DB with any required information for the new contracts.

## Follow-on Steps

The script may prompt you to perform some follow-on steps. These steps are required to complete the deployment process.

Although this process is automated, it is recommended to sanity check that the new contracts have been deployed correctly and are actively being indexed by expected subgraph.
