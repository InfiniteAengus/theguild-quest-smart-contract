pragma solidity ^0.5.16;

import "./BasicRebaser.sol";

contract Rebaser is BasicRebaser {

  constructor (address router, address usdc, address wNative, address token, address _treasury, address oracle, address _taxManager)
  BasicRebaser(token, _treasury, _taxManager) public {
  }

}