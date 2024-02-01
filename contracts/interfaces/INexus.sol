//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface INexus {
    function isHandler(address) external view returns (bool);
    function getHandler(uint32) external view returns (address);
    function notifyTierUpdate(uint8, uint8) external;
    function notifySelfTaxClaimed(uint256, uint256) external;
    function notifyReferralTaxClaimed(uint256, uint256) external;
    function tierManager() external view returns(address);
    function taxManager() external view returns(address);
    function rewarder() external view returns(address);
    function master() external view returns(address);
}