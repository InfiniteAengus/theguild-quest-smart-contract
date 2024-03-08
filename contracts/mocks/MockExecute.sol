// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract MockExecute {
    
    bytes32 public value;

    constructor() {
        value = "0x";
    }

    function changeValue(bytes32 _newValue) external returns (bool) {
        value = _newValue;

        return true;
    }
}