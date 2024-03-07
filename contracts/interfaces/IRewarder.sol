// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(uint32 solverId, uint256 amount) external payable;
    function handleRewardToken(address token, uint32 solverId, uint256 amount) external;
    function handleStartDisputeNative(uint256 paymentAmount) external payable;
    function handleStartDisputeToken(uint256 paymentAmount, address token, uint32 seekerId) external ;
    function processResolutionNative(uint32 seekerId, uint32 solverId, uint32 solverShare) external payable;
    function processResolutionToken(uint32 seekerId, uint32 solverId, uint32 solverShare, address token, uint256 payment) external;
    function calculateSeekerTax(uint256 paymentAmount) external returns (uint256 referralTax, uint256 platformTax);
    function handleSeekerTaxNative(uint32 _seekerId, uint256 _referralTaxAmount, uint256 _platformTaxAmount) external payable;
    function handleSeekerTaxToken(uint32 _seekerId, uint256 _referralTaxAmount, uint256 _platformTaxAmount, address token) external;
}