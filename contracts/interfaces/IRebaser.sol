// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRebaser {

  function getPositiveEpochCount() external view returns (uint256);
  function getBlockForPositiveEpoch(uint256) external view returns (uint256);
  function getDeltaForPositiveEpoch(uint256) external view returns (uint256);

}