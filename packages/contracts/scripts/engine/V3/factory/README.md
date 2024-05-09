# Deployments: Engine and Engine Flex Contracts via EngineFactoryV0

## Description

Engine and Engine Flex contracts can now be deployed in batches by calling the `createEngineContract` function on the deployed `EngineFactoryV0` contract.

This document outlines the necessary steps for deployments.

**Note: Steps 1 and 2 only need to be completed once per network/environment**

1. Ensure the `CoreRegistryV1`, `GenArt721CoreV3_Engine Implementation`, `GenArt721CoreV3_Engine_Flex Implementation`, and `EngineFactoryV0` contracts have been deployed and recorded in the `deployments/engine/V3/factory/EngineFactoryV0.md` file.
2. Run the `post-engine-factory-deployment.ts` script in `scripts/engine/V3/factory/` to initialize the deployment log in the corresponding directory by environment within `/deployments/engine/V3/studio/`. This script will also transfer ownership of the Core Registry to the Engine Factory.
3. Copy and paste the `deployment-config.template.ts` located in `/deployments/engine/V3/studio/` into the correct directory by environment. Fill out the `deployConfigDetailsArray` with configuration details for each Engine and Engine Flex contract to be deployed.
4. Run the `deploy:v3-engine:[NETWORK]` command, inputting the path to the deployment configuration above to queue the deployment transactions to the Safe wallet.
5. Once the transaction has been confirmed and executed, update the `deployment-config.ts` file configured in step 3 with the transaction hash of the deployments.
6. Finally, run the `post-deploy:v3-engine:[NETWORK]` command, inputting the path to the same deployment configuration updated above to create the image buckets and sync any off-chain data.
