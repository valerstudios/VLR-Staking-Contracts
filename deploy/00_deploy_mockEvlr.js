module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId,
    getUnnamedAccounts,
  }) => {
    const {deploy} = deployments;
    const {deployer, tokenOwner} = await getNamedAccounts();

    console.log("deploying Mock EVLR Token with address: ", deployer)
    await deploy('MockEVLR1', {
      from: deployer,
      args: [1000000000],
      log: true,
    });
  };

  module.exports.tags = ['EVLR'];