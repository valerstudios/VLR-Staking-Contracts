const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { deployments, ethers } = require("hardhat");
const { toBigNumber, toDecimal } = require("./utilities/index.js");

describe("VLR Enterprise Staking Pool Tests", function () {
  let mockEvlr;
  let staker;
  let deployerWallet;
  let signer1;
  let signer2;
  let signer3;
  let signer4;
  let signer5;
  let signer6;
  let deadSigner;
  let charityBag;

  beforeEach("deploys Mock VLR Contract and Staking Contract", async () => {
    [
      deployerWallet,
      signer1,
      signer2,
      signer3,
      signer4,
      signer5,
      signer6,
      deadSigner,
      charityBag,
    ] = await ethers.getSigners();

    const MockEVLR = await ethers.getContractFactory("MockEVLR1");
    mockEvlr = await MockEVLR.deploy(toBigNumber("1000000000000000"));
    await mockEvlr.deployed();
    await mockEvlr.transfer(signer1.address, 1000000000000);
    await mockEvlr.transfer(signer2.address, 1000000000000);
    await mockEvlr.transfer(signer3.address, 1000000000000);
    await mockEvlr.transfer(signer4.address, 1000000000000);
    await mockEvlr.transfer(signer5.address, 1000000000000);
    await mockEvlr.transfer(signer6.address, 1000000000000);
    const mockEvlrAddress = mockEvlr.address;

    const Staker = await ethers.getContractFactory("EvlrStaker");
    staker = await Staker.deploy(
      "test staker 1",
      "TSK1",
      mockEvlr.address,
      charityBag.address,
      deployerWallet.address,
      27,
      21,
      9
    );
    await staker.deployed();
  });

  it("Introduces the tests", async function () {
    console.log("******Testing with the following Contracts:");
    console.log("Enterprise Token Address: ", mockEvlr.address);
    console.log("EVLR Staking Pool Contract Address: ", staker.address);
    console.log("Symbol: ", await staker.symbol());
  });

  it("confirms that the charity bag is connected and properly distributing funds", async function () {
    expect(await staker.getCharityAddress()).to.equal(charityBag.address);
    await mockEvlr.approve(staker.address, toBigNumber("100000000000000000"));
    await staker.stake(500000000);
    expect(await mockEvlr.balanceOf(charityBag.address)).to.equal(
      500000000 * (21 / 10000)
    );
  });
  it("accepts staking, transfers Evlr into contract, and mints svlr for msg.sender", async function () {
    await expect(staker.stake(5.55555e11)).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance"
    );
    await mockEvlr.approve(staker.address, toBigNumber("100000000000000000"));
    expect(await staker.totalSupply()).to.equal(0);

    await staker.stake(5.5555e10);
    //fees paid are 0.3%, whereas 2.7% of fees remain in the contract as staking fees

    let feesPaid = 5.5555e10 * 0.003;
    expect(await mockEvlr.balanceOf(deployerWallet.address)).to.equal(
      toBigNumber("999999994000000" - "55555")
    );
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(
      "55555000000" - feesPaid
    );

    const stakedVLR = 55555000000 * 0.97;
    expect(await staker.balanceOf(deployerWallet.address)).to.equal(stakedVLR);
    let rewardsAdded = 55555000000 * 0.027;
    expect(await staker.getStakingRewardsBag()).to.equal(rewardsAdded);
    // expect((await staker.getStake(0)).ownerAddress).to.equal(
    //   deployerWallet.address
    // );

    await mockEvlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await staker.connect(signer1).stake(55555000000);
    expect(await staker.balanceOf(signer1.address)).to.equal(stakedVLR);
    expect(await staker.totalSupply()).to.equal(2 * stakedVLR);
    expect(await staker.getStakingRewardsBag()).to.equal(rewardsAdded * 2);
    // expect((await staker.getStake(1)).ownerAddress).to.equal(signer1.address);
  });
  it("unstakes, transfers EVLR to user with rewards, and burns svlr", async function () {
    await mockEvlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));

    await staker.stake(1100000000);

    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1096700000);
    expect(await staker.totalSupply()).to.equal(1067000000);
    expect(await mockEvlr);

    await staker.unstake(97000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1002224264);
    expect(await staker.totalSupply()).to.equal(970000000);

    await staker.connect(signer2).stake(300000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1301324264);
    expect(await staker.totalSupply()).to.equal(1261000000);

    await staker.connect(deployerWallet).unstake(194000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1112275204);
    expect(await staker.totalSupply()).to.equal(1067000000);

    await staker.connect(deployerWallet).unstake(291000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(828203622);
    expect(await staker.totalSupply()).to.equal(776000000);

    await staker.connect(signer2).unstake(291000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(542578826);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.stake(800000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1340178826);
    expect(await staker.totalSupply()).to.equal(1261000000);

    await staker.unstake(776000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(574586247);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.connect(deployerWallet).stake(500000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1073086247);
    expect(await staker.totalSupply()).to.equal(970000000);

    await staker.unstake(485000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(589954947);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.connect(signer1).stake(200000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(789354947);
    expect(await staker.totalSupply()).to.equal(679000000);

    await staker.connect(deployerWallet).unstake(485000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(283159076);
    expect(await staker.totalSupply()).to.equal(194000000);

    await expect(
      staker.connect(signer1).unstake(2000000000)
    ).to.be.revertedWith("Insufficient staked VLR");
    await staker.connect(signer1).unstake(194000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(0);
    expect(await staker.totalSupply()).to.equal(0);
  });
  it("stakes vlr and calculates stats about the stakes", async function () {
    await mockEvlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer3)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer4)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer5)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer6)
      .approve(staker.address, toBigNumber("100000000000000000"));

    await staker.stakeWithTimeParameters(1633127258, 0, 500000000);
    await staker
      .connect(signer1)
      .stakeWithTimeParameters(1633213658, 0, 800000000);
    await expect(
      staker
        .connect(signer2)
        .stakeWithTimeParameters(1633300058, 0, 1000000000001)
    ).to.be.revertedWith("Insufficient enterprise token balance");
    await staker
      .connect(signer2)
      .stakeWithTimeParameters(1633300058, 0, 750000000);
    await staker
      .connect(signer3)
      .stakeWithTimeParameters(1633472858, 1634768858, 1200000000);
    await staker
      .connect(signer4)
      .stakeWithTimeParameters(1633904858, 0, 500000000);
    await staker
      .connect(signer5)
      .stakeWithTimeParameters(1633991258, 1634336858, 780000000);
    await staker
      .connect(signer6)
      .stakeWithTimeParameters(1634164058, 1634239658, 800000000);
    expect(await staker.getStakeValue(0, 1635742800)).to.be.equal(14550000000);
    expect(await staker.getStakeValue(1, 1635742800)).to.be.equal(22504000000);
    expect(await staker.getStakeValue(2, 1635742800)).to.be.equal(20370000000);
    expect(await staker.getStakeValue(3, 1635742800)).to.be.equal(17460000000);
    expect(await staker.getStakeValue(4, 1635742800)).to.be.equal(10185000000);
    expect(await staker.getStakeValue(5, 1635742800)).to.be.equal(3026400000);
    expect(await staker.getStakeValue(6, 1635742800)).to.be.equal(0);
    expect(await staker.getTotalStakedValue(1635742800)).to.equal(88095400000);
  });

  it("distributes rewards to stakers", async function () {
    await mockEvlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer3)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer4)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer5)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockEvlr
      .connect(signer6)
      .approve(staker.address, toBigNumber("100000000000000000"));

    await staker.stakeWithTimeParameters(1633127258, 0, 500000000);
    expect(await staker.totalSupply()).to.equal(485000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(498500000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(14550000000);
    await staker
      .connect(signer1)
      .stakeWithTimeParameters(1633213658, 0, 800000000);
    expect(await staker.totalSupply()).to.equal(1261000000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(1296100000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(37054000000);
    await staker
      .connect(signer2)
      .stakeWithTimeParameters(1633300058, 0, 750000000);
    expect(await staker.totalSupply()).to.equal(1988500000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(2043850000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(57424000000);
    await staker
      .connect(signer3)
      .stakeWithTimeParameters(1633472858, 0, 1200000000);
    expect(await staker.totalSupply()).to.equal(3152500000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(3240250000);
    await staker
      .connect(signer4)
      .stakeWithTimeParameters(1633904858, 0, 500000000);
    expect(await staker.totalSupply()).to.equal(3637500000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(3738750000);
    await staker
      .connect(signer5)
      .stakeWithTimeParameters(1633991258, 0, 780000000);
    expect(await staker.totalSupply()).to.equal(4394100000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(4516410000);
    await staker
      .connect(signer6)
      .stakeWithTimeParameters(1634164058, 0, 800000000);
    expect(await staker.totalSupply()).to.equal(5170100000);
    expect(await mockEvlr.balanceOf(staker.address)).to.equal(5314010000);

    await expect(
      staker.connect(signer1).distributeRewards(1000000000)
    ).to.be.revertedWith(
      "Only designated distributor can make reward distributions"
    );

    const timeNow = Math.floor(Date.now() / 1000);

    const initialWalletBalance = 1000000000000;
    const deployerStakeValue = toDecimal(
      await staker.getStakeValue(0, timeNow)
    );
    const signer1Stake = 800000000;
    const signer1StakeValue = toDecimal(await staker.getStakeValue(1, timeNow));
    const signer1Bag = await staker.getStake(1);
    const signer1TimeDiff = timeNow - Number(signer1Bag.startTime);
    expect(signer1StakeValue).to.equal(
      toDecimal(Math.floor(signer1TimeDiff / 86400) * signer1Bag.stakedTokens)
    );

    const signer2Stake = 750000000;
    const signer2Bag = await staker.getStake(2);
    const signer2TimeDiff = timeNow - Number(signer2Bag.startTime);
    const signer2StakeValue = toDecimal(await staker.getStakeValue(2, timeNow));
    expect(signer2StakeValue).to.equal(
      toDecimal(Math.floor(signer2TimeDiff / 86400) * signer2Bag.stakedTokens)
    );

    const signer3Stake = 1200000000;
    const signer3Bag = await staker.getStake(3);
    const signer3TimeDiff = timeNow - Number(signer3Bag.startTime);
    const signer3StakeValue = toDecimal(await staker.getStakeValue(3, timeNow));
    expect(signer3StakeValue).to.equal(
      toDecimal(Math.floor(signer3TimeDiff / 86400) * signer3Bag.stakedTokens)
    );

    const signer4Stake = 500000000;
    const signer4Bag = await staker.getStake(4);
    const signer4TimeDiff = timeNow - Number(signer4Bag.startTime);
    const signer4StakeValue = toDecimal(await staker.getStakeValue(4, timeNow));
    expect(signer4StakeValue).to.equal(
      toDecimal(Math.floor(signer4TimeDiff / 86400) * signer4Bag.stakedTokens)
    );

    const signer5Stake = 780000000;
    const signer5Bag = await staker.getStake(5);
    const signer5TimeDiff = timeNow - Number(signer5Bag.startTime);
    const signer5StakeValue = toDecimal(await staker.getStakeValue(5, timeNow));
    expect(signer5StakeValue).to.equal(
      toDecimal(Math.floor(signer5TimeDiff / 86400) * signer5Bag.stakedTokens)
    );

    const signer6Stake = 800000000;
    const signer6Bag = await staker.getStake(6);
    const signer6TimeDiff = timeNow - Number(signer6Bag.startTime);
    const signer6StakeValue = toDecimal(await staker.getStakeValue(6, timeNow));
    expect(signer6StakeValue).to.equal(
      toDecimal(Math.floor(signer6TimeDiff / 86400) * signer6Bag.stakedTokens)
    );

    const totalStaked =
      deployerStakeValue +
      signer1StakeValue +
      signer2StakeValue +
      signer3StakeValue +
      signer4StakeValue +
      signer5StakeValue +
      signer6StakeValue;
    const rewardsToDistribute = 1000000000;

    const rewards1 = Math.floor(
      (signer1StakeValue * rewardsToDistribute) / totalStaked
    );
    // expect(rewards1).to.equal(164410058);

    const rewards2 = Math.floor(
      (signer2StakeValue * rewardsToDistribute) / totalStaked
    );
    // expect(rewards2).to.equal(151112185);

    const rewards3 = Math.floor(
      (signer3StakeValue * rewardsToDistribute) / totalStaked
    );
    // expect(rewards3).to.equal(232108317)
    const rewards4 = Math.floor(
      (signer4StakeValue * rewardsToDistribute) / totalStaked
    );
    // expect(rewards4).to.equal(86637653)
    const rewards5 = Math.floor(
      (signer5StakeValue * rewardsToDistribute) / totalStaked
      );
    //   expect(rewards5).to.equal(132011605)
      const rewards6 = Math.floor(
        (signer6StakeValue * rewardsToDistribute) / totalStaked
        );
    //     expect(rewards6).to.equal(128949065)

    await staker.distributeRewards(rewardsToDistribute);

    expect(await mockEvlr.balanceOf(signer1.address)).to.equal(
      initialWalletBalance - signer1Stake + rewards1
    );
    expect(await mockEvlr.balanceOf(signer2.address)).to.equal(
      initialWalletBalance - signer2Stake + rewards2
    );
    expect(await mockEvlr.balanceOf(signer3.address)).to.equal(
      initialWalletBalance - signer3Stake + rewards3
    );
    expect(await mockEvlr.balanceOf(signer4.address)).to.equal(
      initialWalletBalance - signer4Stake + rewards4
    );
    expect(await mockEvlr.balanceOf(signer5.address)).to.equal(
      initialWalletBalance - signer5Stake + rewards5
    );
    expect(await mockEvlr.balanceOf(signer6.address)).to.equal(
      initialWalletBalance - signer6Stake + rewards6
    );
  });
  it("stakes and calculates staking value for individual owner", async function(){
    await mockEvlr
    .connect(signer1)
    .approve(staker.address, toBigNumber("100000000000000000"));
    const timeNow = Math.floor(Date.now()/1000);
    const timeDiff = Math.floor((timeNow - 1633213658)/86400);

    await staker.connect(signer1).stakeWithTimeParameters(1633213658, 0, 800000000)
    const FirstEvlrBalanceSigner1 = await staker.balanceOf(signer1.address);
    const firstBagValue = timeDiff*FirstEvlrBalanceSigner1;
    expect(await staker.getOwnerStakingValue(signer1.address)).to.equal(firstBagValue)
    await staker.connect(signer1).stakeWithTimeParameters(1633300058, 0, 750000000)
    const SecondEvlrBalanceSigner1 = await staker.balanceOf(signer1.address);
    const secondBagValue = Math.floor((timeNow-1633300058)/86400)*Number(SecondEvlrBalanceSigner1-FirstEvlrBalanceSigner1)
    expect(await staker.getOwnerStakingValue(signer1.address)).to.equal(firstBagValue+secondBagValue)
  })
});
