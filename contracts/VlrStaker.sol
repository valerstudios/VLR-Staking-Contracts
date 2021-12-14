//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SampleBEP20s/VlrContract.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PancakeSwap/IPancakeRouter02.sol";

contract VlrStaker is ERC20 {
    VlrContract private vlrContract;
    IPancakeRouter02 private pancakeRouter;

    StakerBag[] private stakes;
    address private charityBagAddress;
    address[] private vlrToMtcPath;
    address private distributor;
    uint256 private stakingRewardsBag;
    uint256 private totalCharityCollected;

    address private burnAddress = 0x000000000000000000000000000000000000dEaD;

    //the following parameters are required for contract deployment
    // 1.)  The address of the VLR Token Contract, which holds tokens that are being staked.
    // 2.)  The address of a charity bag which recieves a portion of staking/ unstaking fees
    // 3.)  The address of the MTC token contract, which is purchased through pancake swap through staking/ unstaking fees
    // 4.)  The wrapped bnb address, which is used in the pancake swap path
    // 5.)  The address of the distributor who is permitted to distribute rewards token to stakers
    constructor(
        address _VlrContractAddress,
        address _charityBagAddress,
        address _mtcContractAddress,
        address _pancakeRouterAddress,
        address _wbnbAddress,
        address _distributorAddress
    ) ERC20("Staked VLR Token", "SVLR") {
        vlrContract = VlrContract(_VlrContractAddress);
        stakingRewardsBag = 0;
        charityBagAddress = _charityBagAddress;
        vlrToMtcPath.push(_VlrContractAddress);
        vlrToMtcPath.push(_wbnbAddress);
        vlrToMtcPath.push(_wbnbAddress);
        vlrToMtcPath.push(_mtcContractAddress);
        pancakeRouter = IPancakeRouter02(_pancakeRouterAddress);
        distributor = _distributorAddress;
    }

    // The StakerBag struct allows for simple calculations of the staker's contributions
    struct StakerBag {
        uint256 startTime;
        uint256 stopTime;
        uint256 stakedTokens;
        address ownerAddress;
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

    function getStake(uint256 stakeIndex)
        external
        view
        returns (StakerBag memory selectedBag)
    {
        selectedBag = stakes[stakeIndex];
    }
    function getTotalCharityCollected() public view returns (uint256 total) {
        total = totalCharityCollected;
    }
    function getStakeValue(uint256 index, uint256 endTime)
        public
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

    //The path through which MTC is purchases is defined upon deployment
    function _buyMtc(uint256 _VlrToSwap, address _recipientAddress) private {
        uint256 minOut = _VlrToSwap - (_VlrToSwap / 10);
        pancakeRouter.swapExactTokensForTokens(
            _VlrToSwap,
            minOut,
            vlrToMtcPath,
            _recipientAddress,
            (block.timestamp + (60 * 10))
        );
    }

    //This function is temporarily public for testing purposes
    function stakeWithTimeParameters(
        uint256 startTime,
        uint256 stopTime,
        uint256 _stakedVlrAmount
    )
        public
        returns (
            uint256 mtcFeePaid,
            uint256 charityFeePaid,
            uint256 burnFeePaid,
            uint256 stakingFeePaid,
            uint256 svlrMinted
        )
    {
        //A. Check for a sufficient balance and send vlr to staking contract
        require(
            vlrContract.balanceOf(msg.sender) >= (_stakedVlrAmount),
            "Insufficient enterprise token balance"
        );

        //B. Calculate fees
        stakingFeePaid = (_stakedVlrAmount * 24) / 1000;
        stakingRewardsBag += stakingFeePaid; //increment the staking rewards fee bag
        mtcFeePaid = (_stakedVlrAmount * 3) / 1000;
        charityFeePaid = (_stakedVlrAmount * 21) / 10000;
        totalCharityCollected += charityFeePaid;
        burnFeePaid = (_stakedVlrAmount * 9) / 10000;

        //C. Mint staked vlr to represent a portion of ownership
        svlrMinted =
            _stakedVlrAmount -
            (stakingFeePaid + mtcFeePaid + charityFeePaid + burnFeePaid);
        _mint(msg.sender, svlrMinted);

        //D. Add staker bags
        _createStakeBag(startTime, stopTime, svlrMinted, msg.sender);

        // //E.  Work with fees and burns
        vlrContract.transferFrom(msg.sender, charityBagAddress, charityFeePaid);
        vlrContract.transferFrom(msg.sender, burnAddress, burnFeePaid);
        vlrContract.transferFrom(
            msg.sender,
            address(this),
            _stakedVlrAmount - burnFeePaid - charityFeePaid - mtcFeePaid
        );
        // _buyMtc(mtcFeePaid, msg.sender);
        vlrContract.transferFrom(msg.sender, burnAddress, mtcFeePaid);
    }

    function stake(uint256 _stakedAmount) external {
        stakeWithTimeParameters(block.timestamp, 0, _stakedAmount);
    }

    function unstake(uint256 _unstakedAmount)
        external
        returns (
            uint256 mtcFeePaid,
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

        stakingFeePaid = (_unstakedAmount * 24) / 1000;
        stakingRewardsBag += stakingFeePaid;
        mtcFeePaid = (_unstakedAmount * 3) / 1000;
        charityFeePaid = (_unstakedAmount * 21) / 10000;
        burnFeePaid = (_unstakedAmount * 9) / 10000;

        uint256 totalSupply = totalSupply();
        //two ratios are used to determine the amount of staking fee rewards that an unstaking user is owed
        // 1.)  The Total Amount of Staking Fees Collected/ The Total Amount of VLR in the contract
        // 2.)  The user's staked VLR tokens/ the contract's total supply prior to unstaking
        // We multiply the two ratios by the total amount of staking fees collected to determine staking fees returned to user

        vlrRewardsReturned =
            ((stakingRewardsBag**2) * (_unstakedAmount)) /
            ((stakingRewardsBag * totalSupply) +
                (totalSupply**2) -
                (totalSupply * _unstakedAmount));
        stakingRewardsBag -= vlrRewardsReturned;
        vlrReturned = vlrRewardsReturned + _unstakedAmount;
        vlrContract.transfer(
            msg.sender,
            vlrReturned -
                stakingFeePaid -
                mtcFeePaid -
                charityFeePaid -
                burnFeePaid
        );
        _burn(msg.sender, _unstakedAmount);

        vlrContract.transfer(charityBagAddress, charityFeePaid);
        // _buyMtc(mtcFeePaid, msg.sender);
        vlrContract.transfer(burnAddress, mtcFeePaid);

        vlrContract.transfer(burnAddress, burnFeePaid);

        closeUnstakedBags(msg.sender, _unstakedAmount);
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

    //Note: distributor is given approval prior to making distributions
    //Should we add a require check for approvals?
    function distributeRewards(
        address[] memory rewardTokenAddress,
        uint256[] memory rewardTokenValue
    ) external {
        require(
            msg.sender == distributor,
            "Only designated distributor can make reward distributions"
        );
        ERC20 enterpriseContract;
        for (uint256 j = 0; j < rewardTokenAddress.length; j++) {
            enterpriseContract = ERC20(rewardTokenAddress[j]);
            uint256 totalStakedValue = getTotalStakedValue(block.timestamp);
            for (uint256 i = 0; i < stakes.length; i++) {
                uint256 bagValue = getStakeValue(i, block.timestamp);
                uint256 transferAmount = (rewardTokenValue[j] * bagValue) /
                    totalStakedValue;
                enterpriseContract.transferFrom(
                    msg.sender,
                    stakes[i].ownerAddress,
                    transferAmount
                );
            }
        }
        resetRewardsStakes();
    }

    // Staking bag timers are reset by setting the stopTime to 0 and startTime to block.timestamp
    function resetRewardsStakes() private {
        for (uint256 i = 0; i < stakes.length; i++) {
            //if the stoptime is not 0, then that amount has been unstaked.  It can be removed
            //from the array of stakes, once the value has been used for a reward distribution
            if (stakes[i].stopTime > 0) {
                stakes[i] = stakes[stakes.length - 1];
                stakes.pop();
            } else {
                stakes[i].startTime = block.timestamp;
                stakes[i].stopTime = 0;
            }
        }
    }

    //to-do: make private after testing complete
    function getTotalStakedValue(uint256 endTime)
        public
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

    // this function sets the stoptime to block.timestamp for removed staking, leaving a remainder with stoptime=0 when it exists
    function closeUnstakedBags(address owner, uint256 totalRemoved) private {
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
