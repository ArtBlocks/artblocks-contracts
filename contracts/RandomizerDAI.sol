
pragma solidity ^0.5.0;

interface DAI {
  function balanceOf(address _address) external view returns (uint256);
}



contract Randomizer {

  DAI public daiContract;

  constructor() public {
    daiContract=DAI(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);
  }

  function getBalance () public view returns (uint256){
    return daiContract.balanceOf(0x9F885908bF9DF0d083245Ac34F39a28b493136be);
  }

}
