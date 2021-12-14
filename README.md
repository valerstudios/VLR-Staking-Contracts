# VLR Staking Contract

The VLR Staking contract allows user to stake their VLR in return for reward distribution from a basket of social enterprises within the VLR ecosystem

When staking, fees totaling 3% are collected according to the following breakdown:

- 10% (of 3% = 0.3%) exchanges VLR for MTC, which is sent to the staker's wallet
- 80% (of 3% = 2.4%) goes to other stakers as a staking fee
- 7% (of 3% = 0.21%) is sent to a charity bag address, which is distributed through a DAO voting system
- 3% (of 3% = 0.09%) is burned

When the distributor is ready, revenues from social enterprises will be split up between stakers proportionately.  After rewards distribution, staking times are reset, as opposed to a recurring reward distribution on a consistent basis.  Additionally, the distributor chooses which basket of enterprise tokens will be shared during each period.  

NOTES TO AUDITORS:<br>
1.)  Currently, mtc purchase from pancake swap is not a part of our testing.  To enable it in the contract:
-  delete lines 156, 210
-  enable line 155, 209

2.) To efficiently complete tests, we have been using a public stakeWithTimeParameters() function.  The final contract will only have a public stake() function.

# EVLR Staking Contract

Enterprise VLR Staking contracts are used by social enterprises within the VLR ecosystem to distribute rewards for stakers.  

When stakers lock in that enterprise's BEP20 token, they are charged a  fees totaling 3% according to the following breakdown:

- 90% (of 3% = 2.7%) goes to stakers as a staking fee
- 7% (of 3% = 0.21%) is sent to a charity bag address, which is distributed through a DAO voting system
- 3% (of 3% = 0.09%) is burned

When the enterprise staking contract distributor is ready, a portion of that enterprise's revenues will be shared as a reward proportionately between stakers.  Similar to the VLR Staking Contract, staking times will be reset after distributions, rather than on a set schedule.  Unlike the VLR staking contract, rewards will be distributed in the same token as had been originally staked. 


