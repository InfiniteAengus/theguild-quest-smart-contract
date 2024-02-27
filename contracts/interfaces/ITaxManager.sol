// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface ITaxManager {
    struct SeekerFees {
        uint256 referralRewards;
        uint256 platformRevenue;
    }

    function getSeekerFees() external view returns (SeekerFees memory);

    // Referral tax receiver should be rewarder contract
    function getReferralTaxReceiver() external view returns (address);
    function getPlatformTaxReceiver() external view returns (address);

    function solverTaxPool() external view returns (address);
    function revenuePool() external view returns (address);
    
    
    function solverTaxRate() external view returns (uint256);
    function taxBaseDivisor() external view returns (uint256);
    function protocolTaxRate() external view returns (uint256);
    function getReferralRate(uint8 depth, uint8 tier) external view returns (uint256);
}