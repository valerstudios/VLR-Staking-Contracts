module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId,
    getUnnamedAccounts,
  }) => {
    const {deploy} = deployments;
    const {deployer, tokenOwner, charityBag} = await getNamedAccounts();
    const EVLR = await deployments.get('MockEVLR1');
    const evlrAddress = EVLR.address

    await deploy('EvlrStaker', {
      from: deployer,
      args: ["Staked EVLR1 Token", "SEVLR", evlrAddress, charityBag, deployer, 270, 21, 9],
      log: true,
    });
  };

  module.exports.tags = ['ESTAKER'];