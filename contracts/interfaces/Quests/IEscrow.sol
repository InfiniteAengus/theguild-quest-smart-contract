//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface IEscrow {
    function initialize(address token) external payable;
    function proccessPayment(uint32 solverId, address rewarder) external;
    function proccessResolution(uint32 seekerId, uint32 solverId, uint8 solverShare, address rewarder) external;
}
