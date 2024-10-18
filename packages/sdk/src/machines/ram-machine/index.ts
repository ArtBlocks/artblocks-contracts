import {
  Chain,
  Hex,
  JsonRpcAccount,
  SimulateContractReturnType,
  formatEther,
  getContract,
  parseEventLogs,
} from "viem";
import { ActorRefFrom, assign, fromPromise, setup, stateIn } from "xstate";
import { ArtBlocksClient } from "../..";
import { minterRAMV0Abi } from "../../../abis/minterRAMV0Abi";
import { BidDetailsFragment } from "../../generated/graphql";
import { graphql } from "../../generated/index";
import { liveSaleDataPollingMachine } from "../project-sale-manager-machine/live-sale-data-polling-machine";
import { ProjectDetails } from "../project-sale-manager-machine/utils";
import {
  getCoreContractAddressAndProjectIndexFromProjectId,
  getMessageFromError,
  isUserRejectedError,
} from "../utils";
import { dbBidIdToOnChainBidId, slotIndexToBidValue } from "./utils";

export type RAMMachineEvents =
  | {
      type: "SUBMIT_BID";
      bidSlotIndex: number;
    }
  | {
      type: "RESET";
      bidAction?: BidAction;
    }
  | {
      type: "BID_ACTION_CHOSEN";
      bidAction: BidAction;
    }
  | {
      type: "TOP_UP_BID_CHOSEN";
      bidId: string;
    }
  | {
      type: "BACK";
    };

type BidAction = "create" | "topUp";

type SimulateCreateBidRequest = SimulateContractReturnType<
  typeof minterRAMV0Abi,
  "createBid",
  readonly [bigint, `0x${string}`, number],
  Chain | undefined,
  JsonRpcAccount | undefined,
  Chain | undefined,
  JsonRpcAccount | undefined
>["request"];

type SimulateTopUpBidRequest = SimulateContractReturnType<
  typeof minterRAMV0Abi,
  "topUpBid",
  readonly [bigint, `0x${string}`, number, number],
  Chain | undefined,
  JsonRpcAccount | undefined,
  Chain | undefined,
  JsonRpcAccount | undefined
>["request"];

type SimulateCreateOrTopUpBidRequest =
  | SimulateCreateBidRequest
  | SimulateTopUpBidRequest;

export type RAMMachineContext = {
  // Client used to interact with ArtBlocks API with access to walletClient and publicClient
  artblocksClient: ArtBlocksClient;
  // Details of the project relevant to sale
  project: NonNullable<ProjectDetails>;
  // Error message that may arise during the bidding process
  errorMessage?: string;
  // List of user bids for the current project
  userBids: Array<BidDetailsFragment>;
  // Database ID of the bid that is being topped up (if applicable)
  topUpBidId?: string;
  // Slot index for the new bid or top up bid
  bidSlotIndex?: number;
  // Reference to the live sale data polling machine actor
  liveSaleDataPollingMachineRef: ActorRefFrom<
    typeof liveSaleDataPollingMachine
  >;
  // Transaction hash of the createBid or topUpBid transaction
  txHash?: Hex;
  // Transaction request object for the createBid or topUpBid transaction
  // Useful to resimulate a transaction that fails while polling for confirmation
  txRequest?: SimulateCreateOrTopUpBidRequest;
  // Action to be performed (create or top up)
  bidAction?: BidAction;
  // Number of times the polling for new/increased bid has been retried
  pollingRetries: number;
  // On-Chain ID of the pending bid
  pendingBidId?: number;
  // Submitted bid
  syncedBid?: BidDetailsFragment;
};

export type RAMMachineInput = Pick<
  RAMMachineContext,
  "artblocksClient" | "project"
>;

graphql(/* GraphQL */ `
  fragment BidDetails on bids_metadata {
    id
    slot_index
    bid_value
    ranking
    time_of_bid
    bidder_address
    is_removed
  }
`);

const getUserBidsDocument = graphql(/* GraphQL */ `
  query GetUserBids($projectId: String!, $userAddress: String!) {
    bids_metadata(
      where: {
        project_id: { _eq: $projectId }
        bidder_address: { _eq: $userAddress }
      }
      order_by: { ranking: asc }
    ) {
      ...BidDetails
    }
  }
`);

const MAX_RETRIES = 10;

export const ramMachine = setup({
  types: {
    input: {} as Pick<
      RAMMachineContext,
      "project" | "artblocksClient" | "liveSaleDataPollingMachineRef"
    >,
    context: {} as RAMMachineContext,
    events: {} as RAMMachineEvents,
  },
  actors: {
    fetchUserBids: fromPromise(
      async ({
        input,
      }: {
        input: Pick<RAMMachineContext, "artblocksClient" | "project">;
      }): Promise<Array<BidDetailsFragment>> => {
        const { artblocksClient, project } = input;
        const publicClient = artblocksClient.getPublicClient();
        const walletClient = artblocksClient.getWalletClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        // This shouldn't happen but is necessary for type checking
        if (!walletClient?.account) {
          throw new Error("Wallet client not connected");
        }

        const bids = await artblocksClient.graphqlRequest(getUserBidsDocument, {
          projectId: project.id,
          userAddress: walletClient.account.address.toLowerCase(),
        });

        return bids.bids_metadata;
      }
    ),
    initiateBidTx: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          RAMMachineContext,
          | "artblocksClient"
          | "project"
          | "topUpBidId"
          | "bidSlotIndex"
          | "liveSaleDataPollingMachineRef"
          | "userBids"
        >;
      }): Promise<{
        txHash: Hex;
        txRequest: SimulateCreateOrTopUpBidRequest;
      }> => {
        const { project, artblocksClient } = input;
        const publicClient = artblocksClient.getPublicClient();
        const walletClient = artblocksClient.getWalletClient();

        const { projectIndex, coreContractAddress } =
          getCoreContractAddressAndProjectIndexFromProjectId(project.id);

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!walletClient?.account) {
          throw new Error("Wallet client not connected");
        }

        const minterAddress = project.minter_configuration?.minter?.address;

        if (!minterAddress) {
          throw new Error("Minter is not configured for this project");
        }

        if (input.bidSlotIndex == null) {
          throw new Error("Bid slot is required");
        }

        const basePrice = project.minter_configuration?.base_price;

        if (!basePrice) {
          throw new Error("Base price is not configured for this project");
        }

        const minterContract = getContract({
          abi: minterRAMV0Abi,
          address: minterAddress as Hex,
          client: {
            public: publicClient,
            wallet: walletClient,
          },
        });

        const value = slotIndexToBidValue(
          formatEther(BigInt(basePrice)),
          input.bidSlotIndex
        );

        if (input.topUpBidId) {
          const onChainTopUpBidId = dbBidIdToOnChainBidId(input.topUpBidId);
          const topUpBid = input.userBids.find(
            (bid) => bid.id === input.topUpBidId
          );

          if (!topUpBid) {
            throw new Error("Cannot top up non-existant bid");
          }

          const valueDiff = value - BigInt(topUpBid.bid_value);

          const { request } = await minterContract.simulate.topUpBid(
            [
              projectIndex,
              coreContractAddress,
              onChainTopUpBidId,
              input.bidSlotIndex,
            ],
            {
              value: valueDiff,
              account: walletClient.account.address,
            }
          );

          const txHash = await walletClient.writeContract(request);

          return {
            txHash,
            txRequest: request,
          };
        }

        const { request } = await minterContract.simulate.createBid(
          [projectIndex, coreContractAddress, input.bidSlotIndex],
          {
            value,
            account: walletClient.account.address,
          }
        );

        const txHash = await walletClient.writeContract(request);

        return {
          txHash,
          txRequest: request,
        };
      }
    ),
    waitForBidTxConfirmation: fromPromise(
      async ({
        input,
      }: {
        input: Pick<
          RAMMachineContext,
          "artblocksClient" | "txHash" | "txRequest"
        >;
      }): Promise<bigint> => {
        const { artblocksClient, txHash, txRequest } = input;
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!txHash || !txRequest) {
          throw new Error("Transaction hash and request are required");
        }

        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        // If the transaction was reverted, resimulate it to get the revert reason
        if (txReceipt.status === "reverted") {
          // These if statements are necessary for type checking
          if (txRequest.functionName === "createBid") {
            // Resimulate the transaction to get the revert reason
            await publicClient.simulateContract(txRequest);
          }

          if (txRequest.functionName === "topUpBid") {
            // Resimulate the transaction to get the revert reason
            await publicClient.simulateContract(txRequest);
          }
        }

        const events = parseEventLogs({
          logs: txReceipt.logs,
          abi: minterRAMV0Abi,
          eventName: ["BidCreated", "BidToppedUp"],
        });

        const event = events[0];

        if (!event) {
          throw new Error("No event found");
        }

        return event.args.bidId;
      }
    ),
  },
  actions: {
    assignErrorMessageFromError: assign({
      errorMessage: (
        _,
        params: { error: unknown; fallbackMessage?: string }
      ) => {
        return getMessageFromError(params.error, params.fallbackMessage);
      },
    }),
    assignUserBids: assign({
      userBids: (_, params: { userBids: Array<BidDetailsFragment> }) =>
        params.userBids,
    }),
    assignBidAction: assign({
      bidAction: (_, params: { bidAction: BidAction }) => params.bidAction,
    }),
    resetBidAction: assign({
      bidAction: undefined,
    }),
    assignTopUpBidId: assign({
      topUpBidId: (_, params: { topUpBidId: string }) => params.topUpBidId,
    }),
    resetTopUpBidId: assign({
      topUpBidId: undefined,
    }),
    assignBidSlotIndex: assign({
      bidSlotIndex: (_, params: { bidSlotIndex: number }) =>
        params.bidSlotIndex,
    }),
    assignPendingBidId: assign({
      pendingBidId: (_, params: { bidId: number }) => params.bidId,
    }),
    assignErrorMessage: assign({
      errorMessage: (_, params: { errorMessage?: string }) =>
        params.errorMessage,
    }),
    resetBidContext: assign({
      errorMessage: undefined,
      txHash: undefined,
      txRequest: undefined,
      bidAction: (_, params?: { bidAction?: BidAction }) => params?.bidAction,
      topUpBidId: undefined,
      bidSlotIndex: undefined,
      pendingBidId: undefined,
      syncedBid: undefined,
      pollingRetries: 0,
    }),
    assignInitiatedTxHash: assign({
      txHash: (_, params: { txHash: Hex }) => params.txHash,
    }),
    assignInitiatedTxRequest: assign({
      txRequest: (_, params: { txRequest: SimulateCreateOrTopUpBidRequest }) =>
        params.txRequest,
    }),
    incrementPollingRetries: assign({
      pollingRetries: ({ context }) => context.pollingRetries + 1,
    }),
    assignSyncedBid: assign({
      syncedBid: (
        { context },
        { userBids }: { userBids: Array<BidDetailsFragment> }
      ) => {
        const bid = userBids.find((bid) => {
          // RAM bid ids in our db follow the format {minter contract address}-{full project ID}-{bidID}
          const splitBidId = bid.id.split("-");
          const bidId = splitBidId[splitBidId.length - 1];
          return bidId === context.pendingBidId?.toString();
        });

        return bid;
      },
    }),
  },
  guards: {
    isUserRejectedError: (_, { error }: { error: unknown }) => {
      return isUserRejectedError(error);
    },
    topUpBidSelected: ({ context }) => {
      return Boolean(context.topUpBidId);
    },
    topUpActionAllowed: (
      { context },
      { bidAction }: { bidAction: BidAction }
    ) => {
      return bidAction === "topUp" && context.userBids.length > 0;
    },
    isBidSynced: (
      { context },
      { userBids }: { userBids: Array<BidDetailsFragment> }
    ) => {
      const bid = userBids.find((bid) => {
        // RAM bid ids in our db follow the format {minter contract address}-{full project ID}-{bidID}
        const splitBidId = bid.id.split("-");
        const bidId = splitBidId[splitBidId.length - 1];
        return bidId === context.pendingBidId?.toString();
      });

      // For new bids, the presence of a matching bid means that the bid has synced.
      // For top-ups, the bid slot index must match the new slot index in context
      return Boolean(bid && bid.slot_index === context.bidSlotIndex);
    },
    retriesRemaining: ({ context }) => {
      return context.pollingRetries < MAX_RETRIES;
    },
    maxRetriesReached: ({ context }) => {
      return context.pollingRetries >= MAX_RETRIES;
    },
    isValidBidSlotIndex: (
      { context },
      { bidSlotIndex }: { bidSlotIndex: number }
    ) => {
      const topUpBid = context.topUpBidId
        ? context.userBids.find((bid) => {
            return bid.id === context.topUpBidId;
          })
        : undefined;

      const liveSaleData =
        context.liveSaleDataPollingMachineRef.getSnapshot().context
          .liveSaleData;

      const minBidSlotIndex = topUpBid
        ? Number(topUpBid.slot_index ?? 0) + 1
        : Number(
            liveSaleData?.ramMinterAuctionDetails?.minNextBidSlotIndex ?? 0
          );

      return bidSlotIndex >= minBidSlotIndex;
    },
    isBidActionCreate: ({ context }) => {
      return context.bidAction === "create";
    },
    isBidActionTopUp: ({ context }) => {
      return context.bidAction === "topUp";
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcCGBbAQgSwgWVQGMALbAOzADoAzMAFxPKgFVYxkcJYBiCAewqVyANz4BrKmiy4CjQbQakyLNh1ywEIvoVR1sAgNoAGALrGTiUAAc+sbHoGWQAD0QBaAEwA2ACwAOSgBOAEYAVg8-AHYvYK9Ij1CAGhAAT0QfAGZAyh9I4L8-ENyPD0iAXzLkqU5ZJSoFORV2Th5+QS0JSmqZIjqaekbWZvVNMlEdBzJzA2CLJBAbO0mnVwRPUOCjSiMfTL8vffzQg+S0hFDQrYyw3dCMqLujYIqqjBre8nqBpSa1Ll4BFQOpI3j05F9FEwhn8NFoJvopqYDB45tZbPYESt3B4ssFKFkvMdgtcMjtoqdEISAoE-EZwqEfDE7pFAi8QN18B95N8oaoWgD2mNxCDpJzwf1IcpoS1RuNdAjphlUQt0ct5qtPH5dvjCdEYqUnjsKQhNglKHlgoFbpkEhkfGyObVPhLBnz1Nx2Mg+MhKFYADa6aje9BdUFivoNH7SkZw+WGJGmJyLDGOdXua4eK5+DJ3QKBCLRHxJVKIS2RUKUYlGbxGLyZ4IeWIOsNOwSoADuqAxyk4AEFCJMAMLEPjYQhgbiYACSABEAPq9wcAFSnAHkAHJzwcACVXAGUAKLr8xJ1WYtNrTMXSsRHyle4XLwZLzG00+SiNzNPjaBS535uiq2VAdl2eg9rg-ZDiOY4TtO86LiuG5bruh7HrMp5LOeoAaleXiUAcOzhEY+bRMEkTGlqGQfuWZZhAceblJU7ItlywGdt2UBLnwVjMFYnDDqO47cEuq4AApzsw4lwch+5Hie8zJmq2HuJsPjZDSBw4k+gReEyr5GLS+EMhkOaREYkQWXEAHvOKIEcVxPF8bgAkwZOi4ANLyWimGpspax0RWuzBMEuSRPcJk4q+jbZIaObVlqmaRH41lgn0dlgVAfboHwACuZB0Nwe7MJgeBTkuc5wV5Ko+WQWL+cc2yhL+BSbAZd4ZB4xpFI1RY7AUoRatEKXhs66VMFluX5W5g6eYmClnr5LjuE+WwlJm1aEgyIU+FFoSRJQfiWiFz4EQUw1AZQY3gRAvbZXlBWYB5MzKopWFLWsXjmR+PhhFkFweL+Ravj9VF5g2gTmXeZm1udrFCGQGLytdS7OAKQJCp0jpw+QiMZZwKOytocaImYc3eSmtUXsFNLmhEdqEpkkSMhk+kHPhdIGYSEMDdWsPijjehI5luAox6yBej6-qBsGoaAdjCOC3jIvOIT8LxqTL0LZTfk4u+ZkeP40RJbEzJRaU2y1mpBm1hcBl830AvYEL+Oo563q+gGdBBsgIZY-zCtO0rEAE7GkzTOh801XV3hUXapJNStRjXE+r45u+z5JbkeZFqSHj286hACNQ2A++Nyto-DoiYyx4qF2Qxel8jKuhwqCaa1HF6ZhEQTmcctZkrE+nxB+TWW34XcDRk+dtuxGV7ikZCEBXsB0LoIo2Wls9MPPi9Va9i2rPcEMHdmYWhUWFwUUl+L+BcYRmT4taMa8cu2Vvyg70vbRUCva+yxvo135QE-s9DCFM6r3CZgdN8Wk4jHH0iEG85ZAjRBQb4JK082KgW3gvQgLooxun+N-Suwp-6pUAdgj+uD8G8mGFwVWxNphk2quAzuulsh7V-PcYoxEWYlgQBkMKlZ8zjxMlzBkVkmJ+03pQ4B1DIy0JhBXYEZCRoz1kZ-GhUpCGwiFGrEmoDI6sJ1oSKilw7gRG0klci-C+4fjtOPYi5k7RhEwZdIBmiFHaLoa0QEJDq6vxkRxTxPJvEwgYWHJEKIwFKXehEBqxF8i6SSlqbMxowocNKCgnMOY6bJSkTXIJc95GhN+PyN2ktPbe19oUihwSSmSjKTGPRjC24xLeqsUolpzQHGJLSAGv4zbZEtBFGk0QdghTcVdORi8tFNP+BUj20sfaqIutMkJjToz0JburQx5NYmdLMhWLwgQsiiOfLWOIqcLKNWIp9YkA0QhTI8dQoB3BnC-zoMBagXzkAAApLhGCMAASm4NIupxTZlAL3lraOfgmpBHzEWPM1sE76XCPha4hQaQ-UfpIl+ADBAACNcB7hyoQccsAeAACUDyHiXDCjufkfoAyCJkK0A0GxRCBvw2IAQCjXA2N4WkllQhuIqdwWl9LGXGLiY2d8vhHGMxTryiGoMHGCOuOZA2U82RkD4BAOAThwUUHaQfdMAMAh3D+tWUkd46QUTxOFEKYUSiWn2M-ZigTnRePmfAIxByLWXEoNa38tqdhXn0jifC-Vdg6uJAbNxsBUB+jAIOPg6B-T0DAGa7W71PAlGyGZbMHUoiCKSsWM4jMgh5FPodFkJQizPNkX2AcCIXLjlzXVTw1bgqHBCgUUoe19K5ErAUZJ+QgVNgKd69R9luK8X4tBTtAaOkqRiBwqININgZMGfwq0Ww8w6WzADTYZlPUmqwRxCa90u0XjcAyfa1xLR0iampK0nVeW8PNKZQFsQfo6TcY7Z2ys71+RJDeFB2ZuVJx5WcM9q0cwXGzHtA4mQ3F1wbugMuwdVj7LXSaT6Hh8KMhiHWeOTVAiszwpynmXKgV1mbfUxeYG4nPnfJkLluQ9oP2NPE-CIiXGQOIlaJjkK8G+q2f6-D5qEAGwbDkDMg0eNGi-ebJ8SSGQ2wGmKmdhKr3icoEA1jh8DYVnWgyVDfdx76RMsI3SVs6RPnuGJnBszYC4MgCZxASH9qaSeDmGkZEaTGiyNkO8AN5MDU+gcVzVDZkVO8wI44eF2VamIoUYKO1+FajxAyADLJTkkS8G4klEAyUUrgNJlhgaEB3kMvmN9Dxdi6SvnhVJ7VT6mPFeLb0SWY78r7U+RmZ9P3wfhUWpm2qLKbHHRUCoQA */
  id: "ramBidMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    project: input.project,
    liveSaleDataPollingMachineRef: input.liveSaleDataPollingMachineRef,
    userBids: [],
    pollingRetries: 0,
  }),
  initial: "fetchingUserBids",
  states: {
    fetchingUserBids: {
      invoke: {
        src: "fetchUserBids",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
        }),
        onDone: [
          {
            target: "awaitingBidAmount",
            guard: "isBidActionCreate",
            actions: {
              type: "assignUserBids",
              params: ({ event }) => ({
                userBids: event.output,
              }),
            },
          },
          {
            target: "awaitingTopUpBidChoice",
            guard: "isBidActionTopUp",
            actions: {
              type: "assignUserBids",
              params: ({ event }) => ({
                userBids: event.output,
              }),
            },
          },
          {
            target: "awaitingBidActionChoice",
            actions: [
              {
                type: "assignUserBids",
                params: ({ event }) => ({
                  userBids: event.output,
                }),
              },
            ],
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
    awaitingBidActionChoice: {
      on: {
        BID_ACTION_CHOSEN: [
          {
            target: "awaitingTopUpBidChoice",
            actions: {
              type: "assignBidAction",
              params: ({ event }) => ({
                bidAction: event.bidAction,
              }),
            },
            guard: {
              type: "topUpActionAllowed",
              params: ({ event }) => ({
                bidAction: event.bidAction,
              }),
            },
          },
          {
            target: "awaitingBidAmount",
          },
        ],
      },
    },
    awaitingTopUpBidChoice: {
      description: "The user chooses an existing bid to top up",
      on: {
        TOP_UP_BID_CHOSEN: {
          target: "awaitingBidAmount",
          actions: {
            type: "assignTopUpBidId",
            params: ({ event }) => ({
              topUpBidId: event.bidId,
            }),
          },
        },
        BACK: {
          target: "awaitingBidActionChoice",
          actions: "resetBidAction",
        },
      },
    },
    awaitingBidAmount: {
      on: {
        SUBMIT_BID: {
          target: "initiatingBidTx",
          actions: {
            type: "assignBidSlotIndex",
            params: ({ event }) => ({
              bidSlotIndex: event.bidSlotIndex,
            }),
          },
          guard: {
            type: "isValidBidSlotIndex",
            params: ({ event }) => ({
              bidSlotIndex: event.bidSlotIndex,
            }),
          },
        },
        BACK: [
          {
            target: "awaitingTopUpBidChoice",
            guard: "topUpBidSelected",
            actions: "resetTopUpBidId",
          },
          {
            target: "awaitingBidActionChoice",
            actions: "resetBidAction",
          },
        ],
      },
    },
    initiatingBidTx: {
      invoke: {
        src: "initiateBidTx",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          project: context.project,
          liveSaleDataPollingMachineRef: context.liveSaleDataPollingMachineRef,
          topUpBidId: context.topUpBidId,
          bidSlotIndex: context.bidSlotIndex,
          userBids: context.userBids,
        }),
        onDone: {
          target: "confirmingBidTx",
          actions: [
            {
              type: "assignInitiatedTxHash",
              params: ({ event }) => ({
                txHash: event.output.txHash,
              }),
            },
            {
              type: "assignInitiatedTxRequest",
              params: ({ event }) => ({
                txRequest: event.output.txRequest,
              }),
            },
          ],
        },
        onError: [
          {
            target: "awaitingBidAmount",
            guard: {
              type: "isUserRejectedError",
              params: ({ event }) => {
                return {
                  error: event.error,
                };
              },
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
    confirmingBidTx: {
      invoke: {
        src: "waitForBidTxConfirmation",
        input: ({ context }) => ({
          artblocksClient: context.artblocksClient,
          txHash: context.txHash,
          txRequest: context.txRequest,
        }),
        onDone: {
          target: "awaitingSync",
          actions: {
            type: "assignPendingBidId",
            params: ({ event }) => ({
              bidId: Number(event.output),
            }),
          },
        },
        onError: {
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
      },
    },
    awaitingSync: {
      initial: "fetchingUserBids",
      onDone: [
        {
          target: "bidSuccess",
          guard: stateIn({ awaitingSync: "synced" }),
        },
        {
          target: "error",
          guard: stateIn({ awaitingSync: "error" }),
        },
      ],
      states: {
        fetchingUserBids: {
          invoke: {
            src: "fetchUserBids",
            input: ({ context }) => ({
              artblocksClient: context.artblocksClient,
              project: context.project,
            }),
            onDone: [
              {
                target: "synced",
                actions: [
                  {
                    type: "assignUserBids",
                    params: ({ event }) => ({
                      userBids: event.output,
                    }),
                  },
                  {
                    type: "assignSyncedBid",
                    params({ event }) {
                      return {
                        userBids: event.output,
                      };
                    },
                  },
                ],
                guard: {
                  type: "isBidSynced",
                  params: ({ event }) => ({
                    userBids: event.output,
                  }),
                },
              },
              {
                target: "waiting",
                actions: [
                  {
                    type: "incrementPollingRetries",
                  },
                  {
                    type: "assignUserBids",
                    params: ({ event }) => ({
                      userBids: event.output,
                    }),
                  },
                ],
                guard: "retriesRemaining",
              },
              {
                target: "error",
                actions: {
                  type: "assignErrorMessage",
                  params: {
                    errorMessage:
                      "Your bid has been submitted but indexing is taking longer than usual.",
                  },
                },
              },
            ],
            onError: [
              {
                target: "waiting",
                actions: {
                  type: "incrementPollingRetries",
                },
                guard: "retriesRemaining",
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
        waiting: {
          after: {
            5000: "fetchingUserBids",
          },
        },
        synced: {
          type: "final",
        },
        error: {
          type: "final",
        },
      },
    },
    bidSuccess: {
      on: {
        RESET: {
          actions: {
            type: "resetBidContext",
            params: ({ event }) => ({
              bidAction: event.bidAction,
            }),
          },
          target: "fetchingUserBids",
        },
      },
    },
    error: {
      on: {
        RESET: {
          actions: {
            type: "resetBidContext",
          },
          target: "fetchingUserBids",
        },
      },
    },
  },
});

export { getNearestSlotForBidValue, slotIndexToBidValue } from "./utils";
