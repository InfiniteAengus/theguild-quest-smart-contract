// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRewarder {
    function handleRewardNative(address factory, address token) external;
    function handleRewardToken() external;
}