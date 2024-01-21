// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(uint32 solverId) external payable;
    function handleRewardToken(address nexus, address token) external;
}