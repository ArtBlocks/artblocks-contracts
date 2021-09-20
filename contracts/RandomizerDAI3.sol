
pragma solidity ^0.5.0;

interface DAI {
  function balanceOf(address _address) external view returns (uint256);
}

interface RandomizerDAI{
  function getBalance() external view returns (uint256);
}

interface RandomizerDAI2{
  function getBalance() external view returns (uint256);
}



contract Randomizer3 {

  DAI public daiContract;
  RandomizerDAI public randomizerDAIContract;
  RandomizerDAI2 public randomizerDAIContract2;

  constructor() public {
    daiContract=DAI(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);
    randomizerDAIContract=RandomizerDAI(0x3B1b0d106301D9a10fa07154b50BB34Cd43c02af);
    randomizerDAIContract2=RandomizerDAI2(0x796b5a7c734B21594b09778da75c7c0045108e5c);
  }

  function getBalance () public view returns (uint256){
    uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    uint256 daiBal3 = randomizerDAIContract2.getBalance();
    return daiBal1 + daiBal2+ daiBal3;
  }

  function getBalance1 () public view returns (uint256){
    uint256 daiBal1 = randomizerDAIContract.getBalance();
    //uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    return daiBal1;
  }

  function getBalance2 () public view returns (uint256){
    //uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    return daiBal2;
  }

  function getBalance3 () public view returns (uint256){
    //uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal3 = randomizerDAIContract2.getBalance();
    return daiBal3;
  }

  function returnHashStringDynamic() public view returns (bytes32){
    uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    uint256 daiBal3 = randomizerDAIContract2.getBalance();
    bytes32 hash = keccak256(abi.encodePacked(daiBal1, block.number, blockhash(block.number - 1), daiBal2, daiBal3));
    return hash;
  }

  function returnHashStringClean() public view returns (bytes32){
    uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    uint256 daiBal3 = randomizerDAIContract2.getBalance();
    bytes32 hash = keccak256(abi.encodePacked(daiBal1, daiBal2, daiBal3));
    return hash;
  }

}
