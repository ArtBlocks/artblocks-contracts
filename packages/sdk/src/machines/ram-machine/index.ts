import { Hex, formatEther, getContract, parseEventLogs } from "viem";
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
      }): Promise<Hex> => {
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

          return txHash;
        }

        const { request } = await minterContract.simulate.createBid(
          [projectIndex, coreContractAddress, input.bidSlotIndex],
          {
            value,
            account: walletClient.account.address,
          }
        );

        const txHash = await walletClient.writeContract(request);

        return txHash;
      }
    ),
    waitForBidTxConfirmation: fromPromise(
      async ({
        input,
      }: {
        input: Pick<RAMMachineContext, "artblocksClient" | "txHash">;
      }): Promise<bigint> => {
        const { artblocksClient, txHash } = input;
        const publicClient = artblocksClient.getPublicClient();

        if (!publicClient) {
          throw new Error("Public client unavailable");
        }

        if (!txHash) {
          throw new Error("Transaction hash is required");
        }

        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        if (txReceipt.status === "reverted") {
          throw new Error("Purchase transaction reverted");
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
      bidAction: undefined,
      topUpBidId: undefined,
      bidSlotIndex: undefined,
      pendingBidId: undefined,
      syncedBid: undefined,
      pollingRetries: 0,
    }),
    assignInitiatedTxHash: assign({
      txHash: (_, params: { txHash: Hex }) => params.txHash,
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
      const minBidSlotIndex = Math.max(
        Number(liveSaleData?.ramMinterAuctionDetails?.minNextBidSlotIndex),
        topUpBid ? Number(topUpBid.slot_index ?? 0) + 1 : 0
      );

      return bidSlotIndex >= minBidSlotIndex;
    },
    isSaleComplete: ({ context }) => {
      const liveSaleData =
        context.liveSaleDataPollingMachineRef.getSnapshot().context
          .liveSaleData;

      return Boolean(
        liveSaleData?.ramMinterAuctionDetails?.maxHasBeenInvoked &&
          liveSaleData.ramMinterAuctionDetails.projectMinterState !==
            "LiveAuction"
      );
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcCGBbAQgSwgWVQGMALbAOzADoAzMAFxPKgFVYxkcJYBiCAewqVyANz4BrKmiy4CjQbQakyLNh1ywEIvoVR1sAgNoAGALrGTiUAAc+sbHoGWQAD0QBaAEwAOAGwBmSg8AFh8ATj8-IKCvPy8ARg8AGhAAT0QvAFZQygB2OKMMoLic0J8MjN8AX0rkqU5ZJSoFORV2Th5+QS0JSjqZIkaaehbWNvVNMlEdBzJzAziLJBAbOxmnVwRPL29KYuCcqJ8jUNCc5LSEfNPKP2P-EJyjDziE6tqMeoHyJuGlVrUuNx2Mg+MhKFYADa6aig9C9D79OQ-RRMUYAjRaab6WamcxOFb2bHrdx+BJGG4xDJ+E7eHI+IIZc6IOKnDK7W4eI4+DxGBJxHxvEB9fBfQSoADuqEJyk4AEFCDMAMLEPjYQhgbiYACSABEAPqyxUAFS1AHkAHJ6xUACVNAGUAKLmvFLAlrJYbTxGIIeShcjweDKBuJBUlMy5GLzksqhvwZR45RM+HKC4UNb6UCVSvQy3DypUqtUa7X6w0mi1W22O50LfG2QmOD3uHkZHx+qMMnmhDx04rhryhwI5DIsvKtrwnFM1IUIkVIzOS6VQI18KzMKycZWq9XcI2mgAKeuYh5LlftTpd1nr7tAnvyQWyoV82z8-lKPjijNSzMj0cKEXjIxEzpKd3mkOdBizJcVzXDdcC3ItNUNABpS9lmvIkm02T8ykoKIXiCRNYgiDw-HDPlsl5Iw4yeAceRyLxU1ndMxUXHMoDldA+AAVzIOhuDtZhMDwLUjT1Es0LdTDb3cHDKAKUIKniIxIx9Pwkm-BBQhDeTCgyb0vEyAc6SY8CWKoKD2M4ni+KQxVUNMOtVmklx3H8ckAx5J4ykKEMgnIwMckoeJtNDHwfCjQzTM+edLKYazeP4zAUPmRYr2cxsZM2I4guCT9qXKDxFIZciigCE4ElCICfUeIwBWnNNRSochCV0eLcCNZxeAEZrJnESRmKaoQyFaqyOucCYpjawxcUc10MMy1zLhZLxcm8SIYz8A5-HIurVqOfTfCyAoow8aLEUGFq9Da3MIE6oFkBBMFIWhWF4TMoaruwG6OPGybtGmnEzDm9KGzIYkEFIoJcieaIQPiMotoCnt5Lqh9fx8yNzogjMvp+zh7uBUFwShOgYWQOFGvnPGxruibMUBuZa3mjLwawzkAkiW4snc6j+TIzS4jjaHXwYwiTgZDlsfMyhCAEahsAp9q6e6ro+p6KnBjlsgFaV27Ov+rEZuBtL0NZiGeR2Krhy5b08h8Xacl9QMqvpbYngqPxpaGuLlDtFIyEIVWqFgOhdAGj7YrYph-cDySFrZrLYiq4KYhySJEwZcp+wYm5onKT9HiCOrQJnSPIOjv2A6DzoQ7DugI5iivsxj6vUqcsGIdiA5gvyYJSPCm3du03YeyyOlTnpBjvajluq8DoYUWUNF2mD4bRA1wbZ6XWPCEXkZVHaQ3Gdm02pMWjZOTCSh40U2JCK7AWLi2gIWW8UjXyyQpkxn5ud+r-efwV7qDXt0RuF0My+ygLvQBqJD7jAZjMJmZ8E4W0RjfAo6lfDUgYmcTSrYPKRHdtbSIn5f6QMrtAgBzQgHwMBLXde-V3pNwoXPKhC8aFwLGFwY+SDcQeBQebdmmQ2zHDiL4ZMhlohP0QOnbIQYSjpypEGGIjEGpbz-uxGBnDl50J4ETZ6pNyaUw0aw-+HDfhcPRLw7EcwQZm07uzPI2Q6TxFiE8E4X4LgJCKrscI6knx0m9CGchrE2HaMsbo7h+jHrExemTN6mszFaOoZE-4R9EG2NxMzUGN4lo9gKH6cIT4P5cmTORLaQUCh3F5HGCccRQkWUoTAyh3BnCh3DpmagDdkAAAp9IqQAJTcCSWE8xe9KHxyEVlbwWRKA0gZCcX8PNdpBj9KSCcT4ijFx-uo8uGYABGuA7TcUIOqWAPAABKDpHRGimY4rKRRfGhFDC8ioCQvAHC8cyCKqdSQjk5FGJMGRGmUAMdwa5tz7l5Mvs8aGbseShjpDIy4VVypEJfvkJ2oZqjTjIHwCAcAnCjLAB3GFJIeyrROFVQyFRwoPgdppeIFIORlA-PpIWaiwIsPkGk4BXAyUuU9OpW48ylm0okQy3any8IsmonSda4UGl7J5SHVAEIwCKj4OgSE9BSUsweUtTw6k2S3yfNbGMcR+wjnmSyB8oZMHUi5WXVVC42FygVNiBC6pBUX2bK+OIuQKgfwAunb05EXirQYv4I4LyQgjlLiSt10FVzrk3IWH1BryXYX8EFN2kYgyFsTKEaVgbYj5CooFCcoKoEJT4r6xORrChBVJHK8oLyJYaW8ccAISjhwqX5EUUooKabK06g2ruQtR6nFUQcaiJVBZAUIeUT28YIo4pVRAwQ2tdboDHRsXJQqflPD9CED83JuZZBLYu8KN94gVF5N4FS3Ia3NOrhO9mr5oahg+YReMRdwyzKKZyJ8ZRwhiyCK+8JqSl7pPUB+mZTy8Kkm8H+xM4bF0o38OImMdVyiZCg+MyglCENLXUgyQIKk9J0gIdsXaEQ-H0qqgUfwsRCMpIXrAaukBSMbDjPGdsPIhZZHiCULw4ZqTZB9EVPKdK9rsdbgvAxvHEBxlva8gcxx6khn7EUG++FTgnGpD2eq3Kt1UCORAE5Zy4DwCzUehAPoozzJdnDQoZ6c5tgHHRYiNGvabpxoIZT9m-WQ38KteIOGuZER9ORTILi51O0TPkQy9VqhAA */
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
            target: "saleComplete",
            guard: "isSaleComplete",
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
    saleComplete: {},
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
          actions: {
            type: "assignInitiatedTxHash",
            params: ({ event }) => ({
              txHash: event.output,
            }),
          },
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
