import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe, {
  SafeFactory,
  SafeAccountConfig,
  ContractNetworksConfig,
} from "@gnosis.pm/safe-core-sdk";

export const getGnosisSafe = async (
  account1: SignerWithAddress,
  account2: SignerWithAddress,
  account3: SignerWithAddress
): Promise<Safe> => {
  // instantiate an EthAdapter for gnosis sdk
  const ethAdapter = new EthersAdapter({
    ethers,
    signer: account1,
  });
  // deploy new gnosis safe contract network
  const multiSendFactory = await ethers.getContractFactory("MultiSendMock");
  const gnosisSafeFactory = await ethers.getContractFactory("GnosisSafeMock");
  const gnosisProxyFactoryFactory = await ethers.getContractFactory(
    "GnosisSafeProxyFactoryMock"
  );
  const multiSend = await multiSendFactory.connect(account1).deploy();
  const gnosisSafe = await gnosisSafeFactory.connect(account1).deploy();
  const gnosisProxyFactory = await gnosisProxyFactoryFactory
    .connect(account1)
    .deploy();

  // generate new safeFactory using new safe core
  const id = await ethAdapter.getChainId();
  const contractNetworks: ContractNetworksConfig = {
    [id]: {
      multiSendAddress: multiSend.address,
      safeMasterCopyAddress: gnosisSafe.address,
      safeProxyFactoryAddress: gnosisProxyFactory.address,
    },
  };
  const safeFactory = await SafeFactory.create({
    ethAdapter,
    isL1SafeMasterCopy: true,
    contractNetworks,
  });
  const owners = [account1.address, account2.address, account3.address];
  const threshold = 2;
  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold,
  };
  const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig });
  return safeSdk;
};
