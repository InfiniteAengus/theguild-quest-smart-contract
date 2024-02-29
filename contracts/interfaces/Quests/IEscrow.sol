//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface IEscrow {
    function proccessPayment() external;
    function proccessResolution(
        uint8 solverShare 
    ) external;

    function initialize(
        address _token, 
        uint32 _seekerId, 
        uint32 _solverId, 
        uint256 _paymentAmount
    ) external payable;
}