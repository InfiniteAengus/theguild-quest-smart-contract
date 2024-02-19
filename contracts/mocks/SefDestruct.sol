// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Still not deprecated
// This contract is used to send ether to an address by force
contract SelfDestruct {
    
    receive() external payable {}

    function sendEther(address _to) external payable  {
        // cast address to payable
        address payable addr = payable(address(_to));
        selfdestruct(addr);
    }
}