// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(uint32 solverId) external payable;
    function handleRewardToken(address token, uint32 solverId, uint256 amount) external;
    function proccessResolutionNative(uint32 seekerId, uint32 solverId, uint8 solverShare) external payable;
    function proccessResolutionToken(uint32 seekerId, uint32 solverId, uint8 solverShare, address token) external;

    function calculateSeekerTax(uint256 paymentAmount) external returns (uint256 referralTax, uint256 platformTax);
    function handleSeekerTaxNative(uint32 _solverId, uint256 _referralTaxAmount, uint256 _platformTaxAmount) external payable;
    function handleSeekerTaxToken(uint32 _solverId, uint256 _referralTaxAmount, uint256 _platformTaxAmount, address token) external;
}