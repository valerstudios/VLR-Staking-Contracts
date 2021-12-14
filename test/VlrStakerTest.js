const { BigNumber } = require("@ethersproject/bignumber");
const { expect } = require("chai");
const { deployments, ethers } = require("hardhat");
const { toBigNumber, toDecimal } = require("./utilities/index.js");

describe("VLR Staking Pool Tests", function () {
  let mockVlr;
  let mockMtc;
  let eVlr;
  let eVlr2;
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
    // console.log("Contract owner address is ", deployerWallet.address)
    // console.log("Secondary Address is ", signer1.address)
    // console.log("Third Address is ", signer2.address)
    // console.log(deadSigner.address)
    const MockMTC = await ethers.getContractFactory("MockMTC");
    mockMtc = await MockMTC.deploy(toBigNumber("1000000000000000"));
    const MockVLR = await ethers.getContractFactory("VlrContract");
    mockVlr = await MockVLR.deploy(toBigNumber("1000000000000000"));
    await mockVlr.deployed();
    await mockVlr.transfer(signer1.address, 1000000000000);
    await mockVlr.transfer(signer2.address, 1000000000000);
    await mockVlr.transfer(signer3.address, 1000000000000);
    await mockVlr.transfer(signer4.address, 1000000000000);
    await mockVlr.transfer(signer5.address, 1000000000000);
    await mockVlr.transfer(signer6.address, 1000000000000);
    const mockVlrAddress = mockVlr.address;
    // console.log("Mock VLR Token Contract found at: ", mockVlrAddress)
  
    const EVLR = await ethers.getContractFactory("MockEVLR1");
    eVlr = await EVLR.deploy(toBigNumber("1000000000000000"));
    await eVlr.deployed();

    const EVLR2 = await ethers.getContractFactory("MockEVLR2");
    eVlr2 = await EVLR2.deploy(toBigNumber("1000000000000000"));
    await eVlr2.deployed();
    const Staker = await ethers.getContractFactory("VlrStaker");
    staker = await Staker.deploy(
      mockVlrAddress,
      charityBag.address,
      mockMtc.address,
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
      "0x2ff9244010672B7410349fDAed6368a622279416",
      deployerWallet.address
    );
    await staker.deployed();
    // console.log("Staking Contract deployed at address: ", staker.address)
    // console.log("deployer balance ", Number(await mockVlr.balanceOf(deployerWallet.address)))
    // console.log("signer1 balance ", Number(await mockVlr.balanceOf(signer1.address)))
    // console.log("signer2 balance ", Number(await mockVlr.balanceOf(signer2.address)))
  });

  it("Introduces the tests", async function () {
    console.log("******Testing with the following Contracts:");
    console.log("Enterprise Token Address: ", eVlr.address);
    console.log("Mock VLR Token Address: ", mockVlr.address);
    console.log("VLR Staking Pool Contract Address: ", staker.address);
  });

  it("confirms that the charity bag is connected and properly distributing funds", async function () {
    expect(await staker.getCharityAddress()).to.equal(charityBag.address);
    await mockVlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await staker.stake(500000000);
    expect(await mockVlr.balanceOf(charityBag.address)).to.equal(
      500000000 * (21 / 10000)
    );
  });
  it("accepts staking, transfers vlr into contract, and mints svlr for msg.sender", async function () {
    await expect(staker.stake(5.55555e11)).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance"
    );
    await mockVlr.approve(staker.address, toBigNumber("100000000000000000"));
    expect(await staker.totalSupply()).to.equal(0);

    await staker.stake(5.5555e10);
    //fees paid are 0.6%, whereas 2.4% of fees remain in the contract as staking fees
    let feesPaid = 5.5555e10 * 0.006;
    expect(await mockVlr.balanceOf(deployerWallet.address)).to.equal(
      toBigNumber("999999994000000" - "55555")
    );
    expect(await mockVlr.balanceOf(staker.address)).to.equal(
      "55555000000" - feesPaid
    );

    const stakedVLR = 55555000000 * 0.97;
    expect(await staker.balanceOf(deployerWallet.address)).to.equal(stakedVLR);
    let rewardsAdded = 55555000000 * 0.024;
    expect(await staker.getStakingRewardsBag()).to.equal(rewardsAdded);
    expect((await staker.getStake(0)).ownerAddress).to.equal(
      deployerWallet.address
    );

    await mockVlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await staker.connect(signer1).stake(55555000000);
    expect(await staker.balanceOf(signer1.address)).to.equal(stakedVLR);
    expect(await staker.totalSupply()).to.equal(2 * stakedVLR);
    expect(await staker.getStakingRewardsBag()).to.equal(rewardsAdded * 2);
    expect((await staker.getStake(1)).ownerAddress).to.equal(signer1.address);
  });
  it("unstakes, transfers VLR to user with rewards, and burns svlr", async function () {
    await mockVlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));

    await staker.stake(1100000000);

    expect(await mockVlr.balanceOf(staker.address)).to.equal(1093400000);
    expect(await staker.totalSupply()).to.equal(1067000000);
    expect(await mockVlr);

    await staker.unstake(97000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(998652878);
    expect(await staker.totalSupply()).to.equal(970000000);

    await staker.connect(signer2).stake(300000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(1296852878);
    expect(await staker.totalSupply()).to.equal(1261000000);

    await staker.connect(deployerWallet).unstake(194000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(1107280928);
    expect(await staker.totalSupply()).to.equal(1067000000);

    await staker.connect(deployerWallet).unstake(291000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(822524868);
    expect(await staker.totalSupply()).to.equal(776000000);

    await staker.connect(signer2).unstake(291000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(536515030);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.stake(800000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(1331715030);
    expect(await staker.totalSupply()).to.equal(1261000000);

    await staker.unstake(776000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(565787167);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.connect(deployerWallet).stake(500000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(1062787167);
    expect(await staker.totalSupply()).to.equal(970000000);

    await staker.unstake(485000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(580176633);
    expect(await staker.totalSupply()).to.equal(485000000);

    await staker.connect(signer1).stake(200000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(778976633);
    expect(await staker.totalSupply()).to.equal(679000000);

    await staker.connect(deployerWallet).unstake(485000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(276499219);
    expect(await staker.totalSupply()).to.equal(194000000);

    await expect(
      staker.connect(signer1).unstake(2000000000)
    ).to.be.revertedWith("Insufficient staked VLR");
    await staker.connect(signer1).unstake(194000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(0);
    expect(await staker.totalSupply()).to.equal(0);
  });
  it("stakes vlr and calculates stats about the stakes", async function () {
    await mockVlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer3)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer4)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer5)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
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
    await mockVlr.approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer1)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer2)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer3)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer4)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer5)
      .approve(staker.address, toBigNumber("100000000000000000"));
    await mockVlr
      .connect(signer6)
      .approve(staker.address, toBigNumber("100000000000000000"));

    await staker.stakeWithTimeParameters(1633127258, 0, 500000000);
    expect(await staker.totalSupply()).to.equal(485000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(497000000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(14550000000);
    await staker
      .connect(signer1)
      .stakeWithTimeParameters(1633213658, 0, 800000000);
    expect(await staker.totalSupply()).to.equal(1261000000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(1292200000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(37054000000);
    await staker
      .connect(signer2)
      .stakeWithTimeParameters(1633300058, 0, 750000000);
    expect(await staker.totalSupply()).to.equal(1988500000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(2037700000);
    expect(await staker.getTotalStakedValue(1635728400)).to.equal(57424000000);
    await staker
      .connect(signer3)
      .stakeWithTimeParameters(1633472858, 0, 1200000000);
    expect(await staker.totalSupply()).to.equal(3152500000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(3230500000);
    await staker
      .connect(signer4)
      .stakeWithTimeParameters(1633904858, 0, 500000000);
    expect(await staker.totalSupply()).to.equal(3637500000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(3727500000);
    await staker
      .connect(signer5)
      .stakeWithTimeParameters(1633991258, 0, 780000000);
    expect(await staker.totalSupply()).to.equal(4394100000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(4502820000);
    await staker
      .connect(signer6)
      .stakeWithTimeParameters(1634164058, 0, 800000000);
    expect(await staker.totalSupply()).to.equal(5170100000);
    expect(await mockVlr.balanceOf(staker.address)).to.equal(5298020000);
    
    await eVlr2.approve(staker.address, toBigNumber("100000000000"))
    await eVlr.approve(staker.address, toBigNumber("100000000000"));

    const rewardsAddresses = [eVlr.address, eVlr2.address];
    const rewardAmounts = [1000000000, 1000000000];

    await expect(
      staker.connect(signer1).distributeRewards(rewardsAddresses, rewardAmounts)
    ).to.be.revertedWith(
      "Only designated distributor can make reward distributions"
    );
    await staker.distributeRewards(rewardsAddresses, rewardAmounts);

    expect(await eVlr.balanceOf(signer1.address)).to.equal(164410058);
    expect(await eVlr.balanceOf(signer2.address)).to.equal(151112185);
    expect(await eVlr.balanceOf(signer3.address)).to.equal(232108317);
    expect(await eVlr.balanceOf(signer4.address)).to.equal(86637653);
    expect(await eVlr.balanceOf(signer5.address)).to.equal(132011605);
    expect(await eVlr.balanceOf(signer6.address)).to.equal(128949065);

    expect(await eVlr2.balanceOf(signer1.address)).to.equal(164410058);
    expect(await eVlr2.balanceOf(signer2.address)).to.equal(151112185);
    expect(await eVlr2.balanceOf(signer3.address)).to.equal(232108317);
    expect(await eVlr2.balanceOf(signer4.address)).to.equal(86637653);
    expect(await eVlr2.balanceOf(signer5.address)).to.equal(132011605);
    expect(await eVlr2.balanceOf(signer6.address)).to.equal(128949065);
  });

});
