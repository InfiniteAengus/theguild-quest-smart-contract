// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(address nexus) external;
    function handleRewardToken(address nexus, address token) external;
}