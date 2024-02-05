// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Contract of the Guild Xp Token
contract GuildXp is ERC20, ERC20Burnable, Ownable {
    constructor(address owner) ERC20("WILSON", "WLSN") Ownable(owner) {}
    
    // set decimals to 2
    function decimals() public view virtual override returns (uint8) {
        return 2;
    }

    /**
     * @notice Mints tokens to the specified address
     * @param to The address of the recipient
     * @param amount Amount of tokens (with 2 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
