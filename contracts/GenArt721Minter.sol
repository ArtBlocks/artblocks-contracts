
pragma solidity ^0.5.0;

import "./libs/SafeMath.sol";
import "./libs/Strings.sol";


interface GenArt721Contract {
  function projectIdToCurrencySymbol(uint256 _projectId) external view returns (string memory);
  function projectIdToCurrencyAddress(uint256 _projectId) external view returns (address);
  function projectIdToArtistAddress(uint256 _projectId) external view returns (address payable);
  function projectIdToPricePerTokenInWei(uint256 _projectId) external view returns (uint256);
  function projectIdToAdditionalPayee(uint256 _projectId) external view returns (address payable);
  function projectIdToAdditionalPayeePercentage(uint256 _projectId) external view returns (uint256);
  function artblocksAddress() external view returns (address payable);
  function artblocksPercentage() external view returns (uint256);


  function mint(address _to, uint256 _projectId, address _by) external returns (uint256 tokenId);
}




contract GenArt721Minter {
  using SafeMath for uint256;

  GenArt721Contract public artblocksContract;

  constructor(address _genArt721Address) public {
    artblocksContract=GenArt721Contract(_genArt721Address);
  }



function getCurrencySymbol(uint256 _projectId) public view returns (string memory){
  string memory currencySymbol = artblocksContract.projectIdToCurrencySymbol(_projectId);
  return currencySymbol;

}

function purchase(uint256 _projectId) public payable returns(uint256 _tokenId){
  require(msg.value >= artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Must send at least pricePerTokenInWei");
  uint256 tokenId = artblocksContract.mint(msg.sender, _projectId, msg.sender);

  _splitFunds(_projectId);

  return tokenId;
}

function _splitFunds(uint256 _projectId) internal {
    if (msg.value > 0) {

        uint256 pricePerTokenInWei = artblocksContract.projectIdToPricePerTokenInWei(_projectId);
        uint256 refund = msg.value.sub(artblocksContract.projectIdToPricePerTokenInWei(_projectId));

        if (refund > 0) {
            msg.sender.transfer(refund);
        }

        uint256 foundationAmount = pricePerTokenInWei.div(100).mul(artblocksContract.artblocksPercentage());
        if (foundationAmount > 0) {
            artblocksContract.artblocksAddress().transfer(foundationAmount);
        }

        uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);

        uint256 additionalPayeeAmount;
        if (artblocksContract.projectIdToAdditionalPayeePercentage(_projectId) > 0) {
            additionalPayeeAmount = projectFunds.div(100).mul(artblocksContract.projectIdToAdditionalPayeePercentage(_projectId));
            if (additionalPayeeAmount > 0) {
                artblocksContract.projectIdToAdditionalPayee(_projectId).transfer(additionalPayeeAmount);
            }
        }

        uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
        if (creatorFunds > 0) {
            artblocksContract.projectIdToArtistAddress(_projectId).transfer(creatorFunds);
        }
    }
}

}
