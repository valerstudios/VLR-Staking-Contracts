//SPDX-License-Identifier: Unlicense
// The EvlrStaker contract can be deployed for each enterprise token within the VLR
// token ecosystem.  It mimics the functionality of the VLR staking contract, with two key
// differences:
// 1.) Staking is done with the same token (the enterprise's BEP20 token)
// as that which is distributed through rewards.  On the other hand, VLR Staking rewards
// are given out as a basket of enterprise tokens, while stakers contribute VLR tokens
// 2.) MTC is not purchased with a portion of staking fees

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SampleBEP20s/VlrContract.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PancakeSwap/IPancakeRouter02.sol";


contract EvlrStaker is ERC20 {
    ERC20 private eVlrContract;
    StakerBag[] private stakes;
    address private charityBagAddress;
    address private distributor;
    uint256 private stakingRewardsBag;
    address private burnAddress = 0x000000000000000000000000000000000000dEaD;
    uint256 private stakingFee;
    uint256 private charityFee;
    uint256 private burnFee;
    uint256 private totalCharityCollected;

    event RewardDistribution(uint date, uint totalDistributed);

    constructor(
        string memory _tokenName,
        string memory _symbol,
        address _eVlrContractAddress,
        address _charityBagAddress,
        address _distributorAddress,
        uint256 _stakingFee, // a percentage over 10000 ie _stakingFee = 9 gives 0.9%
        uint256 _charityFee, // a percentage over 10000 ie _stakingFee = 9 gives 0.9%
        uint256 _burnFee // a percentage over 10000 ie _stakingFee = 9 gives 0.9%
    ) ERC20(_tokenName, _symbol) {
        eVlrContract = ERC20(_eVlrContractAddress);
        stakingRewardsBag = 0;
        charityBagAddress = _charityBagAddress;
        distributor = _distributorAddress;
        stakingFee = _stakingFee;
        charityFee = _charityFee;
        burnFee = _burnFee;
    }

    struct StakerBag {
        uint256 startTime;
        uint256 stopTime;
        uint256 stakedTokens;
        address ownerAddress;
    }

    function changeDistributor(address newDistributor) public {
        require(
            msg.sender == distributor,
            "Only the current distributor can change this address"
        );
        distributor = newDistributor;
    }

    function getCharityAddress()
        external
        view
        returns (address _charityBagAddress)
    {
        _charityBagAddress = charityBagAddress;
    }

    function getStakingRewardsBag()
        external
        view
        returns (uint256 totalRewards)
    {
        totalRewards = stakingRewardsBag;
    }

    function getTotalCharityCollected() public view returns (uint256 total) {
        total = totalCharityCollected;
    }

    function _getStakeValue(uint256 index, uint256 endTime)
        private
        view
        returns (uint256 bagValue)
    {
        StakerBag memory selectedBag = stakes[index];
        bagValue = 0;
        if (selectedBag.stopTime == 0) {
            bagValue =
                ((endTime - selectedBag.startTime) / 86400) *
                selectedBag.stakedTokens;
        } else {
            bagValue =
                ((selectedBag.stopTime - selectedBag.startTime) / 86400) *
                selectedBag.stakedTokens;
        }
    }

    function stake(uint256 _stakedVlrAmount)
        public
        returns (
            uint256 svlrMinted,
            uint256 stakingFeePaid,
            uint256 charityFeePaid,
            uint256 burnFeePaid
        )
    {
        //A. Check for a sufficient balance and send vlr to staking contract
        require(
            eVlrContract.balanceOf(msg.sender) >= (_stakedVlrAmount),
            "Insufficient enterprise token balance"
        );

        //B. Calculate fees
        stakingFeePaid = (_stakedVlrAmount * stakingFee) / 10000;
        stakingRewardsBag += stakingFeePaid; //increment the staking rewards fee bag
        charityFeePaid = (_stakedVlrAmount * charityFee) / 10000;
        totalCharityCollected += charityFeePaid;
        burnFeePaid = (_stakedVlrAmount * burnFee) / 10000;

        //C. Mint s-vlr
        svlrMinted =
            _stakedVlrAmount -
            (stakingFeePaid + charityFeePaid + burnFeePaid);
        _mint(msg.sender, svlrMinted);

        //D. Add staker bags
        _createStakeBag(block.timestamp, 0, svlrMinted, msg.sender);

        // //E.  Work with fees and burns
        eVlrContract.transferFrom(
            msg.sender,
            charityBagAddress,
            charityFeePaid
        );
        eVlrContract.transferFrom(msg.sender, burnAddress, burnFeePaid);
        eVlrContract.transferFrom(
            msg.sender,
            address(this),
            _stakedVlrAmount - burnFeePaid - charityFeePaid
        );
    }

    function unstake(uint256 _unstakedAmount)
        external
        returns (
            uint256 charityFeePaid,
            uint256 burnFeePaid,
            uint256 stakingFeePaid,
            uint256 vlrReturned,
            uint256 vlrRewardsReturned
        )
    {
        require(
            balanceOf(msg.sender) >= _unstakedAmount,
            "Insufficient staked VLR"
        );

        stakingFeePaid = (_unstakedAmount * stakingFee) / 1000;
        stakingRewardsBag += stakingFeePaid;
        charityFeePaid = (_unstakedAmount * charityFee) / 10000;
        burnFeePaid = (_unstakedAmount * burnFee) / 10000;

        uint256 totalSupply = totalSupply();

        vlrRewardsReturned =
            ((stakingRewardsBag**2) * (_unstakedAmount)) /
            ((stakingRewardsBag * totalSupply) +
                (totalSupply**2) -
                (totalSupply * _unstakedAmount));
        stakingRewardsBag -= vlrRewardsReturned;
        vlrReturned = vlrRewardsReturned + _unstakedAmount;
        eVlrContract.transfer(
            msg.sender,
            vlrReturned - stakingFeePaid - charityFeePaid - burnFeePaid
        );
        _burn(msg.sender, _unstakedAmount);

        eVlrContract.transfer(charityBagAddress, charityFeePaid);
        eVlrContract.transfer(burnAddress, burnFeePaid);
        _closeUnstakedBags(msg.sender, _unstakedAmount);
    }

    function _bagsOwned(address owner)
        private
        view
        returns (uint256 numberOwned)
    {
        numberOwned = 0;
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].ownerAddress == owner) {
                numberOwned++;
            }
        }
    }

    function distributeRewards(uint256 rewardTokenValue) external {
        require(
            msg.sender == distributor,
            "Only designated distributor can make reward distributions"
        );
        require(
            eVlrContract.balanceOf(msg.sender) >= rewardTokenValue,
            "Cannot distribute more tokens than owned"
        );
        uint256 totalStakedValue = _getTotalStakedValue(block.timestamp);
        for (uint256 i = 0; i < stakes.length; i++) {
            uint256 bagValue = _getStakeValue(i, block.timestamp);
            uint256 transferAmount = (rewardTokenValue * bagValue) /
                totalStakedValue;
            eVlrContract.transfer(stakes[i].ownerAddress, transferAmount);
        }
        _resetRewardsStakes();
        emit RewardDistribution(block.timestamp, rewardTokenValue);
    }

    function _resetRewardsStakes() private {
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].stopTime > 0) {
                stakes[i] = stakes[stakes.length - 1];
                stakes.pop();
            } else {
                stakes[i].startTime = block.timestamp;
                stakes[i].stopTime = 0;
            }
        }
    }

    function _getTotalStakedValue(uint256 endTime)
        private
        view
        returns (uint256)
    {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].stopTime > 0) {
                uint256 stakedTime = (stakes[i].stopTime -
                    stakes[i].startTime) / 86400;
                totalValue += (stakedTime * stakes[i].stakedTokens);
            } else {
                uint256 stakedTime = (endTime - stakes[i].startTime) / 86400;
                totalValue += (stakedTime * stakes[i].stakedTokens);
            }
        }
        return totalValue;
    }

    function _createStakeBag(
        uint256 startTime,
        uint256 stopTime,
        uint256 stakedTokens,
        address owner
    ) private {
        StakerBag memory newBag;
        newBag.startTime = startTime;
        newBag.stopTime = stopTime;
        newBag.stakedTokens = stakedTokens;
        newBag.ownerAddress = owner;
        stakes.push(newBag);
    }

    function _closeUnstakedBags(address owner, uint256 totalRemoved) private {
        uint256 stakeSum = 0;
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].ownerAddress == owner) {
                if (stakeSum + stakes[i].stakedTokens <= totalRemoved) {
                    stakes[i].stopTime = block.timestamp;
                    stakeSum += stakes[i].stakedTokens;
                } else {
                    uint256 remainder = (stakeSum + stakes[i].stakedTokens) -
                        totalRemoved;
                    stakes[i].stakedTokens = remainder;
                }
            }
        }
    }
}
