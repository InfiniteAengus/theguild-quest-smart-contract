// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(uint32 solverId) external payable;
    function handleRewardToken(address token, uint32 solverId, uint256 amount) external;
    function proccessResolutionNative(uint32 seekerId, uint32 solverId, uint8 solverShare) external payable;
    function proccessResolutionToken(uint32 seekerId, uint32 solverId, uint8 solverShare, address token) external;
}