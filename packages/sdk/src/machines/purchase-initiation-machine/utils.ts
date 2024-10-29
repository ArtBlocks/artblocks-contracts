import MerkleTree from "merkletreejs";
import {
  Account,
  erc20Abi,
  getContract,
  Hex,
  keccak256,
  PublicClient,
  WalletClient,
  zeroAddress,
} from "viem";
import {
  PurchaseInitiationMachineContext,
  PurchaseInitiationMachineContextWithFullTypes,
  UserPurchaseContext,
} from ".";
import { minterSetPriceMerkleV5Abi } from "../../../abis/minterSetPriceMerkleV5Abi";
import { iSharedMinterSimplePurchaseV0Abi } from "../../../abis/iSharedMinterSimplePurchaseV0Abi";
import {
  getCoreContractAddressAndProjectIndexFromProjectId,
  isERC20MinterType,
  isHolderMinterType,
  isMerkleMinterType,
  isRAMMinterType,
} from "../utils";
import { graphql } from "../../generated/index";
import { iSharedMinterHolderV0Abi } from "../../../abis/iSharedMinterHolderV0Abi";
import {
  GetUserBidsDocument,
  MinterConfigurationDetailsFragment,
  MinterDetailsFragment,
  ProjectDetailsFragment,
} from "../../generated/graphql";
import { LiveSaleData } from "../project-sale-manager-machine/utils";
import { iDelegationRegistryAbi } from "../../../abis/iDelegationRegistryAbi";
import { DELEGATION_REGISTRY_ADDRESS } from "../../utils/addresses";
import { minterSetPriceERC20V5Abi } from "../../../abis/minterSetPriceERC20V5Abi";

/** Shared Helpers **/
type WalletClientWithAccount = WalletClient & {
  account: Account;
};

type ProjectWithValidMinterConfiguration = ProjectDetailsFragment & {
  minter_configuration: MinterConfigurationDetailsFragment & {
    minter: MinterDetailsFragment;
  };
};

function assertPublicClientAvailable(
  publicClient?: PublicClient
): asserts publicClient is PublicClient {
  if (!publicClient) {
    throw new Error("Public client unavailable");
  }
}

function assertWalletClientWithAccount(
  walletClient?: WalletClient
): asserts walletClient is WalletClientWithAccount {
  if (!walletClient?.account) {
    throw new Error("Wallet client not connected");
  }
}

function assertProjectWithValidMinterConfiguration(
  project: ProjectDetailsFragment
): asserts project is ProjectWithValidMinterConfiguration {
  if (!project.minter_configuration?.minter) {
    throw new Error("Project has no minter configured");
  }
}

function assertLiveSaleData(
  liveSaleData?: LiveSaleData
): asserts liveSaleData is LiveSaleData {
  if (!liveSaleData) {
    throw new Error("Live sale data not available");
  }
}

/** Token Gated Minter Helpers **/
const getUserTokensInAllowlistDocument = graphql(/* GraphQL */ `
  query getUserTokensInAllowlistDocument(
    $allowedProjectIds: [String!]!
    $userAddressAndVaults: [String!]!
  ) {
    tokens_metadata(
      where: {
        project_id: { _in: $allowedProjectIds }
        owner_address: { _in: $userAddressAndVaults }
      }
    ) {
      id
      owner_address
    }
  }
`);

export async function getHolderMinterUserPurchaseContext(
  input: Pick<PurchaseInitiationMachineContext, "project" | "artblocksClient">
): Promise<UserPurchaseContext> {
  const { project, artblocksClient } = input;
  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);

  if (!isHolderMinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error("Project is not a token gated minter");
  }

  const allowedProjectIds =
    project.minter_configuration.extra_minter_details
      .allowlistedAddressAndProjectId;

  if (!allowedProjectIds) {
    throw new Error("No projects have been allowed for this token gated sale");
  }

  const userVaults = (
    await getDelegateVaultsForAccount(
      walletClient.account.address,
      publicClient
    )
  ).map((vault) => vault.toLowerCase());
  const userAddressAndVaults = [
    walletClient.account.address.toLowerCase(),
    ...userVaults,
  ];

  const userTokensRes = await artblocksClient.graphqlRequest(
    getUserTokensInAllowlistDocument,
    {
      allowedProjectIds,
      userAddressAndVaults,
    }
  );

  if (userTokensRes.tokens_metadata.length === 0) {
    return {
      isEligible: false,
      ineligibilityReason:
        "This project is currently available only to owners of specific tokens. If you believe you should have access to purchase this project, please double-check the wallet address you are using and ensure it holds a valid token.",
    };
  }

  // If the user has a token that is allowed for this project, we can proceed
  // with the purchase. No need to specify a vault.
  const userToken = userTokensRes.tokens_metadata.find(
    (token) => token.owner_address === walletClient.account.address
  );

  if (userToken) {
    return {
      isEligible: true,
      additionalPurchaseData: {
        allowedTokenId: userToken.id,
      },
    };
  }

  // If no token was found for the user's address, we can assume that
  // the user has a token in one of their vaults. Return the first token
  // in the response and us its owner address as the vault address.
  const userVaultToken = userTokensRes.tokens_metadata[0];
  const vaultAddress = userVaultToken.owner_address as Hex;

  return {
    isEligible: true,
    additionalPurchaseData: {
      allowedTokenId: userVaultToken.id,
      vaultAddress,
    },
  };
}

async function getDelegateVaultsForAccount(
  account: Hex,
  publicClient: PublicClient
) {
  const contract = getContract({
    abi: iDelegationRegistryAbi,
    address: DELEGATION_REGISTRY_ADDRESS,
    client: publicClient,
  });
  const vaults = await contract.read.getDelegationsByDelegate([account]);

  return vaults.map((vault) => vault.vault);
}

export async function initiateHolderMinterPurchase(
  input: Pick<
    PurchaseInitiationMachineContextWithFullTypes,
    | "artblocksClient"
    | "project"
    | "projectSaleManagerMachine"
    | "purchaseToAddress"
    | "additionalPurchaseData"
  >
) {
  const {
    artblocksClient,
    project,
    projectSaleManagerMachine,
    additionalPurchaseData,
  } = input;

  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();
  const liveSaleData =
    projectSaleManagerMachine.getSnapshot().context.liveSaleData;

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);
  assertLiveSaleData(liveSaleData);

  if (!isHolderMinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error("Project is not a token gated minter");
  }

  if (!additionalPurchaseData?.allowedTokenId) {
    throw new Error("User has no allowed token for this project");
  }

  const [tokenCoreContractAddress, tokenId] =
    additionalPurchaseData.allowedTokenId.split("-");

  const { projectIndex, coreContractAddress } =
    getCoreContractAddressAndProjectIndexFromProjectId(project.id);

  const minterContract = getContract({
    address: project.minter_configuration?.minter.address as Hex,
    abi: iSharedMinterHolderV0Abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });

  if (input.purchaseToAddress || input.additionalPurchaseData?.vaultAddress) {
    const { request } = await minterContract.simulate.purchaseTo(
      [
        input.purchaseToAddress || walletClient.account.address,
        projectIndex,
        coreContractAddress,
        tokenCoreContractAddress as Hex,
        BigInt(tokenId),
        input.additionalPurchaseData?.vaultAddress ?? zeroAddress,
      ],
      {
        value: liveSaleData.tokenPriceInWei,
        account: walletClient.account.address,
      }
    );

    const purchaseTransactionHash = await walletClient.writeContract(request);

    return purchaseTransactionHash;
  }

  const { request } = await minterContract.simulate.purchase(
    [
      projectIndex,
      coreContractAddress,
      tokenCoreContractAddress as Hex,
      BigInt(tokenId),
    ],
    {
      value: liveSaleData.tokenPriceInWei,
      account: walletClient.account.address,
    }
  );

  const purchaseTransactionHash = await walletClient.writeContract(request);

  return purchaseTransactionHash;
}

/** Allowlist Minter Helpers **/
function hashAddress(address: Hex) {
  return Buffer.from(keccak256(address).slice(2), "hex");
}

function generateUserMerkleProof(addresses: Hex[], userAddress: Hex): Hex[] {
  const merkleTree = new MerkleTree(
    addresses.map((addr) => hashAddress(addr)),
    keccak256,
    {
      sortPairs: true,
    }
  );

  return merkleTree.getHexProof(hashAddress(userAddress)) as Hex[];
}

export async function getMerkleMinterUserPurchaseContext(
  input: Pick<PurchaseInitiationMachineContext, "project" | "artblocksClient">
): Promise<UserPurchaseContext> {
  const { project, artblocksClient } = input;
  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);

  if (!isMerkleMinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error("Project is not an allowlist minter");
  }

  const allowlistedAddressesUrl =
    project.minter_configuration.offchain_extra_minter_details
      .allowlistedAddressesLink;

  if (!allowlistedAddressesUrl) {
    throw new Error("No allowlist has been configured for this project");
  }

  const { projectIndex, coreContractAddress } =
    getCoreContractAddressAndProjectIndexFromProjectId(project.id);

  const userVaults = (
    await getDelegateVaultsForAccount(
      walletClient.account.address,
      publicClient
    )
  ).map((vault) => vault.toLowerCase());
  const userAddressAndVaults = [
    walletClient.account.address.toLowerCase(),
    ...userVaults,
  ];

  try {
    const allowlistedAddressesRes = await fetch(allowlistedAddressesUrl);
    const allowlistedAddresses: Hex[] | undefined =
      await allowlistedAddressesRes.json();

    // Get the intersection of the allowlisted addresses and the user's
    // addresses (current wallet address and vault addresses)
    const allowlistedUserAddressAndVaults = allowlistedAddresses?.filter(
      (address) => userAddressAndVaults.includes(address.toLowerCase())
    );

    // If the user has no addresses in the allowlist, they are not eligible
    if (
      !allowlistedUserAddressAndVaults ||
      allowlistedUserAddressAndVaults.length === 0
    ) {
      return {
        isEligible: false,
        ineligibilityReason:
          "This project is currently available only to users who have been pre-approved and added to the allowlist. If you believe you should have access to purchase this project, please double-check the wallet address you are using and ensure it matches the one expected for the allowlist.",
      };
    }

    // Fetch remaining invocations for user and all vaults
    const minterContract = getContract({
      address: project.minter_configuration.minter.address as Hex,
      abi: minterSetPriceMerkleV5Abi,
      client: {
        public: publicClient,
        wallet: walletClient,
      },
    });
    const remainingInvocationsPromises = allowlistedUserAddressAndVaults.map(
      async (address) => {
        const remainingInvocations =
          await minterContract.read.projectRemainingInvocationsForAddress([
            projectIndex,
            coreContractAddress,
            address as Hex,
          ]);

        return [address, ...remainingInvocations] as [Hex, boolean, bigint];
      }
    );
    const remainingInvocationsResults = await Promise.all(
      remainingInvocationsPromises
    );

    // If no address has remaining mints, the user is not eligible
    const hasRemainingMints = remainingInvocationsResults.some(
      ([, projectLimitsMintInvocationsPerAddress, remaining]) =>
        !projectLimitsMintInvocationsPerAddress || remaining > BigInt(0)
    );
    if (!hasRemainingMints) {
      return {
        isEligible: false,
        ineligibilityReason:
          "You have no remaining mints available for this project.",
      };
    }

    // Prioritize user address if it has remaining mints or the project has no
    // per-address mint limits
    const userHasRemainingMints = remainingInvocationsResults.find(
      ([address, projectLimitsMintInvocationsPerAddress, remaining]) => {
        return (
          address.toLowerCase() ===
            walletClient.account.address.toLowerCase() &&
          (!projectLimitsMintInvocationsPerAddress || remaining > BigInt(0))
        );
      }
    );
    if (userHasRemainingMints) {
      return {
        isEligible: true,
        additionalPurchaseData: {
          allowlist: allowlistedAddresses,
        },
      };
    }

    // Find the first vault with remaining mints
    const firstVaultWithRemainingMints = remainingInvocationsResults.find(
      ([, projectLimitsMintInvocationsPerAddress, remaining]) => {
        return !projectLimitsMintInvocationsPerAddress || remaining > BigInt(0);
      }
    )?.[0] as Hex; // We know this will be defined because of the hasRemainingMints check

    return {
      isEligible: true,
      additionalPurchaseData: {
        allowlist: allowlistedAddresses,
        vaultAddress: firstVaultWithRemainingMints,
      },
    };
  } catch (e) {
    throw new Error(
      "Something went wrong while attempting to check your eligibility for purchase of this project. Please try again later."
    );
  }
}

export async function initiateMerkleMinterPurchase(
  input: Pick<
    PurchaseInitiationMachineContextWithFullTypes,
    | "artblocksClient"
    | "project"
    | "projectSaleManagerMachine"
    | "purchaseToAddress"
    | "additionalPurchaseData"
  >
) {
  const {
    artblocksClient,
    project,
    projectSaleManagerMachine,
    additionalPurchaseData,
  } = input;

  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();
  const liveSaleData =
    projectSaleManagerMachine.getSnapshot().context.liveSaleData;

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);
  assertLiveSaleData(liveSaleData);

  if (!isMerkleMinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error("Project is not an allowlist minter");
  }

  if (!project.minter_configuration.extra_minter_details.merkleRoot) {
    throw new Error("Project has no merkle root configured");
  }

  if (!additionalPurchaseData?.allowlist) {
    throw new Error("No allowlist has been configured for this project");
  }

  const { projectIndex, coreContractAddress } =
    getCoreContractAddressAndProjectIndexFromProjectId(project.id);

  const minterContract = getContract({
    address: project.minter_configuration?.minter.address as Hex,
    abi: minterSetPriceMerkleV5Abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });

  const merkleProof = generateUserMerkleProof(
    additionalPurchaseData.allowlist,
    (additionalPurchaseData.vaultAddress as Hex | undefined) ??
      (walletClient.account.address as Hex)
  );

  if (input.purchaseToAddress || input.additionalPurchaseData?.vaultAddress) {
    const { request } = await minterContract.simulate.purchaseTo(
      [
        input.purchaseToAddress ?? walletClient.account.address,
        projectIndex,
        coreContractAddress,
        merkleProof,
        input.additionalPurchaseData?.vaultAddress ?? zeroAddress,
      ],
      {
        value: liveSaleData.tokenPriceInWei,
        account: walletClient.account.address,
      }
    );

    const purchaseTransactionHash = await walletClient.writeContract(request);

    return purchaseTransactionHash;
  }

  const { request } = await minterContract.simulate.purchase(
    [projectIndex, coreContractAddress, merkleProof],
    {
      value: liveSaleData.tokenPriceInWei,
      account: walletClient.account.address,
    }
  );

  const purchaseTransactionHash = await walletClient.writeContract(request);

  return purchaseTransactionHash;
}

/** ERC20 Minter Helpers **/
export async function checkERC20Allowance(
  input: Pick<PurchaseInitiationMachineContext, "artblocksClient" | "project">
): Promise<bigint> {
  const { artblocksClient, project } = input;
  const publicClient = artblocksClient.getPublicClient();
  const walletClient = artblocksClient.getWalletClient();

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);

  if (!isERC20MinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error(
      "Project is not configured to allow payment in ERC-20 tokens"
    );
  }

  const erc20Contract = getContract({
    abi: erc20Abi,
    address: project.minter_configuration.currency_address as Hex,
    client: publicClient,
  });

  const allowance = await erc20Contract.read.allowance([
    walletClient.account.address,
    project.minter_configuration.minter.address as Hex,
  ]);

  return allowance;
}

export async function getERC20Decimals(
  input: Pick<PurchaseInitiationMachineContext, "artblocksClient" | "project">
): Promise<number> {
  const { artblocksClient, project } = input;
  const publicClient = artblocksClient.getPublicClient();

  assertProjectWithValidMinterConfiguration(project);
  assertPublicClientAvailable(publicClient);

  const erc20Contract = getContract({
    abi: erc20Abi,
    address: project.minter_configuration.currency_address as Hex,
    client: publicClient,
  });

  const decimals = await erc20Contract.read.decimals();

  return decimals;
}

export async function initiateERC20AllowanceApproval(
  input: Pick<
    PurchaseInitiationMachineContext,
    "artblocksClient" | "project" | "erc20ApprovalAmount"
  >
) {
  const { artblocksClient, project, erc20ApprovalAmount } = input;
  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);

  if (!isERC20MinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error(
      "Project is not configured to allow payment in ERC-20 tokens"
    );
  }

  if (!erc20ApprovalAmount) {
    throw new Error("No ERC-20 approval amount provided");
  }

  const erc20Contract = getContract({
    abi: erc20Abi,
    address: project.minter_configuration.currency_address as Hex,
    client: publicClient,
  });

  const { request } = await erc20Contract.simulate.approve(
    [project.minter_configuration.minter.address as Hex, erc20ApprovalAmount],
    {
      account: walletClient.account.address,
    }
  );

  return walletClient.writeContract(request);
}

export function isERC20AllowanceSufficient(
  project: ProjectDetailsFragment,
  allowance: bigint | undefined
): boolean {
  if (!isERC20MinterType(project.minter_configuration?.minter?.minter_type)) {
    return true;
  }

  return (
    (allowance ?? BigInt(0)) >=
    BigInt(project.minter_configuration?.base_price ?? Infinity)
  );
}

export async function initiateERC20Purchase(
  input: Pick<
    PurchaseInitiationMachineContextWithFullTypes,
    | "artblocksClient"
    | "project"
    | "projectSaleManagerMachine"
    | "purchaseToAddress"
  >
): Promise<Hex> {
  const { artblocksClient, project, projectSaleManagerMachine } = input;

  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();
  const liveSaleData =
    projectSaleManagerMachine.getSnapshot().context.liveSaleData;

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);
  assertLiveSaleData(liveSaleData);

  const { projectIndex, coreContractAddress } =
    getCoreContractAddressAndProjectIndexFromProjectId(project.id);

  const minterContract = getContract({
    address: project.minter_configuration?.minter.address as Hex,
    abi: minterSetPriceERC20V5Abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });

  const currencyAddress = project.minter_configuration.currency_address as Hex;
  const basePrice = BigInt(project.minter_configuration.base_price ?? 0);

  if (input.purchaseToAddress) {
    const { request } = await minterContract.simulate.purchaseTo(
      [
        input.purchaseToAddress,
        projectIndex,
        coreContractAddress,
        basePrice,
        currencyAddress,
      ],
      {
        account: walletClient.account.address,
      }
    );

    const purchaseTransactionHash = await walletClient.writeContract(request);

    return purchaseTransactionHash;
  }

  const { request } = await minterContract.simulate.purchase(
    [projectIndex, coreContractAddress, basePrice, currencyAddress],
    {
      account: walletClient.account.address,
    }
  );

  const purchaseTransactionHash = await walletClient.writeContract(request);

  return purchaseTransactionHash;
}

/** RAM Minter Helpers **/
export async function getRAMMinterUserPurchaseContext(
  input: Pick<PurchaseInitiationMachineContext, "artblocksClient" | "project">
): Promise<UserPurchaseContext> {
  const { artblocksClient, project } = input;
  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);

  if (!isRAMMinterType(project.minter_configuration?.minter?.minter_type)) {
    throw new Error("Project is not a RAM minter");
  }

  const userBids = await artblocksClient.graphqlRequest(GetUserBidsDocument, {
    projectId: project.id,
    userAddress: walletClient.account.address.toLowerCase(),
  });

  return {
    isEligible: true,
    additionalPurchaseData: {
      userBids: userBids.project_ranked_bids,
    },
  };
}

/** Base Minter Helpers **/
export async function initiateBasePurchase(
  input: Pick<
    PurchaseInitiationMachineContextWithFullTypes,
    | "artblocksClient"
    | "project"
    | "projectSaleManagerMachine"
    | "purchaseToAddress"
  >
): Promise<Hex> {
  const { artblocksClient, project, projectSaleManagerMachine } = input;

  const walletClient = artblocksClient.getWalletClient();
  const publicClient = artblocksClient.getPublicClient();
  const liveSaleData =
    projectSaleManagerMachine.getSnapshot().context.liveSaleData;

  assertPublicClientAvailable(publicClient);
  assertWalletClientWithAccount(walletClient);
  assertProjectWithValidMinterConfiguration(project);
  assertLiveSaleData(liveSaleData);

  const { projectIndex, coreContractAddress } =
    getCoreContractAddressAndProjectIndexFromProjectId(project.id);

  const minterContract = getContract({
    address: project.minter_configuration?.minter.address as Hex,
    abi: iSharedMinterSimplePurchaseV0Abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  });

  if (input.purchaseToAddress) {
    const { request } = await minterContract.simulate.purchaseTo(
      [input.purchaseToAddress, projectIndex, coreContractAddress],
      {
        value: liveSaleData.tokenPriceInWei,
        account: walletClient.account.address,
      }
    );

    const purchaseTransactionHash = await walletClient.writeContract(request);

    return purchaseTransactionHash;
  }

  const { request } = await minterContract.simulate.purchase(
    [projectIndex, coreContractAddress],
    {
      value: liveSaleData.tokenPriceInWei,
      account: walletClient.account.address,
    }
  );

  const purchaseTransactionHash = await walletClient.writeContract(request);

  return purchaseTransactionHash;
}
