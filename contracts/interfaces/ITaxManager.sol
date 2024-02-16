// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface ITaxManager {
    function seekerTaxPool() external returns (address);
    function solverTaxPool() external view returns (address);
    function maintenancePool() external view returns (address);
    function devPool() external view returns (address);
    function rewardAllocationPool() external view returns (address);
    function perpetualPool() external view returns (address);
    function tierPool() external view returns (address);
    function marketingPool() external view returns (address);
    function revenuePool() external view returns (address);
    
    
    function seekerTaxRate() external view returns (uint256);
    function solverTaxRate() external view returns (uint256);
    function taxBaseDivisor() external view returns (uint256);
    function protocolTaxRate() external view returns (uint256);
    function getReferralRate(uint8 depth, uint8 tier) external view returns (uint256);
}