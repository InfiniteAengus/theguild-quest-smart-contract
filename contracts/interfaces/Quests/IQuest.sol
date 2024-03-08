//SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.19;

interface IQuest {
    function initialize(
        uint32 seekerId, 
        uint32 solverId, 
        uint256 paymentAmount, 
        string memory infoURI, 
        address escrowImplementation, 
        address token
    ) external;
    
    function startDispute() external payable;
    function resolveDispute(uint32 solverShare) external;
    function finishQuest() external;
    function receiveReward() external;
    function getRewarder() external view returns (address);
}