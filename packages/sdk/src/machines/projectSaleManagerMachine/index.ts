import { PublicClient, WalletClient } from "viem";
import {
  ActorRefFrom,
  assign,
  enqueueActions,
  fromPromise,
  setup,
} from "xstate";
import { abGraphQLClient, getMessageFromError } from "../helpers";
import { purchaseTrackingManagerMachine } from "../purchaseTrackingManagerMachine";
import {
  LiveSaleData,
  ProjectDetails,
  ProjectIneligibleForPrimarySaleError,
  getProjectDetailsDocument,
  isProjectComplete,
  isProjectIneligibleForPrimarySale,
  isProjectPurchasable,
} from "./helpers";
import { liveSaleDataPollingMachine } from "./liveSaleDataPollingMachine";
import { purchaseInitiationMachine } from "./purchaseInitiationMachine";

type ProjectSaleManagerMachineEvents =
  | {
      type: "PUBLIC_CLIENT_AVAILABLE";
      data: PublicClient;
    }
  | {
      type: "PUBLIC_CLIENT_UNAVAILABLE";
    }
  | {
      type: "WALLET_CLIENT_AVAILABLE";
      data: WalletClient;
    }
  | {
      type: "WALLET_CLIENT_UNAVAILABLE";
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
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  project?: ProjectDetails;
  liveSaleData?: LiveSaleData;
  errorMessage?: string;
  projectIneligibleReason?: string;
  purchaseTrackingManagerMachine?: ActorRefFrom<
    typeof purchaseTrackingManagerMachine
  >;
  purchaseInitiationMachine?: ActorRefFrom<typeof purchaseInitiationMachine>;
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
 * 'readyForSale' state, where it spawns the PurchaseInitiationMachine to handle
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
      publicClient?: PublicClient;
      walletClient?: WalletClient;
      project?: ProjectDetails;
    },
    context: {} as ProjectSaleManagerMachineContext,
    events: {} as ProjectSaleManagerMachineEvents,
  },
  actors: {
    fetchProjectDetails: fromPromise(
      async ({
        input,
      }: {
        input: { projectId?: string };
      }): Promise<NonNullable<ProjectDetails>> => {
        const { projectId } = input;

        // This is an expected case for non-AB projects so we throw a custom error
        // and transition to a non-error state.
        if (!projectId) {
          throw new ProjectIneligibleForPrimarySaleError(
            "No Art Blocks project ID provided. Primary sale not available."
          );
        }

        const res = await abGraphQLClient.request(getProjectDetailsDocument, {
          projectId,
        });

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
  },
  actions: {
    assignWalletClient: assign({
      walletClient: (_, params: { walletClient: WalletClient | undefined }) =>
        params.walletClient,
    }),
    assignPublicClient: assign({
      publicClient: (_, params: { publicClient?: PublicClient }) =>
        params.publicClient,
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
        const publicClient = context.publicClient;

        if (!project) {
          console.warn("No project found in context");
          return;
        }

        if (!publicClient) {
          console.warn("No public client found in context");
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
            publicClient,
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
        if (
          !context.publicClient ||
          !context.walletClient ||
          !context.project
        ) {
          return;
        }

        return spawn("purchaseInitiationMachine", {
          systemId: "purchaseInitiationMachine",
          id: "purchaseInitiationMachine",
          input: {
            publicClient: context.publicClient,
            walletClient: context.walletClient,
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
  },
  guards: {
    isNotPurchasable: ({ context }) => {
      return !isProjectPurchasable(context);
    },
    isPurchasable: ({ context }) => {
      return isProjectPurchasable(context);
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
      return !Boolean(context.publicClient);
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AVmAxgFwGUBDAGzAFkiA7ImVSnACwEsqwBiABQFUAhAGQCSAYQD6woQFEAcgBVRAQQBqCwfwUDJAbQAMAXUQp0sZnmboqhkAA9EARh0B2HQDoAbHbsfHbxwE4ADgAWACYAVgAaEABPez8AZhd4sMCguxCAzICnIIBfXKi0LFxCUgpqWjB6IiZWDh4BEXEpOVFuaWVVdU1dAyQQZGNTc0t+2wQ7eP8XTx0QkIc3N3jQyJi4xOTUxwC-EPj4-fzCjGx8YjJKGjoGFjZ2AHUFfn5JeQlBGXlOtQ1X3qsgxMZgsVnGUz8Ln8OjCOgCSzsfiCcyCUViEwSSRSwXSWWyjjyBQGpxKF3K1yqtzqj2er3eLXk7R+3X++kBQxBo1A42cARcfg8bjCYTcIT8PiCATRGyxqVxWScjmOxOK5zKV0q1Vq9x4ACVhAAJBQESSiWS6hTCADSgmkAHFROQFB07ZJdY7LQbbabmX9tGz+kDhqCxogALR2AluGZ+MKShJeeZhOzShDCvnwyYhHRzXbpPzKopnUqXCo3Gp3ercfVGk1mi3W20Op0ut0ew3etodFS-HoBozAkZg8ORkX8sKOeb7MUBfwhVOOYVYoKORfiic6BKFklq0sUrWV9hu3UAeV1AMDHKHoYQYcXIRcQTc2SFYQyQWTKfWGKC-NnE7sYVAICeJt1VEtyU1Kl7iEJRTQIZ5TQAEQUWQFFEAAxN5DUkJCLwHYMuRsEcdBWFwAmTZ8QlCAI7FRb9EV-QJF0cQDkzCECwOLMkNXLbUwBcAAzMA8G1KBOB3PAkKIPAiHYCALAE1gADd0AAawEotSXVMtKQrOohJEsSJPA6TZIQFT0BwGSRl6fCBivENuXDVjEg4kUHA3Wi-FTJY+TCeJvIhZZ4k8LjtL3KD9LYQzRLucTJLMuSqgwVAXGQEgZME9BUAAW3SySeN0g8DOEuLWAS0yZKICyqFU6zOTs-sHMHJziNvVdXDYvxALcAVkVCVMHDSJI3B0LMepCScjiJLTd0gvjKxcZgIDIdh7KDTlhwQFZEifALaIcdIPHo9E31-UKdA-ScYQOXZwvm3i9P45bVo4LQ7D6AitpvULEmySb3x0ZYEl8lcXHCYUcz6jJZyVWbCp0-doKUt71pCL6WsI7bdsfIVAtmY66IXXYklCNwPyWcIAgyB6IKekqYpWtatHiTHNuvZydr6lwYXzXxAkOHxUwFPkeoCqnxuRJw6aK5HotRlmgnZxyiPBeJo3iQJxW8UIVyGpw7CSGExQ-HM-HFWWkail7mfesIVdatXEAORwkmoxdk3Gqn5wYuwQJcN8QjG9I6KcQKrcixaDNQMAiAgaIMJysl1uajm2vGSZI0DvYppXeIYTSRwhuD38aPN8Unxp+GiSodAIDgQFEaj57K3ZJ3tojbNEgyCm+vFHrJylb8gg18jhqcGEPHxQkTnAuWbaWsrjMS6r2+xm8IzYiH4SfC3-EjDJUxxKFYw8PZ0h2SOFtbgy7fXn6ubDA4jbokUrqCa7IzcBcCVPkVky0QWIiAsCN57W2jjFWO8dE7JzKA-Tm7V0ihEDk+Q44pdhOHFCLLw-IC6ZBzJODiMJr4MxRgVcBZBhDoFyhlESYAEEZ3sFMI2E4poTlXBrKYx8HC8z6oiWEqwVygLntxCBt8YopRyow52ExR6uGnOLfYFF0hrDOh+XmUxobuQLmkUhxVyFzTwIINgJBmBQGYAAIzIEnVAElmC5SIKgaIZIZHbUmGRTc8xMH9wcPEXyvg-zZlhE4DIb4Aj5HyEAA */
  id: "projectSaleManagerMachine",
  context: ({ input }) => ({
    projectId: input.projectId,
    publicClient: input.publicClient,
    walletClient: input.walletClient,
    project: input.project,
  }),
  initial: "fetchingProjectData",
  on: {
    PUBLIC_CLIENT_AVAILABLE: [
      {
        actions: [
          {
            type: "assignPublicClient",
            params: ({ event }) => ({
              publicClient: event.data,
            }),
          },
        ],
      },
    ],

    PUBLIC_CLIENT_UNAVAILABLE: [
      {
        actions: [
          {
            type: "assignPublicClient",
            params: { publicClient: undefined },
          },
        ],
      },
    ],

    WALLET_CLIENT_AVAILABLE: {
      actions: {
        type: "assignWalletClient",
        params: ({ event }) => ({
          walletClient: event.data,
        }),
      },
    },

    WALLET_CLIENT_UNAVAILABLE: [
      {
        actions: {
          type: "assignWalletClient",
          params: { walletClient: undefined },
        },
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
        input: ({ context }) => ({ projectId: context.projectId }),
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
          target: "readyForSale",
          guard: "isPurchasable",
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
    readyForSale: {
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
    projectSaleComplete: {},
    error: {},
    projectIneligibleForPrimarySale: {},
  },
});
