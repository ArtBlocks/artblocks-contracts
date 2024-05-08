import { Snapshot, createActor } from "xstate";
import { projectSaleManagerMachine, ProjectSaleManagerMachineContext } from ".";
import { graphql } from "../../generated/index";
import { GetProjectDetailsQuery } from "../../generated/graphql";
import { isSupportedMinterType } from "../utils";
import { ArtBlocksClient } from "../..";
import { formatEther } from "viem";

export class ProjectIneligibleForPrimarySaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectIneligibleForPrimarySaleError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getProjectDetailsFragmentsDocument = graphql(/* GraphQL */ `
  fragment ProjectDetails on projects_metadata {
    id
    artist_address
    complete
    start_datetime
    auction_start_time
    auction_end_time
    aspect_ratio
    name
    invocations
    max_invocations
    paused

    featured_token {
      media_url
    }

    contract {
      address
      contract_type

      default_vertical {
        category {
          hosted
        }
      }
    }

    minter_configuration {
      ...MinterConfigurationDetails
    }
  }

  fragment MinterConfigurationDetails on project_minter_configurations {
    currency_symbol
    currency_address
    base_price

    extra_minter_details
    offchain_extra_minter_details

    minter {
      ...MinterDetails
    }
  }

  fragment MinterDetails on minters_metadata {
    address
    minter_type
    type {
      description_template
    }
  }
`);

export const getProjectDetailsDocument = graphql(/* GraphQL */ `
  query GetProjectDetails($projectId: String!) {
    projects_metadata_by_pk(id: $projectId) {
      ...ProjectDetails
    }
  }
`);

/**
 * Stable details relevant to the sale of a project, pulled from Hasura.
 */
export type ProjectDetails = GetProjectDetailsQuery["projects_metadata_by_pk"];

/**
 * Relevant project data likely to update during a live sale. This is pulled
 * directly from AB minter and core contracts.
 */
export type LiveSaleData = {
  tokenPriceInWei: bigint;
  invocations: bigint;
  maxInvocations: bigint;
  active: boolean;
  paused: boolean;
  completedTimestamp: bigint;
  isConfigured: boolean;
};

export function isProjectComplete(
  project?: ProjectDetails,
  liveSaleData?: LiveSaleData
): boolean {
  return Boolean(
    project?.complete || (liveSaleData && liveSaleData.completedTimestamp)
  );
}

export function isProjectIneligibleForPrimarySale(
  context: ProjectSaleManagerMachineContext
) {
  return Boolean(
    context.projectIneligibleReason ||
      !context.project ||
      !context.project.minter_configuration ||
      !isSupportedMinterType(
        context.project.minter_configuration?.minter?.minter_type
      )
  );
}

export function isProjectPurchasable(
  context: ProjectSaleManagerMachineContext
) {
  const { artblocksClient, project, liveSaleData } = context;
  const walletClient = artblocksClient.getWalletClient();

  if (!liveSaleData) {
    return false;
  }

  if (!walletClient || !walletClient.account) {
    return false;
  }

  if (!project) {
    return false;
  }

  if (isProjectComplete(project, liveSaleData)) {
    return false;
  }

  if (isProjectIneligibleForPrimarySale(context)) {
    return false;
  }

  // If the project is paused, only allow the artist to purchase
  if (
    liveSaleData.paused &&
    project.artist_address !== walletClient.account.address.toLowerCase()
  ) {
    return false;
  }

  if (project.auction_start_time) {
    const startDate = new Date(project.auction_start_time);
    if (startDate > new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Serializes the state snapshot of the purchase machine.
 *
 * This function is designed to serialize the state snapshot of the purchase machine, making it
 * suitable for transmission or storage, particularly for server-side rendering (SSR) scenarios.
 * The primary purpose of this serialization process is to handle the `context` and `input` keys
 * within the state object, specifically to nullify `publicClient` and `walletClient` references.
 * This is necessary because these client instances are not serializable and cannot be directly
 * included in the serialized state. By nullifying these references, the function ensures that
 * the snapshot can be safely transmitted or stored without encountering serialization errors.
 *
 * Upon deserialization on the client side, the necessary client instances can be re-injected
 * into the state, allowing the purchase machine to be initialized in a state consistent with
 * the server's, thereby facilitating a seamless user experience during SSR.
 *
 * @param snapshot - The state snapshot of the purchase machine to be serialized.
 * @returns A serialized version of the state snapshot, with sensitive or non-serializable
 *                information removed or nullified.
 */
export function serializeSnapshot(snapshot?: Record<string, any>): any {
  if (typeof snapshot !== "object" || snapshot === null) {
    return snapshot;
  }

  const result: Record<string, any> = {};

  for (const key in snapshot) {
    const value = snapshot[key];
    if (typeof value === "object" && value !== null) {
      if (key === "context" || key === "input") {
        result[key] = {
          ...value,
          artblocksClient: null,
        };
      } else {
        result[key] = serializeSnapshot(value);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Deserializes a snapshot of the purchase machine's state, integrating external client instances.
 *
 * This function takes a serialized snapshot of the purchase machine's state, along with instances
 * of `publicClient` and `walletClient`, and reconstructs the state object, ensuring that the
 * `publicClient` and `walletClient` are correctly integrated into the state. This is particularly
 * useful for rehydrating the state of the purchase machine on the client side, using data fetched
 * during server-side rendering (SSR).
 *
 * The function recursively processes the snapshot, specifically handling the `context` and `input`
 * keys to inject the provided `publicClient` and `walletClient` instances. For other keys, it
 * recursively calls itself to ensure that nested objects are properly deserialized.
 *
 * @param params - The parameters for deserialization.
 * @param params.snapshot - The serialized state snapshot to be deserialized.
 * @param params.publicClient - The instance of the public client to be integrated into the state.
 * @param params.walletClient - The instance of the wallet client to be integrated into the state, if applicable.
 * @returns {any} The deserialized state object with `publicClient` and `walletClient` integrated.
 */
export function deserializeSnapshot({
  snapshot,
  artblocksClient,
}: {
  snapshot?: Record<string, any>;
  artblocksClient?: ArtBlocksClient;
}): any {
  if (typeof snapshot !== "object" || snapshot === null) {
    return snapshot;
  }

  const result: Record<string, any> = {};

  for (const key in snapshot) {
    const value = snapshot[key];
    if (typeof value === "object" && value !== null) {
      if (key === "context" || key === "input") {
        const deserializedValue = {
          ...value,
        };

        if ("artblocksClient" in value) {
          deserializedValue.artblocksClient = artblocksClient;
        }

        result[key] = deserializedValue;
      } else {
        result[key] = deserializeSnapshot({
          snapshot: value,
          artblocksClient,
        });
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Generates a serialized snapshot of the purchase machine state for a given project,
 * intended for server-side rendering (SSR) use cases. This function initializes the
 * purchase machine with a specific project ID then listens for
 * updates to the machine's state. It resolves once the project polling machine has
 * transitioned to a state other than "fetchingProjectData", at which point it serializes
 * the snapshot of the purchase machine.
 * This serialized snapshot can be used to hydrate the client-side state of the
 * purchase machine, ensuring consistency between server-rendered and client-side content.
 *
 * @param projectId - The ID of the project for which to generate the purchase machine snapshot.
 * @returns A promise that resolves to a stringified version of the purchase machine
 * snapshot if successful, or null if an error occurs during initialization.
 */
export async function getSerializedSnapshotWithProjectData(
  projectId: string,
  artblocksClient: ArtBlocksClient
) {
  const projectSaleManagerMachineActor = createActor(
    projectSaleManagerMachine,
    {
      input: {
        projectId,
        artblocksClient,
      },
    }
  );

  try {
    const serializedProjectSaleManagerMachineActor = JSON.stringify(
      await new Promise<Snapshot<unknown>>((resolve) => {
        const subscription = projectSaleManagerMachineActor.subscribe(
          (snapshot) => {
            if (!snapshot.matches("fetchingProjectData")) {
              subscription.unsubscribe();
              resolve(
                serializeSnapshot(
                  projectSaleManagerMachineActor.getPersistedSnapshot()
                )
              );
              return;
            }
          }
        );
        projectSaleManagerMachineActor.start();
      })
    );
    return serializedProjectSaleManagerMachineActor;
  } catch (e) {
    console.error("Failed to initialize purchase machine", e);
    return null;
  }
}

function formatProjectDate(date?: Date | null): string | null {
  if (!date) return null;

  const formattedStartDateParts = Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
    weekday: "short",
  }).formatToParts(date);
  const weekday = formattedStartDateParts?.find(
    (part) => part.type === "weekday"
  )?.value;
  const month = formattedStartDateParts?.find(
    (part) => part.type === "month"
  )?.value;
  const day = formattedStartDateParts?.find(
    (part) => part.type === "day"
  )?.value;
  const hour = formattedStartDateParts?.find(
    (part) => part.type === "hour"
  )?.value;
  const minute = formattedStartDateParts?.find(
    (part) => part.type === "minute"
  )?.value;
  const dayPeriod = formattedStartDateParts?.find(
    (part) => part.type === "dayPeriod"
  )?.value;

  return `${weekday}, ${month} ${day}, ${hour}:${minute} ${dayPeriod}`;
}

export function generateMinterDescription(
  project: ProjectDetails,
  dateFormatter: (date: Date | null) => string | null = formatProjectDate
): string | null {
  const minterConfiguration = project?.minter_configuration;
  if (!minterConfiguration) return null;

  const replacements: Record<string, string | null | undefined> = {
    base_price: minterConfiguration.base_price
      ? formatEther(BigInt(minterConfiguration.base_price))
      : undefined,
    currency_symbol: minterConfiguration.currency_symbol,
    start_time: project.auction_start_time
      ? dateFormatter(new Date(project.auction_start_time))
      : undefined,
    start_price: minterConfiguration.extra_minter_details.startPrice
      ? formatEther(BigInt(minterConfiguration.extra_minter_details.startPrice))
      : undefined,
    end_time: project.auction_end_time
      ? dateFormatter(new Date(project.auction_end_time))
      : undefined,
  };

  const descriptionTemplate =
    project?.minter_configuration?.minter?.type?.description_template;

  if (!descriptionTemplate) return null;

  return descriptionTemplate.replace(
    /\{([^}]+)\}/g,
    (match: string, variableName: string) => {
      return replacements[variableName] ?? match;
    }
  );
}
