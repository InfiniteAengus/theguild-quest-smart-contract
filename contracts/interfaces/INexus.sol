//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface INexus {
    function isHandler(address) external view returns (bool);
    function getHandler(uint256) external view returns (address);
    function notifyLevelUpdate(uint256, uint256) external;
    function notifySelfTaxClaimed(uint256, uint256) external;
    function notifyReferralTaxClaimed(uint256, uint256) external;
    function tierManager() external view returns(address);
    function taxManager() external view returns(address);
    function rewarder() external view returns(address);
    function master() external view returns(address);
    function getHandlerForProfile(address) external view returns (address);
}