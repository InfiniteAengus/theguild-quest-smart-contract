// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface TargetContract {
    function recoverTokens(address _token, address _receiver) external;
}

contract MockFailReceiver {
    
    function targetRecoverTokens(address _target) external {
        TargetContract(_target).recoverTokens(address(0), address(this));
    }
}