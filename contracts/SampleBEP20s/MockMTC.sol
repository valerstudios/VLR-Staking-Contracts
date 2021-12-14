//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockMTC is ERC20{

    constructor(uint256 initialSupply) ERC20("Sample MTC Token", "MTC"){
        _mint(msg.sender, initialSupply);
    }

    function getContractAddress() public view returns(address contractAddress){
        contractAddress = address(this);
    }
}