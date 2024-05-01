import { Hex, PublicClient, WalletClient } from "viem";
import { ActorRefFrom, AnyActorRef, assign, fromPromise, setup } from "xstate";
import { projectSaleManagerMachine } from "..";
import {
  getMessageFromError,
  isHolderMinterType,
  isMerkleMinterType,
  isUserRejectedError,
} from "../../helpers";
import { ProjectDetails } from "../helpers";
import { liveSaleDataPollingMachine } from "../liveSaleDataPollingMachine";
import {
  getHolderMinterUserPurchaseContext,
  getMerkleMinterUserPurchaseContext,
  initiateBasePurchase,
  initiateHolderMinterPurchase,
  initiateMerkleMinterPurchase,
} from "./helpers";

export type PurchaseInitiationMachineEvents =
  | {
      type: "INITIATE_PURCHASE";
      purchaseToAddress?: Hex;
    }
  | {
      type: "RESET";
    };

type AdditionalPurchaseData = {
  allowlist?: Hex[];
  erc20Allowance?: bigint;
  erc20Balance?: bigint;
  decimals?: bigint;
  allowedTokenId?: string;
  vaultAddress?: Hex;
};

export type PurchaseInitiationMachineContext = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  project: NonNullable<ProjectDetails>;
  projectSaleManagerMachine: AnyActorRef; // This is necessary to avoid circular dependencies
  purchaseToAddress?: Hex;
  errorMessage?: string;
  additionalPurchaseData?: AdditionalPurchaseData;
  userIneligibilityReason?: string;
};

// Use this type to ensure that the `projectSaleManagerMachine` is correctly typed
export type PurchaseInitiationMachineContextWithFullTypes =
  PurchaseInitiationMachineContext & {
    projectSaleManagerMachine: ActorRefFrom<typeof projectSaleManagerMachine>;
  };

export type PurchaseInitiationMachineInput = Pick<
  PurchaseInitiationMachineContext,
  "publicClient" | "walletClient" | "project" | "projectSaleManagerMachine"
>;

export type UserPurchaseContext =
  | {
      isEligible: true;
      additionalPurchaseData?: AdditionalPurchaseData;
    }
  | {
      isEligible: false;
      ineligibilityReason: string;
    };

/**
 * The PurchaseInitiationMachine is responsible for handling the specific user
 * interactions and steps involved in initiating a purchase within the Art Blocks
 * platform. It is spawned by the ProjectSaleManagerMachine when a project is ready
 * for sale and all necessary context is available.
 *
 * The machine starts in the 'gettingUserPurchaseEligibilityAndContext' state, where
 * it determines the user's eligibility to make a purchase and retrieves any additional
 * context required for the purchase process. This includes checking whether the user
 * is on the allowlist for allowlist-based minters (MerkleMinter) and fetching the
 * necessary data, such as the user's token balance and allowance.
 *
 * If the user is eligible for the purchase, the machine transitions to the
 * 'readyForPurchase' state, indicating that it is prepared to initiate the purchase
 * process. If the user is ineligible, the machine moves to the
 * 'userIneligibleForPurchase' state.
 *
 * When the 'INITIATE_PURCHASE' event is received in the 'readyForPurchase' state, the
 * machine transitions to the 'initiatingPurchase' state. In this state, it invokes the
 * 'initiatePurchase' service, which handles the actual purchase transaction. The service
 * interacts with the appropriate minter contract (e.g., SharedMinterSimplePurchase or
 * SharedMinterMerkle) based on the project's minter type. It prepares the necessary
 * transaction parameters, such as the purchase price and any required proofs, and
 * submits the purchase transaction to the blockchain.
 *
 * If the purchase transaction is successful, the machine sends the transaction hash to
 * the PurchaseTrackingManagerMachine (via the ProjectSaleManagerMachine) for further
 * tracking and returns to the 'readyForPurchase' state, allowing for additional
 * purchases if desired.
 *
 * If the user cancels the transaction (user-rejected error), the machine transitions
 * back to the 'readyForPurchase' state, allowing them to initiate the purchase again.
 * If any other error occurs during the purchase process, the machine moves to the
 * 'error' state.
 *
 * The PurchaseInitiationMachine receives a reference to the ProjectSaleManagerMachine
 * during its initialization, allowing it to access the most up-to-date context data,
 * such as the current price of the artwork, without the need to duplicate event handling
 * or state management. It also uses the LiveSaleDataPollingMachine to ensure that the
 * current price and other sale-related data remain up to date throughout the purchase
 * process.
 */
export const purchaseInitiationMachine = setup({
  types: {
    input: {} as Pick<
      PurchaseInitiationMachineContext,
      "project" | "publicClient" | "walletClient" | "projectSaleManagerMachine"
    >,
    context: {} as PurchaseInitiationMachineContext,
    events: {} as PurchaseInitiationMachineEvents,
  },
  actors: {
    getUserPurchaseEligibilityAndContext: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          | "walletClient"
          | "publicClient"
          | "project"
          | "projectSaleManagerMachine"
        >;
      }): Promise<UserPurchaseContext> => {
        const { walletClient, project } = input;

        // This shouldn't happen but is necessary for type checking
        if (!walletClient.account) {
          throw new Error("Wallet client not connected");
        }

        if (
          isMerkleMinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await getMerkleMinterUserPurchaseContext(input);
        }

        if (
          isHolderMinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await getHolderMinterUserPurchaseContext(input);
        }

        return {
          isEligible: true,
        };
      }
    ),
    initiatePurchase: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          | "publicClient"
          | "walletClient"
          | "project"
          | "projectSaleManagerMachine"
          | "purchaseToAddress"
          | "additionalPurchaseData"
        >;
      }): Promise<Hex> => {
        const { project } = input;

        if (
          isMerkleMinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await initiateMerkleMinterPurchase(input);
        }

        if (
          isHolderMinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await initiateHolderMinterPurchase(input);
        }

        return await initiateBasePurchase(input);
      }
    ),
    liveSaleDataPollingMachine,
  },
  actions: {
    assignPurchaseToAddress: assign({
      purchaseToAddress: (_, params: { purchaseToAddress?: Hex }) =>
        params.purchaseToAddress,
    }),
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
    resetPurchaseContext: assign({
      additionalPurchaseData: undefined,
      purchaseToAddress: undefined,
      errorMessage: undefined,
    }),
    sendTransactionHashToPurchaseTrackingManagerMachine: (
      { context },
      params: { txHash: Hex }
    ) => {
      const purchaseTrackingManagerMachine = (
        context.projectSaleManagerMachine as ActorRefFrom<
          typeof projectSaleManagerMachine
        >
      ).getSnapshot().context.purchaseTrackingManagerMachine;

      if (!purchaseTrackingManagerMachine) {
        return;
      }

      purchaseTrackingManagerMachine.send({
        type: "PURCHASE_INITIATED",
        txHash: params.txHash,
      });
    },
    assignAdditionalPurchaseData: assign({
      additionalPurchaseData: (
        _,
        params: { additionalPurchaseData?: AdditionalPurchaseData }
      ) => params.additionalPurchaseData,
    }),
    assignUserIneligibilityReason: assign({
      userIneligibilityReason: (
        _,
        params: { userIneligibilityReason?: string }
      ) => params.userIneligibilityReason,
    }),
  },
  guards: {
    isUserRejectedError: (_, { error }: { error: unknown }) => {
      return isUserRejectedError(error);
    },
    isUserEligibleForPurchase: (
      _,
      { userPurchaseContext }: { userPurchaseContext: UserPurchaseContext }
    ) => {
      return userPurchaseContext.isEligible;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAnAxgCwIazAEkA7ASwBdTdKB7YgWVx1OLAGIAlAUQGUuAVANoAGALqIUNWBVJ0JIAB6IAtAGZhATgB0AdlUAOfRoCMAFgBsO4auPnTAGhABPRMYBMAVi3HNxo3f03a1UdAF9QxzQsPAISGWpZBiZsFjAtGHJKYigAVQJ0AAUMHHwwLgAbUihSACNSSvInAEFiCABhOnIwBXI2CDo0lgA3GgBrNKiS2LJKBLpGZlZ0sEyWXPyi6NKKqtr6imbWjuIunoRhmkw54hFRW-lkKRk5JEVXYy8-DWFjVVVTfQecz6czmRwuBAWLwaPQ6HQaQKeDRuDThSLFGJEGZUWhJRZpDJZdZgQoY7aVap1BqHdqdbq9fpLC7jLSTTFxWa4hYpJaEtZ5EmbKZlCl7aktWknennYgjK6426CYziV6PaS4+RKBC2YxaUyqb5mRHCPQOZyuNzmLTmXzCNwfIE6TyqNEgNmlDk4xLc1LLVbZAWkrYEHaU-aNCXHU69EnoGjoVnlagAM3jAFtWWTpvEuclfXyAxssyLdlSDpG6WcLvLEoqxA8nhrXlr7do7aYNOYDeY3H8PADwYh9DYtCYjH5+3aQWEIm7i57rj6lugwLgIE4AGLxoWYtiEAByhH4hCa-C4AH0CjkOG0ABJNPj3VWNxKa96dvUGNxWVTf1QeYxBwQS1VC0H4bB0UxTDhO07Fdd1s05b08yZbEEmyHdSj6AYtGZCZ5zQ3N8Vwwi1kwggZTla46xVSR1VfZt3ncbwbRhDxkV-ExVCA-UdD1Dt9Q8FEdF+YdTHggic2Q4iWCkjDizYWN40TFN00zYMsSk+YUMGUj5I0yjLmosQnzo55iDfbV3FAkEfmRDx9A+E0gPMIEwJBHVhECOxXIkjSFyInldLkqByPYJSE2QJNyFTdAMwQzSkO0mS9NC4tDJrOhFWVBt6JeUAtWMdw3E-Nxv0tfRTCEnQwXNBBINMPUEXtGxQUcnQPHCWdiBoCA4AeSSkrxILcvMyy1Eg3Rf1MTwqrhUx3CAoqtH+djQVc8xkVscTZwSgLpKCv0iUDMLQzFcsjkrchRqbAqVF-K09DcGb+w8ebFrqixQI0DxrH0axLE2hy-OFfbksOlc103bdixuhi7oQRzQKBX9LV+1bjB0Hj9D4qrrChUEyv+cwQfZUjwd9WSkP04U4fyt5tRtUC8aglEXuMZEeK7Ud0ZsX8HJMN7SY9cnht9CK6YsxjGb0a0-AWu12KBDQzQhSq+MtYQAUBYQ3pxzrdsGr0KaWVB8hIMBRRqcowC3INaefPKpYRj4cZWowOtUVy3u-DQgIRLRKrW9wtasYcSa6oA */
  id: "purchaseInitiationMachine",
  context: ({ input }) => ({
    publicClient: input.publicClient,
    walletClient: input.walletClient,
    project: input.project,
    projectSaleManagerMachine: input.projectSaleManagerMachine,
  }),
  initial: "gettingUserPurchaseEligibilityAndContext",
  on: {
    RESET: {
      actions: {
        type: "resetPurchaseContext",
      },
      target: ".gettingUserPurchaseEligibilityAndContext",
    },
  },
  states: {
    gettingUserPurchaseEligibilityAndContext: {
      invoke: {
        src: "getUserPurchaseEligibilityAndContext",
        input: ({ context }) => ({
          walletClient: context.walletClient,
          publicClient: context.publicClient,
          project: context.project,
          projectSaleManagerMachine: context.projectSaleManagerMachine,
        }),
        onDone: [
          {
            target: "readyForPurchase",
            actions: {
              type: "assignAdditionalPurchaseData",
              params: ({ event }) => {
                return {
                  additionalPurchaseData: event.output.isEligible
                    ? event.output.additionalPurchaseData
                    : undefined,
                };
              },
            },
            guard: {
              type: "isUserEligibleForPurchase",
              params: ({ event }) => ({
                userPurchaseContext: event.output,
              }),
            },
          },
          {
            target: "userIneligibleForPurchase",
            actions: {
              type: "assignUserIneligibilityReason",
              params: ({ event }) => ({
                userIneligibilityReason: !event.output.isEligible
                  ? event.output.ineligibilityReason
                  : undefined,
              }),
            },
          },
        ],
        onError: {
          target: "error",
          actions: {
            type: "assignErrorMessageFromError",
            params: ({ event }) => ({
              error: event.error,
            }),
          },
        },
      },
    },
    readyForPurchase: {
      on: {
        INITIATE_PURCHASE: {
          target: "initiatingPurchase",
          actions: {
            type: "assignPurchaseToAddress",
            params: ({ event }) => ({
              purchaseToAddress: event.purchaseToAddress,
            }),
          },
        },
      },
    },
    initiatingPurchase: {
      invoke: {
        src: "initiatePurchase",
        input: ({ context }) => ({
          publicClient: context.publicClient,
          walletClient: context.walletClient,
          project: context.project,
          purchaseToAddress: context.purchaseToAddress,
          projectSaleManagerMachine: context.projectSaleManagerMachine,
          additionalPurchaseData: context.additionalPurchaseData,
        }),
        onDone: {
          target: "readyForPurchase",
          actions: [
            {
              type: "sendTransactionHashToPurchaseTrackingManagerMachine",
              params: ({ event }) => ({
                txHash: event.output,
              }),
            },
            {
              type: "resetPurchaseContext",
            },
          ],
        },
        onError: [
          {
            target: "readyForPurchase",
            guard: {
              type: "isUserRejectedError",
              params: ({ event }) => ({
                error: event.error,
              }),
            },
          },
          {
            target: "error",
            actions: {
              type: "assignErrorMessageFromError",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
            },
          },
        ],
      },
    },
    error: {},
    userIneligibleForPurchase: {},
  },
});
