import { Hex } from "viem";
import {
  ActorRefFrom,
  AnyActorRef,
  assign,
  emit,
  fromPromise,
  setup,
} from "xstate";
import { projectSaleManagerMachine } from "../project-sale-manager-machine";
import {
  getMessageFromError,
  isERC20MinterType,
  isHolderMinterType,
  isMerkleMinterType,
  isRAMMinterType,
  isUserRejectedError,
} from "../utils";
import {
  LiveSaleData,
  ProjectDetails,
} from "../project-sale-manager-machine/utils";
import {
  checkERC20Allowance,
  getERC20Decimals,
  getHolderMinterUserPurchaseContext,
  getMerkleMinterUserPurchaseContext,
  getRAMMinterUserPurchaseContext,
  initiateBasePurchase,
  initiateERC20AllowanceApproval,
  initiateERC20Purchase,
  initiateHolderMinterPurchase,
  initiateMerkleMinterPurchase,
  isERC20AllowanceSufficient,
  UserIneligibilityReason,
} from "./utils";
import { ArtBlocksClient } from "../..";
import { BidDetailsFragment } from "../../generated/graphql";

export type PurchaseInitiationMachineEvents =
  | {
      type: "INITIATE_PURCHASE";
      purchaseToAddress?: Hex;
    }
  | {
      type: "RESET";
    }
  | {
      type: "APPROVE_ERC20_ALLOWANCE";
      amount: bigint;
    };

type AdditionalPurchaseData = {
  allowlist?: Hex[];
  userAllowlistAddresses?: Hex[];
  decimals?: number;
  allowedTokenId?: string;
  vaultAddress?: Hex;
  erc20Allowance?: bigint;
  userBids?: Array<BidDetailsFragment>;
  remainingMints?: bigint | null;
};

export type PurchaseInitiationMachineContext = {
  artblocksClient: ArtBlocksClient;
  project: NonNullable<ProjectDetails>;
  projectSaleManagerMachine: AnyActorRef; // This is necessary to avoid circular dependencies
  purchaseToAddress?: Hex;
  errorMessage?: string;
  additionalPurchaseData?: AdditionalPurchaseData;
  userIneligibilityReason?: UserIneligibilityReason;
  initiatedTxHash?: Hex;
  erc20ApprovalAmount?: bigint;
  erc20ApprovalTxHash?: Hex;
};

// Use this type to ensure that the `projectSaleManagerMachine` is correctly typed
export type PurchaseInitiationMachineContextWithFullTypes =
  PurchaseInitiationMachineContext & {
    projectSaleManagerMachine: ActorRefFrom<typeof projectSaleManagerMachine>;
  };

export type PurchaseInitiationMachineInput = Pick<
  PurchaseInitiationMachineContext,
  "artblocksClient" | "project" | "projectSaleManagerMachine"
>;

export type UserPurchaseContext =
  | {
      isEligible: true;
      additionalPurchaseData?: AdditionalPurchaseData;
    }
  | {
      isEligible: false;
      ineligibilityReason: UserIneligibilityReason;
      additionalPurchaseData?: AdditionalPurchaseData;
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
 * 'waitingForStart' state, where it polls until the sale has officially started.
 * Once the sale begins, it automatically transitions to 'readyForPurchase'. If the
 * user is ineligible, the machine moves to the 'userIneligibleForPurchase' state.
 * This approach prepares and makes available all necessary purchase context before
 * the sale actually begins, allowing users to visit a sale page and see if they're
 * eligible (for example, if they're on an allowlist) even before the sale starts.
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
      "project" | "artblocksClient" | "projectSaleManagerMachine"
    >,
    context: {} as PurchaseInitiationMachineContext,
    events: {} as PurchaseInitiationMachineEvents,
    emitted: {} as {
      type: "purchaseInitiated";
      txHash: Hex;
      chainId: number;
    },
  },
  actors: {
    getUserPurchaseEligibilityAndContext: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          "artblocksClient" | "project" | "projectSaleManagerMachine"
        >;
      }): Promise<UserPurchaseContext> => {
        const { artblocksClient, project } = input;
        const publicClient = artblocksClient.getPublicClient(project.chain_id);
        const walletClient = artblocksClient.getWalletClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        // This shouldn't happen but is necessary for type checking
        if (!walletClient?.account) {
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

        if (
          isERC20MinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          const [decimals, erc20Allowance] = await Promise.all([
            getERC20Decimals(input),
            checkERC20Allowance(input),
          ]);

          return {
            isEligible: true,
            additionalPurchaseData: {
              decimals,
              erc20Allowance,
            },
          };
        }

        if (
          isRAMMinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await getRAMMinterUserPurchaseContext(input);
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
          | "artblocksClient"
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

        if (
          isERC20MinterType(project.minter_configuration?.minter?.minter_type)
        ) {
          return await initiateERC20Purchase(input);
        }

        return await initiateBasePurchase(input);
      }
    ),
    checkERC20Allowance: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          "artblocksClient" | "project" | "projectSaleManagerMachine"
        >;
      }): Promise<bigint> => {
        return await checkERC20Allowance(input);
      }
    ),
    initiateERC20AllowanceApproval: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          "artblocksClient" | "project" | "erc20ApprovalAmount"
        >;
      }): Promise<Hex> => {
        return await initiateERC20AllowanceApproval(input);
      }
    ),
    waitForERC20AllowanceApprovalConfirmation: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          PurchaseInitiationMachineContext,
          "artblocksClient" | "project" | "erc20ApprovalTxHash"
        >;
      }): Promise<void> => {
        const { artblocksClient, project } = input;
        const publicClient = artblocksClient.getPublicClient(project.chain_id);

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!input.erc20ApprovalTxHash) {
          throw new Error("ERC20 approval transaction hash not provided");
        }

        await publicClient.waitForTransactionReceipt({
          hash: input.erc20ApprovalTxHash,
        });
      }
    ),
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
    resetPurchaseContext: assign(({ context }) => {
      const updatedArtblocksClient =
        context.projectSaleManagerMachine.getSnapshot().context.artblocksClient;

      return {
        artblocksClient: updatedArtblocksClient ?? context.artblocksClient,
        additionalPurchaseData: undefined,
        purchaseToAddress: undefined,
        errorMessage: undefined,
        initiatedTxHash: undefined,
        erc20ApprovalAmount: undefined,
        erc20ApprovalTxHash: undefined,
        userIneligibilityReason: undefined,
      };
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
        chainId: context.project.chain_id,
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
        params: { userIneligibilityReason?: UserIneligibilityReason }
      ) => params.userIneligibilityReason,
    }),
    assignInitiatedTxHash: assign({
      initiatedTxHash: (_, params: { txHash: Hex }) => params.txHash,
    }),
    assignERC20ApprovalAmount: assign({
      erc20ApprovalAmount: (_, params: { approvalAmount: bigint }) =>
        params.approvalAmount,
    }),
    assignERC20ApprovalTxHash: assign({
      erc20ApprovalTxHash: (_, params: { txHash: Hex }) => params.txHash,
    }),
    emitPurchaseInitiatedEvent: emit(
      ({ context }, params: { txHash: Hex }) => ({
        type: "purchaseInitiated" as const,
        txHash: params.txHash,
        chainId: context.project.chain_id,
      })
    ),
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
    isERC20MinterType: ({ context }) => {
      return isERC20MinterType(
        context.project.minter_configuration?.minter?.minter_type
      );
    },
    isERC20AllowanceSufficient: (
      { context },
      { allowance }: { allowance?: bigint }
    ) => {
      return isERC20AllowanceSufficient(context.project, allowance);
    },
    isERC20AllowanceInsufficient: (
      { context },
      { allowance }: { allowance?: bigint }
    ) => {
      return !isERC20AllowanceSufficient(context.project, allowance);
    },
    isSaleStarted: ({ context }) => {
      const project = context.project;
      const liveSaleData: LiveSaleData =
        context.projectSaleManagerMachine.getSnapshot().context.liveSaleData;
      const walletClient = context.artblocksClient.getWalletClient();

      // TypeScript can't infer that this machine only runs when liveSaleData and walletClient
      // are available (they're guaranteed by parent machine preconditions), so we need an explicit
      // null check to satisfy the type checker
      if (!liveSaleData || !walletClient?.account) {
        return false;
      }

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
    },
  },
}).createMachine({
  /** @xstate-layout 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 */
  id: "purchaseInitiationMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    project: input.project,
    projectSaleManagerMachine: input.projectSaleManagerMachine,
  }),
  initial: "gettingUserPurchaseEligibilityAndContext",
  states: {
    gettingUserPurchaseEligibilityAndContext: {
      invoke: {
        src: "getUserPurchaseEligibilityAndContext",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          projectSaleManagerMachine: context.projectSaleManagerMachine,
        }),
        onDone: [
          {
            target: "waitingForStart",
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
    waitingForStart: {
      always: {
        target: "readyForPurchase",
        guard: "isSaleStarted",
      },
      after: {
        1000: {
          target: "waitingForStart",
          reenter: true,
        },
      },
      on: {
        RESET: {
          target: "gettingUserPurchaseEligibilityAndContext",
          actions: {
            type: "resetPurchaseContext",
          },
        },
      },
    },
    readyForPurchase: {
      on: {
        INITIATE_PURCHASE: [
          {
            target: "initiatingPurchase",
            actions: {
              type: "assignPurchaseToAddress",
              params: ({ event }) => ({
                purchaseToAddress: event.purchaseToAddress,
              }),
            },
            guard: {
              type: "isERC20AllowanceSufficient",
              params: ({ context }) => ({
                allowance: context.additionalPurchaseData?.erc20Allowance,
              }),
            },
          },
          {
            target: "awaitingERC20AllowanceApprovalAmount",
            actions: {
              type: "assignPurchaseToAddress",
              params: ({ event }) => ({
                purchaseToAddress: event.purchaseToAddress,
              }),
            },
          },
        ],
        RESET: {
          target: "gettingUserPurchaseEligibilityAndContext",
          actions: {
            type: "resetPurchaseContext",
          },
        },
      },
    },
    awaitingERC20AllowanceApprovalAmount: {
      on: {
        APPROVE_ERC20_ALLOWANCE: {
          target: "awaitingERC20AllowanceApprovalInitiation",
          actions: {
            type: "assignERC20ApprovalAmount",
            params: ({ event }) => ({
              approvalAmount: event.amount,
            }),
          },
          guard: {
            type: "isERC20AllowanceSufficient",
            params: ({ event }) => ({
              allowance: event.amount,
            }),
          },
        },
        RESET: {
          target: "gettingUserPurchaseEligibilityAndContext",
          actions: {
            type: "resetPurchaseContext",
          },
        },
      },
    },
    awaitingERC20AllowanceApprovalInitiation: {
      invoke: {
        src: "initiateERC20AllowanceApproval",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          erc20ApprovalAmount: context.erc20ApprovalAmount,
        }),
        onDone: [
          {
            target: "waitingForERC20AllowanceApprovalConfirmation",
            actions: {
              type: "assignERC20ApprovalTxHash",
              params: ({ event }) => ({
                txHash: event.output,
              }),
            },
          },
        ],
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
              params: ({ event }) => ({
                error: event.error,
              }),
            },
          },
        ],
      },
    },
    waitingForERC20AllowanceApprovalConfirmation: {
      invoke: {
        src: "waitForERC20AllowanceApprovalConfirmation",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          erc20ApprovalTxHash: context.erc20ApprovalTxHash,
        }),
        onDone: {
          target: "erc20AllowanceApproved",
        },
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
    erc20AllowanceApproved: {
      on: {
        INITIATE_PURCHASE: {
          target: "initiatingPurchase",
        },
        RESET: {
          target: "gettingUserPurchaseEligibilityAndContext",
        },
      },
    },
    initiatingPurchase: {
      invoke: {
        src: "initiatePurchase",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          purchaseToAddress: context.purchaseToAddress,
          projectSaleManagerMachine: context.projectSaleManagerMachine,
          additionalPurchaseData: context.additionalPurchaseData,
        }),
        onDone: {
          target: "purchaseInitiated",
          actions: [
            {
              type: "assignInitiatedTxHash",
              params: ({ event }) => ({
                txHash: event.output,
              }),
            },
            {
              type: "sendTransactionHashToPurchaseTrackingManagerMachine",
              params: ({ event }) => ({
                txHash: event.output,
              }),
            },
            {
              type: "emitPurchaseInitiatedEvent",
              params: ({ event }) => ({
                txHash: event.output,
              }),
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
    purchaseInitiated: {
      on: {
        RESET: {
          actions: {
            type: "resetPurchaseContext",
          },
          target: "gettingUserPurchaseEligibilityAndContext",
        },
      },
    },
    error: {
      on: {
        RESET: {
          actions: {
            type: "resetPurchaseContext",
          },
          target: "gettingUserPurchaseEligibilityAndContext",
        },
      },
    },
    userIneligibleForPurchase: {
      on: {
        RESET: {
          actions: {
            type: "resetPurchaseContext",
          },
          target: "gettingUserPurchaseEligibilityAndContext",
        },
      },
    },
  },
});
