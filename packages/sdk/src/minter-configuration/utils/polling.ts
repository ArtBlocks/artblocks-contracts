import { ArtBlocksClientContext } from "../..";
import { GetProjectMinterConfigurationUpdatesQuery } from "../../generated/graphql";
import { AsyncData, asyncPoll } from "../../utils/async-poll";
import {
  getProjectMinterConfigurationUpdatesQueryDocument,
  getProjectsMetadataUpdatesQueryDocument,
} from "../graphql-operations";

/**
 * Polls the database to check if the minter configuration for a given project
 * has been updated and synced after a specified transaction confirmation time.
 *
 * @param sdk - The SDK instance for making API calls.
 * @param projectId - The ID of the project whose minter config needs to be polled.
 * @param transactionConfirmedAt - The time at which the on-chain transaction was confirmed.
 * @param updateProperties - An array of property names to check for updates.
 *
 * @returns - A promise that resolves to an object indicating whether the polling is done and if so, includes the project data.
 *
 * @throws Throws an error if the project cannot be found or if there's an API error.
 *
 * @example
 * const isSynced = await pollForSyncedMinterConfigUpdates(sdk, '0x000000-0', new Date(), ['extra_minter_details.auctionStartTime']);
 */
export async function pollForSyncedMinterConfigUpdates(
  clientContext: ArtBlocksClientContext,
  projectId: string,
  transactionConfirmedAt: Date,
  updateProperties: string[]
) {
  await asyncPoll(
    async (): Promise<
      AsyncData<
        GetProjectMinterConfigurationUpdatesQuery["projects_metadata_by_pk"]
      >
    > => {
      try {
        const result = await clientContext.graphqlClient.request(
          getProjectMinterConfigurationUpdatesQueryDocument,
          {
            projectId,
          }
        );
        const project = result.projects_metadata_by_pk;

        if (!project) {
          return Promise.reject(
            new Error(`Could not find project with id ${projectId}`)
          );
        }

        const transactionConfirmedAtTimestamp =
          transactionConfirmedAt.getTime();

        const hasUpdatedProperty = updateProperties.some((property) => {
          const propertyUpdatedAt = new Date(
            project.minter_configuration?.properties_updated_at?.[property] ?? 0
          );

          const propertyUpdatedAtTimestamp = propertyUpdatedAt.getTime();

          return propertyUpdatedAtTimestamp > transactionConfirmedAtTimestamp;
        });

        if (hasUpdatedProperty) {
          return Promise.resolve({
            done: true,
            data: project,
          });
        } else {
          return Promise.resolve({
            done: false,
          });
        }
      } catch (err) {
        return Promise.reject(err);
      }
    },
    500, // interval
    90000 // timeout
  );
}

export async function pollForProjectUpdates(
  clientContext: ArtBlocksClientContext,
  projectId: string,
  transactionConfirmedAt: Date,
  updateProperties: string[]
) {
  await asyncPoll(
    async (): Promise<
      AsyncData<
        GetProjectMinterConfigurationUpdatesQuery["projects_metadata_by_pk"]
      >
    > => {
      try {
        const result = await clientContext.graphqlClient.request(
          getProjectsMetadataUpdatesQueryDocument,
          {
            projectId,
          }
        );
        const project = result.projects_metadata_by_pk;

        if (!project) {
          return Promise.reject(
            new Error(`Could not find project with id ${projectId}`)
          );
        }

        const transactionConfirmedAtTimestamp =
          transactionConfirmedAt.getTime();

        const hasUpdatedProperty = updateProperties.some((property) => {
          const propertyUpdatedAt = new Date(
            project.properties_updated_at?.[property] ?? 0
          );

          const propertyUpdatedAtTimestamp = propertyUpdatedAt.getTime();

          return propertyUpdatedAtTimestamp > transactionConfirmedAtTimestamp;
        });

        if (hasUpdatedProperty) {
          return Promise.resolve({
            done: true,
            data: project,
          });
        } else {
          return Promise.resolve({
            done: false,
          });
        }
      } catch (err) {
        return Promise.reject(err);
      }
    },
    500, // interval
    90000 // timeout
  );
}
