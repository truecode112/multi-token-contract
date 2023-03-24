var fs = require('fs')
const BN = require('bignumber.js')

const {
  syncDeployInfo,
  deployContract,
  deployContractAndProxy
} = require('./deploy')
const {
  addressZero,
  bytes32Zero,
  maxUint256,
  WBNB,
  PancakeRouter,
  PancakeFactory,
  Diamond,
  DiamondCutAndLoupeFacet,
  LibDiamond,
  MethodsExposureFacet
} = require('./const')

const deploy_bsctestnet = async (web3, deployer, accounts, specialAccounts) => {
  let network = 'bsctestnet'
  const { owner, proxyAdmin, fee1, fee2 } = specialAccounts

  let totalRet = []
  try {
    let readInfo = fs.readFileSync(`migrations/deploy-${network}.json`)
    totalRet = JSON.parse(readInfo)
  } catch (err) {
    console.log(`${err.message}`)
  }
  // console.log(totalRet);

  let wbnbInfo = totalRet.find(t => t.name === 'WBNB')
  let factoryInfo = totalRet.find(t => t.name === 'PancakeFactory')
  let routerInfo = totalRet.find(t => t.name === 'PancakeRouter')

  let diamondInfo = totalRet.find(t => t.name === 'Diamond')
  let diamondCutAndLoupeFacetInfo = totalRet.find(
    t => t.name === 'DiamondCutAndLoupeFacet'
  )
  let methodsExposureFacetInfo = totalRet.find(
    t => t.name === 'MethodsExposureFacet'
  )

  wbnbInfo = {
    name: 'WBNB',
    imple: '0xae13d989dac2f0debff460ac112a837c89baa7cd'
  }
  totalRet = syncDeployInfo(network, 'WBNB', wbnbInfo, totalRet)

  factoryInfo = {
    name: 'PancakeFactory',
    imple: '0x41939fe2547f3140b90e056fb42af81d423435ad'
  }
  totalRet = syncDeployInfo(network, 'PancakeFactory', factoryInfo, totalRet)

  routerInfo = {
    name: 'PancakeRouter',
    imple: '0x1Ed675D5e63314B760162A3D1Cae1803DCFC87C7'
  }
  totalRet = syncDeployInfo(network, 'PancakeRouter', routerInfo, totalRet)

  let routerContract = await PancakeRouter.at(routerInfo.imple)
  let factoryContract = await PancakeFactory.at(factoryInfo.imple)

  let wethAddr = await routerContract.WETH()
  console.log('WETH:', wethAddr)

  console.log(
    'Pancake Factory Pair HASH:',
    await factoryContract.INIT_CODE_PAIR_HASH()
  )

  // diamondCutAndLoupeFacetInfo = await deployContract(
  //   deployer,
  //   'DiamondCutAndLoupeFacet',
  //   DiamondCutAndLoupeFacet
  // )
  // totalRet = syncDeployInfo(
  //   network,
  //   'DiamondCutAndLoupeFacet',
  //   diamondCutAndLoupeFacetInfo,
  //   totalRet
  // )

  // methodsExposureFacetInfo = await deployContract(
  //   deployer,
  //   'MethodsExposureFacet',
  //   MethodsExposureFacet
  // )
  // totalRet = syncDeployInfo(
  //   network,
  //   'MethodsExposureFacet',
  //   methodsExposureFacetInfo,
  //   totalRet
  // )

  // wbnbInfo = await deployContract(
  //   deployer,
  //   'Diamond',
  //   Diamond,
  //   accounts[0],
  //   routerInfo.imple,
  //   wethAddr,
  //   diamondCutAndLoupeFacetInfo.imple,
  //   methodsExposureFacetInfo.imple
  // )
  // totalRet = syncDeployInfo(network, 'Diamond', wbnbInfo, totalRet)
}

module.exports = { deploy_bsctestnet }
