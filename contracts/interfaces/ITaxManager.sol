// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

interface ITaxManager {
    struct SeekerFees {
        uint256 referralRewards;
        uint256 platformRevenue;
    }

    struct SolverFees {
        uint256 referralRewards;
        uint256 platformRevenue;
        uint256 platformTreasury;
    }

    struct ReferralTaxRates {
        uint256 first;
        uint256 second;
        uint256 third;
        uint256 fourth;
    }

    function taxBaseDivisor() external view returns (uint256);

    function getSeekerFees() external view returns (SeekerFees memory);
    function getSolverFees() external view returns (SolverFees memory);

    function platformTreasury() external view returns (address);
    function platformRevenuePool() external view returns (address);
    function referralTaxTreasury() external view returns (address);
    function disputeFeesTreasury() external view returns (address);
    
    function disputeDepositRate() external view returns (uint256);
    function getReferralRate(uint8 depth, uint8 tier) external view returns (uint256);
}