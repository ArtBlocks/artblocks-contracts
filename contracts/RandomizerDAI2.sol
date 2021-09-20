
pragma solidity ^0.5.0;

interface DAI {
  function balanceOf(address _address) external view returns (uint256);
}

interface RandomizerDAI{
  function getBalance() external view returns (uint256);
}



contract Randomizer2 {

  DAI public daiContract;
  RandomizerDAI public randomizerDAIContract;

  constructor() public {
    daiContract=DAI(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);
    randomizerDAIContract=RandomizerDAI(0x3B1b0d106301D9a10fa07154b50BB34Cd43c02af);
  }

  function getBalance () public view returns (uint256){
    uint256 daiBal1 = randomizerDAIContract.getBalance();
    uint256 daiBal2 = daiContract.balanceOf(0xe09d493Ef62fBd4BD16956e418c27Caee4E52626);
    return daiBal1 + daiBal2;
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

}
