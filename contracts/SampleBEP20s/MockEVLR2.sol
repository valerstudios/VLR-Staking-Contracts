//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockEVLR2 is ERC20{

    constructor(uint256 initialSupply) ERC20("Enterprise VLR Token 2", "EVLR2"){
        _mint(msg.sender, initialSupply);
    }

    function getContractAddress() public view returns(address contractAddress){
        contractAddress = address(this);
    }
}