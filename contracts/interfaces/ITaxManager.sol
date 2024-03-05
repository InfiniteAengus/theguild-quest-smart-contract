// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

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

    function getSeekerFees() external view returns (SeekerFees memory);
    function getSolverFees() external view returns (SolverFees memory);

    function referralTaxReceiver() external view returns (address);
    function platformTaxReceiver() external view returns (address);
    function platformTreasuryReceiver() external view returns (address);

    // function seekerFeesTreasury() external view returns (address);
    // function solverFeesTreasury() external view returns (address);
    function disputeFeesTreasury() external view returns (address);
    
    function disputeDepositRate() external view returns (uint256);
    // function solverTaxRate() external view returns (uint256);
    function taxBaseDivisor() external view returns (uint256);
    function protocolTaxRate() external view returns (uint256);
    function getReferralRate(uint8 depth, uint8 tier) external view returns (uint256);
}