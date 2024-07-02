import {
  ActorRefFrom,
  assign,
  enqueueActions,
  fromPromise,
  setup,
} from "xstate";
import { getMessageFromError } from "../utils";
import { purchaseTrackingManagerMachine } from "../purchase-tracking-manager-machine";
import {
  LiveSaleData,
  ProjectDetails,
  ProjectIneligibleForPrimarySaleError,
  getProjectDetailsDocument,
  isProjectComplete,
  isProjectIneligibleForPrimarySale,
  isProjectPurchasable,
  isProjectRAMBiddable,
} from "./utils";
import { liveSaleDataPollingMachine } from "./live-sale-data-polling-machine";
import { purchaseInitiationMachine } from "../purchase-initiation-machine";
import { ArtBlocksClient } from "../..";
import { ramBidMachine } from "../ram-bid-machine";

type ProjectSaleManagerMachineEvents =
  | {
      type: "ART_BLOCKS_CLIENT_UPDATED";
      artblocksClient: ArtBlocksClient;
    }
  | {
      type: "PURCHASE_TRACKING_MANAGER_MACHINE_AVAILABLE";
      data: ActorRefFrom<typeof purchaseTrackingManagerMachine>;
    }
  | {
      type: "PURCHASE_TRACKING_MANAGER_MACHINE_UNAVAILABLE";
    }
  | {
      type: "LIVE_SALE_DATA_FETCHED";
      data: LiveSaleData;
    }
  | {
      type: "ERROR";
      data: string;
    }
  | {
      type: "COMPLETE";
    };

export type ProjectSaleManagerMachineContext = {
  projectId?: string;
  artblocksClient: ArtBlocksClient;
  project?: ProjectDetails;
  liveSaleData?: LiveSaleData;
  errorMessage?: string;
  projectIneligibleReason?: string;
  purchaseTrackingManagerMachine?: ActorRefFrom<
    typeof purchaseTrackingManagerMachine
  >;
  purchaseInitiationMachine?: ActorRefFrom<typeof purchaseInitiationMachine>;
  ramBidMachine?: ActorRefFrom<typeof ramBidMachine>;
};

/**
 * The ProjectSaleManagerMachine orchestrates the sale process for Art Blocks
 * projects, managing the complex interactions between user actions, project
 * eligibility, and sale state transitions. It is designed to synchronize
 * external contexts, such as wallet connectivity and project data, with the
 * internal state of the sale process. This synchronization is achieved through
 * the handling of top-level events, which update the machine's context in
 * response to changes in external dependencies like the PublicClient,
 * WalletClient, and live sale data availability.
 *
 * The machine employs a structured approach to state management, utilizing
 * 'always' transitions to automatically move between states based on the
 * current context. This allows for a dynamic and responsive sale process that
 * adapts to changes in project eligibility, user authentication status, and
 * other critical factors. The machine ensures that it remains in the correct
 * state to accurately reflect the current conditions of the sale environment.
 *
 * At its core, the ProjectSaleManagerMachine facilitates the initiation and
 * management of purchase processes. It collaborates closely with other machines,
 * such as the PurchaseInitiationMachine and LiveSaleDataPollingMachine, to
 * provide a comprehensive solution for managing sales within the Art Blocks
 * platform. The LiveSaleDataPollingMachine keeps the current price and other
 * sale-related data up to date throughout the sale process, while the
 * PurchaseInitiationMachine focuses on handling the specific user interactions
 * and steps involved in initiating a purchase.
 *
 * The ProjectSaleManagerMachine and PurchaseInitiationMachine have distinct
 * responsibilities and operate independently, while still working together to
 * facilitate the sale process. The ProjectSaleManagerMachine acts as a central
 * hub for managing the overall sale flow, coordinating various aspects of the
 * sale, and maintaining the necessary context and state transitions. It provides
 * a reference to itself to the PurchaseInitiationMachine, allowing it to access
 * relevant context data, such as the up-to-date price, without duplicating event
 * handling.
 *
 * The machine begins in the 'fetchingProjectData' state, where it retrieves
 * project details based on the provided project ID. If the project data fetching
 * fails due to network issues or other errors, the machine sets an error message
 * and transitions to the 'idle' state, which is responsible for routing to the
 * 'error' state.
 *
 * The 'idle' state serves as a decision point, evaluating the current context to
 * determine the next appropriate state transition. If the project is eligible for
 * sale and all necessary context is available, the machine transitions to the
 * 'readyForPurchase' state, where it spawns the PurchaseInitiationMachine to handle
 * the sale process.
 *
 * A project is considered ineligible for sale when it does not have a minter
 * assigned or configured, or if it is configured with an unsupported minter type.
 * In such cases, the machine transitions to the 'projectIneligibleForPrimarySale'
 * state.
 *
 * If the project sale is complete, the machine moves to the 'projectSaleComplete'
 * state, stopping the LiveSaleDataPollingMachine. In case of any errors during the
 * process, the machine transitions to the 'error' state, assigning an error
 * message and also stopping the LiveSaleDataPollingMachine.
 *
 * The ProjectSaleManagerMachine relies on guards to determine state transitions
 * and actions to update its context based on incoming events. It passes a reference
 * to itself (and by proxy, its context) to the PurchaseInitiationMachine, which can
 * then send initiated purchase transaction hashes to the PurchaseTrackingManagerMachine.
 */

export const projectSaleManagerMachine = setup({
  types: {
    input: {} as {
      projectId?: string;
      project?: ProjectDetails;
      artblocksClient: ArtBlocksClient;
    },
    context: {} as ProjectSaleManagerMachineContext,
    events: {} as ProjectSaleManagerMachineEvents,
  },
  actors: {
    fetchProjectDetails: fromPromise(
      async ({
        input,
      }: {
        input: { projectId?: string; artblocksClient: ArtBlocksClient };
      }): Promise<NonNullable<ProjectDetails>> => {
        const { projectId, artblocksClient } = input;

        // This is an expected case for non-AB projects so we throw a custom error
        // and transition to a non-error state.
        if (!projectId) {
          throw new ProjectIneligibleForPrimarySaleError(
            "No Art Blocks project ID provided. Primary sale not available."
          );
        }

        const res = await artblocksClient.graphqlRequest(
          getProjectDetailsDocument,
          {
            projectId,
          }
        );

        // We don't expect this to happen, so throw a normal error
        // instead of a custom one to trigger a transition to the
        // error state
        const project = res.projects_metadata_by_pk;
        if (!project) {
          throw new Error("Project not found");
        }

        return project;
      }
    ),
    liveSaleDataPollingMachine,
    purchaseInitiationMachine,
    ramBidMachine,
  },
  actions: {
    assignArtBlocksClient: assign({
      artblocksClient: (_, params: { artblocksClient: ArtBlocksClient }) =>
        params.artblocksClient,
    }),
    assignProject: assign({
      project: (_, params: { project: ProjectDetails }) => params.project,
    }),
    assignLiveSaleData: enqueueActions(
      ({ enqueue }, { liveSaleData }: { liveSaleData: LiveSaleData }) => {
        enqueue.assign({
          liveSaleData,
        });

        if (!liveSaleData.isConfigured) {
          enqueue.assign({
            projectIneligibleReason: "Project is not configured for sale",
          });
        }
      }
    ),
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        return getMessageFromError(params.error, params.fallbackMessage);
      },
    }),
    assignErrorMessage: assign({
      errorMessage: (_, params: { errorMessage?: string }) =>
        params.errorMessage,
    }),
    assignProjectIneligibleReason: assign({
      projectIneligibleReason: (
        _,
        params: { projectIneligibleReason: string }
      ) => params.projectIneligibleReason,
    }),
    spawnLiveSaleDataPollingMachine: enqueueActions(
      ({ enqueue, context, system }) => {
        const project = context.project;

        if (!project) {
          console.warn("No project found in context");
          return;
        }

        // Don't spawn the project polling machine if it's already running
        if (system.get("liveSaleDataPollingMachine")) {
          return;
        }

        enqueue.spawnChild("liveSaleDataPollingMachine", {
          systemId: "liveSaleDataPollingMachine",
          id: "liveSaleDataPollingMachine",
          input: {
            artblocksClient: context.artblocksClient,
            project,
          },
        });
      }
    ),
    stopLiveSaleDataPollingMachine: enqueueActions(({ enqueue, system }) => {
      if (!system.get("liveSaleDataPollingMachine")) {
        return;
      }

      enqueue.stopChild("liveSaleDataPollingMachine");
    }),
    assignPurchaseTrackingManagerMachine: assign({
      purchaseTrackingManagerMachine: (
        _,
        params: {
          purchaseTrackingManagerMachine?: ActorRefFrom<
            typeof purchaseTrackingManagerMachine
          >;
        }
      ) => params.purchaseTrackingManagerMachine,
    }),
    assignContextFromFailedFetchProjectDetails: enqueueActions(
      ({ enqueue }, params: { error: unknown }) => {
        if (params.error instanceof ProjectIneligibleForPrimarySaleError) {
          enqueue.assign({
            projectIneligibleReason: params.error.message,
          });
          return;
        }

        enqueue.assign({
          errorMessage: getMessageFromError(params.error),
        });
      }
    ),
    spawnAndAssignPurchaseInitiationMachine: assign({
      purchaseInitiationMachine: ({ spawn, context, self }) => {
        if (!context.project) {
          return;
        }

        return spawn("purchaseInitiationMachine", {
          systemId: "purchaseInitiationMachine",
          id: "purchaseInitiationMachine",
          input: {
            artblocksClient: context.artblocksClient,
            project: context.project,
            projectSaleManagerMachine: self,
          },
        });
      },
    }),
    stopAndAssignPurchaseInitiationMachine: enqueueActions(({ enqueue }) => {
      enqueue.stopChild("purchaseInitiationMachine");
      enqueue.assign({
        purchaseInitiationMachine: undefined,
      });
    }),
    spawnAndAssignRAMBidMachine: assign({
      ramBidMachine: ({ spawn, context, system }) => {
        if (!context.project) {
          return;
        }

        const liveSaleDataPollingMachineRef = system.get(
          "liveSaleDataPollingMachine"
        );
        if (!liveSaleDataPollingMachineRef) {
          return;
        }

        return spawn("ramBidMachine", {
          systemId: "ramBidMachine",
          id: "ramBidMachine",
          input: {
            artblocksClient: context.artblocksClient,
            project: context.project,
            liveSaleDataPollingMachineRef: liveSaleDataPollingMachineRef,
          },
        });
      },
    }),
    stopAndAssignRAMBidMachine: enqueueActions(({ enqueue }) => {
      enqueue.stopChild("ramBidMachine");
      enqueue.assign({
        ramBidMachine: undefined,
      });
    }),
  },
  guards: {
    isNotPurchasable: ({ context }) => {
      return !isProjectPurchasable(context);
    },
    isPurchasable: ({ context }) => {
      return isProjectPurchasable(context);
    },
    isRAMBiddable: ({ context }) => {
      return isProjectRAMBiddable(context);
    },
    isNotRAMBiddable: ({ context }) => {
      return !isProjectRAMBiddable(context);
    },
    isProjectComplete: ({ context }) => {
      return isProjectComplete(context.project, context.liveSaleData);
    },
    isProjectIneligibleForPrimarySale: ({ context }) => {
      return isProjectIneligibleForPrimarySale(context);
    },
    isErrorMessageAvailable: ({ context }) => {
      return Boolean(context.errorMessage);
    },
    isPublicClientUnavailable: ({ context }) => {
      return !context.artblocksClient.getPublicClient();
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwGUBDAGzAFkiA7ImVSnACwEsqwBiAQQCUAVAfQBCAGQDyAYQDSBfuOEBJAKIA5AQFUACgBFOvRVoDaABgC6iFOljM8zdFXMgAHogCMAVhcBOAHQB2AMwALP5u-v4AHAGevm4ANCAAnogATABsbt5GvuGpLl6+nv5Z-r4AvqXxaFi4hKQU1LRg9ERMrBwaatziABKcBIr8vNycUvLKAOL85JzKnOOK3FMj3WMDnABqnPLCnCKKxmZIIMiW1rb2R84IALQuvoGp3l5ugeGFLqnJyR7xSQhubnC3hyLn8ySMRmSbxcyU85UqGGw+GIZEoNDoDBYbHYHS6vX6g2GowmS1m80W0x6q34almm22u2E+1MDhOVhsdgcV1uMUenjcvi+yTBnkinmSv0QMQyIUCvhi0QFRkK8OOiJqKPq6KamLa7AW3FE3AOrNOHIuoG5MWS3ge4SM6TcUMCHhckoQXkC3lFMV87g8gP8qqqSNqqIaGJaWI4CnWAwInCZ-B0vE4-AAYopeD19CajmyzpzLohbkYgsCPKlwslAlCXIF3Z7vZEBf73OEgxU1dVkXU0Y1mq02N4AGZgPBDqAadX4LREPBEdgQOxgbysABu6AA1quQxq+xGdVG2qPx5Ppz28HOFwgN+gcPPzgc8xZ2ecuSW-f5vIC3LkjEq4ReO6qRVj+EReCUnipGEeTBjOYZagOurDmOE5YlOCHXouTQYKg3jICQ84jugqAALYEQhmr9pGQ6rmh55YfORC3lQm4Puaz4svmZrvsWNzykYTwAp47ipNBgRGLWjZSS43j+KkRigrCMKCsK8GXtRh6DtGa4QGQ7AvscvFFpaiBBN+DyhEBLhKWk9buk6Xr+LZLqCgBYRvBpoZadqOknsw+kcAYLiHK+hYWk45mgsCyows6Dr+IUIFyt43wAhC4lQpEZRdnuvbhn5KGroFBkGMkYXGW+plRQgFm2ukEG2TCuQNokUpvPJtapC6oHfNW4TefuhXIcew6lcF-iVQW5ofnV4mZB4sKpAUHbJL4qTutBQKiaEfVKZJWRDQVSG0bpE2GYE00mZFVxhI8SVvBtdy1nKMl+vJAGwi6EKeNEx2ITRR50XpZVuNd1W3eZJTyTW0rNX1ErtR6Lgdj+XyKTC9bFINeVUQeRVjauqBgEQEAJOmpGaoZ3HhbN-GgncP7iutcpFC8dyNmkXq1vayrRHa63lF2VDoBAcCsvjI1nW0pqQ3Ntzgt+UI9eJ0SiYK4TusEjxAQBSnRBEeupADvmjSDDEYReobYXLEUK3kAJpTkDx-QUdxQu64SBHJBR-l4ySqbjCKaQT5vnUFdv02ZNywU8vVSYEbl3JtyPyl6fvpKjWNeHCeOh9LwO6STZMU1TdRR3xMcwrWP4PCK2SeFk0RbR83pFOEfOCoCAGm2HMvDvliHiOgZGEeOYCVzVVygh9ArrQK8oKSUXu2Zk4nPFJ3xynnIc+f3RcnrhpFT1DHrBEJwoqU6ERLXEyMvBkZa+Jlv5FD7feF-5g8IfIbAkMwKAzAABGZBKaoGnMwMiRBUAJE1KfOaoJyzKi+G8B0f1bL+BAitZs4I3AQk1k6XG5QgA */
  id: "projectSaleManagerMachine",
  context: ({ input }) => ({
    projectId: input.projectId,
    artblocksClient: input.artblocksClient,
    project: input.project,
  }),
  initial: "fetchingProjectData",
  on: {
    ART_BLOCKS_CLIENT_UPDATED: [
      {
        actions: [
          {
            type: "assignArtBlocksClient",
            params: ({ event }) => ({
              artblocksClient: event.artblocksClient,
            }),
          },
        ],
      },
    ],

    PURCHASE_TRACKING_MANAGER_MACHINE_AVAILABLE: {
      actions: {
        type: "assignPurchaseTrackingManagerMachine",
        params: ({ event }) => ({
          purchaseTrackingManagerMachine: event.data,
        }),
      },
    },

    PURCHASE_TRACKING_MANAGER_MACHINE_UNAVAILABLE: {
      actions: {
        type: "assignPurchaseTrackingManagerMachine",
        params: { purchaseTrackingManagerMachine: undefined },
      },
    },

    ERROR: {
      actions: {
        type: "assignErrorMessage",
        params: ({ event }) => ({
          errorMessage: event.data,
        }),
      },
    },

    LIVE_SALE_DATA_FETCHED: {
      actions: {
        type: "assignLiveSaleData",
        params: ({ event }) => ({
          liveSaleData: event.data,
        }),
      },
    },
  },
  states: {
    fetchingProjectData: {
      invoke: {
        src: "fetchProjectDetails",
        input: ({ context }) => ({
          projectId: context.projectId,
          artblocksClient: context.artblocksClient,
        }),
        onDone: [
          {
            target: "idle",
            actions: {
              type: "assignProject",
              params: ({ event }) => ({
                project: event.output,
              }),
            },
          },
        ],

        onError: {
          target: "idle",
          actions: {
            type: "assignContextFromFailedFetchProjectDetails",
            params: ({ event }) => ({
              error: event.error,
            }),
          },
        },
      },
    },

    idle: {
      description:
        "The 'idle' state is a waiting state where the machine evaluates the next steps based on the current context. It acts as a decision point, assessing conditions for a sale, errors, project ineligibility, or completion. Transitions from this state are determined by guards that check data availability, project eligibility, and other sale prerequisites. If conditions change, the machine moves to a specific state to handle the situation, such as initiating the sale process, handling errors, or dealing with ineligibility or completion.",
      always: [
        {
          target: "error",
          guard: "isErrorMessageAvailable",
          actions: "stopLiveSaleDataPollingMachine",
        },
        {
          target: "projectIneligibleForPrimarySale",
          guard: "isProjectIneligibleForPrimarySale",
          actions: "stopLiveSaleDataPollingMachine",
        },
        {
          target: "projectSaleComplete",
          guard: "isProjectComplete",
          actions: "stopLiveSaleDataPollingMachine",
        },
        {
          target: "readyForPurchase",
          guard: "isPurchasable",
        },
        {
          target: "readyForRamBid",
          guard: "isRAMBiddable",
        },
        {
          guard: "isPublicClientUnavailable",
          actions: "stopLiveSaleDataPollingMachine",
        },
        {
          actions: "spawnLiveSaleDataPollingMachine",
        },
      ],
    },
    readyForPurchase: {
      description:
        "This state is activated when all necessary context is available and the project is in a purchasable state. The corresponding machine (currently only purchase initiation, with bidding to be implemented) is initiated to manage the sale process. If the project becomes non-purchasable or any essential context is lost, the machine reverts to the 'idle' state.",
      entry: {
        type: "spawnAndAssignPurchaseInitiationMachine",
      },
      always: [
        {
          target: "idle",
          guard: "isNotPurchasable",
          actions: {
            type: "stopAndAssignPurchaseInitiationMachine",
          },
        },
      ],
    },
    readyForRamBid: {
      entry: {
        type: "spawnAndAssignRAMBidMachine",
      },
      always: [
        {
          target: "idle",
          guard: "isNotRAMBiddable",
          actions: "stopAndAssignRAMBidMachine",
        },
      ],
    },
    projectSaleComplete: {},
    error: {},
    projectIneligibleForPrimarySale: {},
  },
});

export {
  deserializeSnapshot,
  getSerializedSnapshotWithProjectData,
  generateMinterDescription, // TODO: This should be moved to a more appropriate location, general utils
} from "./utils";
