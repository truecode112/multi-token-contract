var fs = require('fs')
const BN = require('bignumber.js')

const { syncDeployInfo, deployContract, deployContractAndProxy } = require('./deploy')
const { addressZero, bytes32Zero, maxUint256,
  WBNB, PancakeRouter, PancakeFactory, 
  Diamond, DiamondCutAndLoupeFacet, LibDiamond, MethodsExposureFacet, HamachiFacet, WithOwnership, WithReward } = require('./const')

const deploy_localhost = async (web3, deployer, accounts, specialAccounts) => {
    let network = 'localhost'
    const { owner, proxyAdmin, pancakeFeeSetter } = specialAccounts

    let totalRet = []
    try {
      let readInfo = fs.readFileSync(`migrations/deploy-${network}.json`);
      totalRet = JSON.parse(readInfo);
    } catch(err) {
      console.log(`${err.message}`);
    }
    // console.log(totalRet);

    let wbnbInfo = totalRet.find(t => t.name === "WBNB")
    let factoryInfo = totalRet.find(t => t.name === "PancakeFactory")
    let routerInfo = totalRet.find(t => t.name === "PancakeRouter")

    let diamondInfo = totalRet.find(t => t.name === "Diamond")
    let diamondCutAndLoupeFacetInfo = totalRet.find(t => t.name === "DiamondCutAndLoupeFacet")
    let methodsExposureFacetInfo = totalRet.find(t => t.name === "MethodsExposureFacet")

    let hamachiFacetInfo = totalRet.find(t => t.name === "HamachiFacet")
    let withOwnershipInfo = totalRet.find(t => t.name === "WithOwnership")
    let withRewardInfo = totalRet.find(t => t.name === "WithReward")

    // wbnbInfo = await deployContract(deployer, "WBNB", WBNB)
    // totalRet = syncDeployInfo(network, "WBNB", wbnbInfo, totalRet)

    // factoryInfo = await deployContract(deployer, "PancakeFactory", PancakeFactory, pancakeFeeSetter)
    // totalRet = syncDeployInfo(network, "PancakeFactory", factoryInfo, totalRet)

    // routerInfo = await deployContract(deployer, "PancakeRouter", PancakeRouter, factoryInfo.imple, wbnbInfo.imple)
    // totalRet = syncDeployInfo(network, "PancakeRouter", routerInfo, totalRet)

    // let routerContract = await PancakeRouter.at(routerInfo.imple)
    // let factoryContract = await PancakeFactory.at(factoryInfo.imple)

    // let wethAddr = await routerContract.WETH()
    // console.log('WETH:', wethAddr)

    // console.log("Pancake Factory Pair HASH:", await factoryContract.INIT_CODE_PAIR_HASH())

    // diamondCutAndLoupeFacetInfo = await deployContract(deployer, "DiamondCutAndLoupeFacet", DiamondCutAndLoupeFacet)
    // totalRet = syncDeployInfo(network, "DiamondCutAndLoupeFacet", diamondCutAndLoupeFacetInfo, totalRet)

    // methodsExposureFacetInfo = await deployContract(deployer, "MethodsExposureFacet", MethodsExposureFacet)
    // totalRet = syncDeployInfo(network, "MethodsExposureFacet", methodsExposureFacetInfo, totalRet)

    // hamachiFacetInfo = await deployContract(deployer, "HamachiFacet", HamachiFacet)
    // totalRet = syncDeployInfo(network, "HamachiFacet", hamachiFacetInfo, totalRet);

    // withOwnershipInfo = await deployContract(deployer, "WithOwnership", WithOwnership)
    // totalRet = syncDeployInfo(network, "WithOwnership", withOwnershipInfo, totalRet);

    // withRewardInfo = await deployContract(deployer, "WithReward", WithReward)
    // totalRet = syncDeployInfo(network, "WithReward", withRewardInfo, totalRet);

    // diamondInfo = await deployContract(deployer, "Diamond", Diamond, accounts[0], routerInfo.imple, wethAddr, diamondCutAndLoupeFacetInfo.imple, methodsExposureFacetInfo.imple, withRewardInfo.imple)
    // totalRet = syncDeployInfo(network, "Diamond", diamondInfo, totalRet)

    const diamondContract = await Diamond.at(diamondInfo.imple)
    const selector0 = web3.utils.keccak256('setIsLpPool(address,bool)').slice(0, 10)

    const hamachiFacetContract = await HamachiFacet.at(hamachiFacetInfo.imple)

    // console.log(selector0, typeof selector0)
    
    const sig_array = ['0xa217fddf', '0x27ce0147', '0xdd62ed3e', '0x095ea7b3', '0x70a08231', '0xe4748b9e',
    '0x0e6878a3', '0x313ce567', '0xa457c2d7', '0x52df107f', '0x91b89fba', '0x437823ec',
    '0x5b700d91', '0x52390c02', '0xe7841ec0', '0xb759ad6b', '0x6e6db72d', '0x41b49365',
    '0x69940d79', '0x248a9ca3', '0x2f2ff15d', '0x91d14854', '0x39509351', '0x8129fc1c',
    '0x5342acb4', '0x0e832273', '0xe1ab04c9', '0x6f741f2a', '0xa1bc910f', '0xd4698016',
    '0x7a8baf52', '0x06fdde03', '0x01a6c43b', '0x8da5cb5b', '0x36568abe', '0xd547741f',
    '0xe964b644', '0xe0f3ccf5', '0xd8fdbbd7', '0xc19010a7', '0x00539af0', '0xd784d426',
    '0xe55096b0', '0x296f0a0c', '0xc01d0d05', '0xbd823943', '0x4e97a230', '0x0f569dad',
    '0x09baae21', '0xfd622c08', '0xa46043f1', '0x2171dcc9', '0x95d89b41', '0xb9e93700',
    '0x8a8a759e', '0xd0a39814', '0x18160ddd', '0xa9059cbb', '0x23b872dd', '0xf2fde38b',
    '0xe32fb4c0', '0xf3f18947', '0xa8b9d240', '0xaafd847a', '0x8129fc1c', '0x4ce88b4b',
    '0x8f899399', '0x17446133', '0xba69ebed', '0x9e998faa', '0x74991569', '0xa17826eb',
    '0x5183d6fd', '0x1bf494a7', '0xd684d656', '0x372500ab', '0x0ffa6d98', '0x2e1a7d4d',
    '0x5ceb78ad', '0x3de4c746'];

      sig_array.forEach((sig) => {
        const jsonobj = hamachiFacetContract.contract._jsonInterface.find(c => c.signature === sig);
        if (jsonobj == undefined) {
          console.log(sig, 'no sig');
        } else {
          console.log(sig, jsonobj);
        }
        
      });

    
    // console.log(selector0, sig)
    //let tx = await diamondContract.diamondCut([hamachiFacetInfo.imple, 0, []], )
}

module.exports = { deploy_localhost }
