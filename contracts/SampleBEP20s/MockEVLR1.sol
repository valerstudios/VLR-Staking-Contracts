//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockEVLR1 is ERC20{

    constructor(uint256 initialSupply) ERC20("Enterprise VLR Token 1", "EVLR1"){
        _mint(msg.sender, initialSupply);
    }

    function getContractAddress() public view returns(address contractAddress){
        contractAddress = address(this);
    }
}