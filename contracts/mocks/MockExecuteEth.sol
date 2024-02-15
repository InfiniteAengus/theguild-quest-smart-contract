// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockExecuteEth {
    
    bytes32 public value;

    constructor() {
        value = "0x";
    }

    receive() external payable {}

    function changeValue(bytes32 _newValue) external returns (bool) {
        value = _newValue;
        return true;
    }
}