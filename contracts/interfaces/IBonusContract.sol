pragma solidity ^0.5.0;

interface IBonusContract {
    function triggerBonus(address _to) external returns (bool);

    function bonusIsActive() external view returns (bool);
}
