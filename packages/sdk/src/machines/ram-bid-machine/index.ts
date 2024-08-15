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

export type RAMBidMachineEvents =
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

export type RAMBidMachineContext = {
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

export type RAMBidMachineInput = Pick<
  RAMBidMachineContext,
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

export const ramBidMachine = setup({
  types: {
    input: {} as Pick<
      RAMBidMachineContext,
      "project" | "artblocksClient" | "liveSaleDataPollingMachineRef"
    >,
    context: {} as RAMBidMachineContext,
    events: {} as RAMBidMachineEvents,
  },
  actors: {
    fetchUserBids: fromPromise(
      async ({
        input,
      }: {
        input: Pick<RAMBidMachineContext, "artblocksClient" | "project">;
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
          RAMBidMachineContext,
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
        input: Pick<RAMBidMachineContext, "artblocksClient" | "txHash">;
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
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcCGBbAQgSwgWVQGMALbAOzADoAzMAFxPKgFVYxkcJYBiCAewqVyANz4BrKmiy4CjQbQakyLNh1ywEIvoVR1sAgNoAGALrGTiUAAc+sbHoGWQAD0QBaAEwB2AJwBGSi8AZgAODyMjADYQyJ9vABoQAE9EPyMvABZKII8Mn0z0yLyAVgyAXzLEqU5ZJSoFORV2Th52ZD5kSisAG11qDvRKapkiOpp6RtZm9U0yUR0HMnNzJxs7RadXBDcgv3DskKDioJ84kK8i4sSUhD984so-IKMPSKjwvb9IiqqMGtHyFRUAB3VD2JicACChEWAGFiHxsIQwNxMABJAAiAH1IbCACpogDyADksbCABKEgDKAFFiSskCA1uDHIytp4jBkPJQ3pEPB5igK-BldtdUkYQkYeaUgkcvOkvBcvD8QMN8ADBCCwXplFCYfoyPDEcjUZicfiiaSKdS6QY-BZGcyNmz3OFipEeZKMoKjHELn4vGKECERZRvMU7l4-O6QqdlZVVX8RnIgaDwco8XwrMwrJwjUiUXjCQAFLHMUvo7HW2n00yrWwssibdxpPKUHwxMJBSInSKRaNBtKS6UiuUKpUqtW1QGULXpqCZ7O53D5k2YXEAaQZ1gbztA7OjkQeGQyfmFitCso8QUHHjulCMaSOLxD4S8IUnSfVKdnaZ1UChdA+AAVzIOhuCpZhMDwNE8SxSttyZXcDWbbZDwfYofGKEIQjSCUuRyIN-CyIxSmKTkcOwjILk-aRvzGOd-0AkCwNRTdEKdFCXW2HspX5cIXiPUphQyW9ii8ShcOI7toglD8EynDVU21CFcEhIDQPA9dYS3e163WLj93cN4JNyaMTmKQUsO9QdTyCdt-A8Hx0i5eUolo-4f3IcFdFUiA8WcXgBCoLQJCGL9p0Eby9F83VcAC2Z5l8wxTA45DWSM247hCQIPEODIjxFTIe0HKIcreciYkw0jJQ8DzkzGaLsFigD4sCtoOi6Xo6H6ZBBkUryyB8pi2sS7RkqWVK60ddKm2468snlXJzkid8vmOQNklSfkJIiIpnMlISJXq+iZyalrOAC7gOs6Ho+gGcK6MikKhpikb-OcMaFgNZY9JmgyMpcRBXnsoIRVInxeKMXYSq224jiybt32o05vWeOqFIipTKEIARqGwPq-Ku-gormcRJCxn9cbIfHCbij6vom5Zpp3AG5sy8I8vbdJ3SiTko0iUqvG5AVnKKMIXmwoITue38VOUKkkjIQggsEWA6F0CmnuxximEV5W0rZ1DQmcyTDmCajMksq44fOHKwZCSzo3lDIonjX5tZ-XWFaVlWSaodXNcezyGL-PXfbtB1WcbY3ziyXCXgIvsvHdUr-EecN8liC5qPkj2Q5nb2oH1whxkUJgpjULhVZe0QwoG0P5eL32y8mVQWkZxZmajpCjfmvsfEocSsNCajwh8G84aCYJHjOa9u0w0pVplnWw595XW6UJoq54f2hDJ+vKcb+cS83iv25mLRvpSsw-ujvcgYQV5jiH0ichiE5302m5ebDB3x-SGDaMK8vZr2bhvBoW9K4tBrvvOuWsC6ajAafSB59phcE7j9VKHge6cUBlsPK7oHz+BiKtHCGRDhBmCIPQUvhgjHEFIcPOiZPbH3-CgiYUCL7Vxul1e6fVg4NULsgluqDlDQMvmTa+k0zAs17jHeaUZB4XFwqEF4pwbY3D2E5WeV4OwXE5MKEBbDw4QM4Wgne11kDtFut1Xq-Uj7CKbhw8u4juEaCvkzVKd95EPwIfKB4sQThdm7FEVag5p67XIpDR8RxYx+GMU4k+LcwHcGcIHOgQJqCZOQAACnIhEAAlNwBuST2EpKbobBRHNHaD1OLkTCB0IaCzhmkQUPJdixg7KeV2y9MasJnAAI1wFSYChBkSwB4AAJRpLSPEVS-GIFPDonwIpVnYT2HHTRqRohm12BGV4kpFRHkSYIG63AZlzIWYZR+-JhQ8goeEIqsMtHOXshPCh09djpFyNLfpiDlLzmYppCCUEYJwQQj4vB7NH5uC+AEKMUYwjnDvMcNO9l6F8lWasgMuQKgJjIHwCAcAnClIoPpapsKcjvgcgdR2pC8gtJuLhA4ORvBFDoZZHwpz6jmLceg+A-1KXshyM8WlclsJ9kZaVc4lBTxvIuHlGSCT-lCKQU3PUcIEQFgpYs7Y14Z4hgiIcCUmRVmTy0b6B4konjI2coUP5+c1WAv-IuHMeZtXIl1Tcg8PYJLiwlIKINiofAyoCKEPCaQBTvm5aq066qgVqQ0mBb1+D3ClAkrsO4pFMJ5FWR4dFgQ5QFK+PK74cbZbnXegFVNMKti7HsnsfITCChg22bcdIfEjiWUOOJaIIoeU4zxgTdARMtj3x9Tsl4Dy+xfGvDm04pU+xD1wthR8eU9oYydfGl1pjCC1tQteIocrdh5WouJF2QZCE8jOP4QUoQjz5EHUXFxbcBUHvmssk9mzz2Kk5KVbwHS-BVV6T24oz6REbzAR+zKORvRhgiGRC4vMwilVlLPKV9r3SymYWS3d69S6wF9pAGDj9u3+olk8TCuFfAhCDCcQeXInJmUlWVCDziW43VI-W90Ho1lGo7P4YUQYQwBFKPK3wE8-Tlu3bLYZEBRnjLgIKidaaEBcmHHEXN5xxN9hExcSSFCCLmyPI6lhALKBcaFXqkGOVcLAZ7EVC2BbWm1MCAUYWiohwxHxWUIAA */
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
        onDone: {
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
