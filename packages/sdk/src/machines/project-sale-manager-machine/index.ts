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
  isProjectPostRAM,
  isProjectPurchasable,
  isProjectRAMBiddable,
} from "./utils";
import { liveSaleDataPollingMachine } from "./live-sale-data-polling-machine";
import { purchaseInitiationMachine } from "../purchase-initiation-machine";
import { ArtBlocksClient } from "../..";
import { ramMachine } from "../ram-machine";
import { postRAMMachine } from "../post-ram-machine";

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
    }
  | {
      type: "FORCE_LIVE_SALE_DATA_POLL";
    };

export type ProjectSaleManagerMachineContext = {
  projectId?: string;
  chainId: number;
  artblocksClient: ArtBlocksClient;
  project?: ProjectDetails;
  liveSaleData?: LiveSaleData;
  errorMessage?: string;
  projectIneligibleReason?: string;
  purchaseTrackingManagerMachine?: ActorRefFrom<
    typeof purchaseTrackingManagerMachine
  >;
  purchaseInitiationMachine?: ActorRefFrom<typeof purchaseInitiationMachine>;
  ramMachine?: ActorRefFrom<typeof ramMachine>;
  postRAMMachine?: ActorRefFrom<typeof postRAMMachine>;
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
      chainId: number;
    },
    context: {} as ProjectSaleManagerMachineContext,
    events: {} as ProjectSaleManagerMachineEvents,
  },
  actors: {
    fetchProjectDetails: fromPromise(
      async ({
        input,
      }: {
        input: {
          projectId?: string;
          artblocksClient: ArtBlocksClient;
          chainId: number;
        };
      }): Promise<NonNullable<ProjectDetails>> => {
        const { projectId, artblocksClient, chainId } = input;

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
            chainId,
          }
        );

        // We don't expect this to happen, so throw a normal error
        // instead of a custom one to trigger a transition to the
        // error state
        const project = res.projects_metadata[0];
        if (!project) {
          throw new Error("Project not found");
        }

        return project;
      }
    ),
    liveSaleDataPollingMachine,
    purchaseInitiationMachine,
    ramMachine,
    postRAMMachine,
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
    spawnAndAssignRamMachine: assign({
      ramMachine: ({ spawn, context, system }) => {
        if (!context.project) {
          return;
        }

        const liveSaleDataPollingMachineRef = system.get(
          "liveSaleDataPollingMachine"
        );
        if (!liveSaleDataPollingMachineRef) {
          return;
        }

        return spawn("ramMachine", {
          systemId: "ramMachine",
          id: "ramMachine",
          input: {
            artblocksClient: context.artblocksClient,
            project: context.project,
            liveSaleDataPollingMachineRef: liveSaleDataPollingMachineRef,
          },
        });
      },
    }),
    stopAndAssignRamMachine: enqueueActions(({ enqueue }) => {
      enqueue.stopChild("ramMachine");
      enqueue.assign({
        ramMachine: undefined,
      });
    }),
    spawnAndAssignPostRAMMachine: assign({
      postRAMMachine: ({ spawn, context }) => {
        if (!context.project) {
          return;
        }

        return spawn("postRAMMachine", {
          systemId: "postRAMMachine",
          id: "postRAMMachine",
          input: {
            artblocksClient: context.artblocksClient,
            project: context.project,
          },
        });
      },
    }),
    forceLiveSaleDataPoll: enqueueActions(({ system }) => {
      const liveSaleDataPollingMachineRef = system.get(
        "liveSaleDataPollingMachine"
      );
      if (!liveSaleDataPollingMachineRef) {
        return;
      }
      (
        liveSaleDataPollingMachineRef as ActorRefFrom<
          typeof liveSaleDataPollingMachine
        >
      ).send({ type: "FORCE_POLLL" });
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
    isPostRAM: ({ context }) => {
      return isProjectPostRAM(context);
    },
    isNotPostRAM: ({ context }) => {
      return !isProjectPostRAM(context);
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
      return !context.artblocksClient.getPublicClient(context.chainId);
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwGUBDAGzAFkiA7ImVSnACwEsqwBiAQQCUAVAfQBCAGQDyAYQDSBfuOEBJAKIA5AQFUACgBFOvRVoDaABgC6iFOljM8zdFXMgAHogCMANgBMADgB0XlwDsAMzeAJwALC4eweEANCAAnojhAKzhPgEB4dluLl4pQQVuAQC+JfFoWLiEpBTUtGD0REysHBpq3OIAEpwEivy83JxS8soA4vzknMqcY4rck8Ndo-2cAGqc8sKcIorGZkggyJbWtvaHzggAtO5BAT4uUSkud55B4aEe8UkIWb4pKQCLjSHneoRSnzKFQw2HwxDIlBodAYLDY7HanR6fQGQxG40WMzmCym3RW-DUMw2Wx2wj2pgcxysNjsDkuNzc4XuXiyHnCxQCbiMRhC30QERSPiMKSMuSMeUCANK5SOMOq8LqSMaKNa7Hm3FE3H2DJOzPOoDZHKCPiC+SMXlCoSygJSX0SiBt6TcXneUoCgM8oSCUJVVThtURDSaLTRCjW-QInFp-B0vE4-AAYopeN19EbDozTiyLogrp8JQLuTLueEPByXKKEB6fF6fc6BR5A8HKrCagj6sjmqiwD4AGZgPDRqAaVX4LREPBEdgQOzD1gAN3QAGth921eH+1rB61R+PJ9PQ3g5wuEOv0Dh52d9nmLEyzqyS4L0tLa4U5W4IkEDb5L4oLhEY3hCqCmQpF2M69hqkbamwJ4TqiU5wVei6NBgqA+MgJDziO6CoAAtnhcHqhGA7RsOY6oaw6EXphN5UBu96mk+9L5iab7Ftcbi5JKAQdmBLg1i63oNlEQQuJKAKhMUjzcl6biwRelEHlGQ4+MwEBkOwz5HDxRbmq4qRGNaoTAo6sotq6PxeukXi5AUdxGFkRjhGpPYaZqWnHrp+kGC4BwvoWZpOGZHgWcEBTekC-41kB7l+DKALAkEbgugJ3l7n2flIauekcAYHihUZr4mZFCBidKlnWQKLhViKboIBEoR+IG-5ZTKHh9blYb5YhR7IYFJVBOVBamu+NWchKjp+hyRhWeB4FSU8PiApynliS8HxKtC6n7gVI1FUF4STcZEWXGJwl+IKIQuIGYlZQEUnvFaNpeHy3hZdkUoDfBVGHjROnFQZKSXZV11mfkDxeO53jeDaLZSQUX4hG4QSfEKCkuIDvnDaDY0GW4UPhTNYmZT4ta+g6vpZVJr3Wp5KTOZ5IScwTx1E9pJMGAE5PTXxYnZDT0qOvK7y8m9rV5AUPiRPkbPgT13jc0N1HaagYBEBACTpsRGgAK6oEwRCwCVXFhcLpkIHy9zPLaCmRLWT2yz8TXhCBaSZUCISq14GsIVrx463rBvEdwRAkQZ1sVRTfHSm4ispIKgRY3yYFuO97ybStmVszWoSeWUypUOgEBwAyFE86HbDGtDM03Mt6TRWC2QeC6CmhA2EL3JlwIdu5DrhHcwfA-5yF0WeGHzkQjeJ3bLd8jTwofJ33f-lJwqyR8tXvHkXg-hPmmFWDZCL7b1VXH1HiSp4nhePaeSRIzrUu4rVne+n-gCfjypdyDRDiDbWut9aG1QCbM2jALZgCvrxO2mQvzejZkCLu-hnI7zuIrIImU367TTkHQBtdNagLDuAyOqBo4kQQVVS4zl0jgj5MUTy+Q8i9zlpzOSMkmqIwegdEMPk67kOQoyPAQxyB0JhggDwLx74Ag9KkGSbNn5SW9ukLIY8Preg5GzU+J1QZAPguIdAJF8LjngdxJufE5EOkVryUI3IHR+ntDnD+AQLKeFVt+RKHYDG82PNhYi0iZp9TZpKdhqQfp8hSA2TxEpVHuSyt1B0ADDrCLIVPHccF5BsBIMwKAzAABGZBIHTmYCRIgqAEjqlCbY9wskIipCeh2FGgFWrH3+HgqIQpAQyyVGUIAA */
  id: "projectSaleManagerMachine",
  context: ({ input }) => ({
    projectId: input.projectId,
    chainId: input.chainId,
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
    FORCE_LIVE_SALE_DATA_POLL: {
      actions: {
        type: "forceLiveSaleDataPoll",
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
          chainId: context.chainId,
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
          target: "readyForRam",
          guard: "isRAMBiddable",
        },
        {
          target: "postRAM",
          guard: "isPostRAM",
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
    readyForRam: {
      entry: {
        type: "spawnAndAssignRamMachine",
      },
      always: [
        {
          target: "idle",
          guard: "isNotRAMBiddable",
          actions: "stopAndAssignRamMachine",
        },
      ],
    },
    postRAM: {
      entry: {
        type: "spawnAndAssignPostRAMMachine",
      },
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
