var fs = require('fs')
const BN = require('bignumber.js')

const { syncDeployInfo, deployContract } = require('./deploy')
const {
  WBNB,
  PancakeRouter,
  Diamond,
  DiamondCutAndLoupeFacet,
  MethodsExposureFacet,
  HamachiFacet,
  Lotto,
  PancakeFactory,
} = require('./const')

const _liquidityIncentiveWallet = '0x93BBA8c55865466699Ed5233BeD51cf478d49850'
const _marketingWallet = '0xAfF9b3461558Ea5d022927ECBE8D70f36e842e10'
const _jackpotWallet = '0x369875e02C06F4BE81e2afA9a2F0112e5649D98d'
const _devWalletOne = '0x93BBA8c55865466699Ed5233BeD51cf478d49850'

const FacetCutAction = new Map([
  ['Add', 0],
  ['Replace', 1],
  ['Remove', 2]
])

function getSelectors (contract) {
  const selectors = contract.abi.reduce((acc, val) => {
    if (val.type === 'function') {
      acc.push(val.signature)
      return acc
    } else {
      return acc
    }
  }, [])
  return selectors
}

const deploy_zksync_mainnet = async (web3, deployer, accounts, specialAccounts) => {
  let network = 'zkSync Era Mainnet'
  const { pancakeFeeSetter } = specialAccounts

  let totalRet = []
  try {
    let readInfo = fs.readFileSync(`migrations/deploy-${network.replace(' ', '_')}.json`)
    totalRet = JSON.parse(readInfo)
  } catch (err) {
    console.log(`${err.message}`)
  }

  let wethInfo = totalRet.find(t => t.name === 'WETH')
  let factoryInfo = totalRet.find(t => t.name === 'PancakeFactory')
  let routerInfo = totalRet.find(t => t.name === 'PancakeRouter')

  let diamondInfo = totalRet.find(t => t.name === 'Diamond')
  let diamondCutAndLoupeFacetInfo = totalRet.find(
    t => t.name === 'DiamondCutAndLoupeFacet'
  )
  let methodsExposureFacetInfo = totalRet.find(
    t => t.name === 'MethodsExposureFacet'
  )
  let hamachiFacetInfo = totalRet.find(t => t.name === 'HamachiFacet')
  let lottoInfo = totalRet.find(t => t.name === 'Lotto')

  wethInfo = {
    name: 'WETH',
    imple: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91'
  }
  totalRet = syncDeployInfo(network, 'WBNB', wethInfo, totalRet)

  factoryInfo = {
    name: 'PancakeFactory',
    imple: '0x40be1cBa6C5B47cDF9da7f963B6F761F4C60627D'
  }
  totalRet = syncDeployInfo(network, 'PancakeFactory', factoryInfo, totalRet)

  routerInfo = {
    name: 'PancakeRouter',
    imple: '0x8B791913eB07C32779a16750e3868aA8495F5964'
  }
  totalRet = syncDeployInfo(network, 'PancakeRouter', routerInfo, totalRet)

  let routerContract = await PancakeRouter.at(routerInfo.imple)
  let factoryContract = await PancakeFactory.at(factoryInfo.imple)

  let wethAddr = wethInfo.imple;

  diamondCutAndLoupeFacetInfo = await deployContract( deployer,'DiamondCutAndLoupeFacet', DiamondCutAndLoupeFacet )
  totalRet = syncDeployInfo( network, 'DiamondCutAndLoupeFacet', diamondCutAndLoupeFacetInfo, totalRet )

  methodsExposureFacetInfo = await deployContract( deployer, 'MethodsExposureFacet',MethodsExposureFacet )
  totalRet = syncDeployInfo( network, 'MethodsExposureFacet', methodsExposureFacetInfo, totalRet )

  hamachiFacetInfo = await deployContract( deployer, 'HamachiFacet', HamachiFacet )
  totalRet = syncDeployInfo(network, 'HamachiFacet', hamachiFacetInfo, totalRet)

  let hamachiContract = await HamachiFacet.at(hamachiFacetInfo.imple)

  diamondInfo = await deployContract( deployer, 'Diamond', Diamond, accounts[0], routerInfo.imple, wethAddr, diamondCutAndLoupeFacetInfo.imple, methodsExposureFacetInfo.imple )
  totalRet = syncDeployInfo(network, 'Diamond', diamondInfo, totalRet)
  
  lottoInfo = await deployContract( deployer, 'Lotto', Lotto, _liquidityIncentiveWallet, _marketingWallet, _jackpotWallet, _devWalletOne, factoryInfo.imple, routerInfo.imple, wethAddr)
  totalRet = syncDeployInfo(network, 'Lotto', lottoInfo, totalRet)
  let lottoContract = await Lotto.at(lottoInfo.imple)

  let sigInfo = {}
  hamachiContract.contract._jsonInterface.map(t => {
    sigInfo[t.name] = t.signature
  })

  const selectors = [
    sigInfo.DEFAULT_ADMIN_ROLE, //0xa217fddf
    sigInfo.accumulativeDividendOf, //0x27ce0147
    sigInfo.allowance, //0xdd62ed3e
    sigInfo.approve, //0x095ea7b3
    sigInfo.balanceOf, //0x70a08231
    sigInfo.buyFees, //0xe4748b9e

    sigInfo.decimals, //0x313ce567
    sigInfo.decreaseAllowance, //0xa457c2d7
    sigInfo.defaultRouter, //0x52df107f
    sigInfo.dividendOf, //0x91b89fba
    sigInfo.excludeFromFee, //0x437823ec
    sigInfo.excludeFromMaxWallet, //0x5b700d91
    sigInfo.excludeFromReward, //0x52390c02
    sigInfo.getLastProcessedIndex, //0xe7841ec0
    sigInfo.getRewardAccount, //0xb759ad6b
    sigInfo.getRewardAccountAtIndex, //0x6e6db72d
    sigInfo.getRewardHolders, //0x41b49365
    sigInfo.getRewardToken, //0x69940d79
    sigInfo.getRoleAdmin, //0x248a9ca3
    sigInfo.grantRole, //0x2f2ff15d
    sigInfo.hasRole, //0x91d14854
    sigInfo.increaseAllowance, //0x39509351
    sigInfo.initialize, //0x8129fc1c
    sigInfo.isExcludedFromFee, //0x5342acb4
    sigInfo.isExcludedFromRewards, //0x0e832273
    sigInfo.isExcludedMaxWallet, //0xe1ab04c9
    sigInfo.isLpPool, //0x6f741f2a
    sigInfo.isSwapRouter, //0xa1bc910f
    sigInfo.liquidityWallet, //0xd4698016
    sigInfo.maxTokenPerWallet, //0x7a8baf52
    sigInfo.name, //0x06fdde03
    sigInfo.numTokensToSwap, //0x01a6c43b
    sigInfo.owner, //0x8da5cb5b
    sigInfo.renounceRole, //0x36568abe
    sigInfo.revokeRole, //0xd547741f
    sigInfo.rewardBalanceOf, //0xe964b644
    sigInfo.sellFees, //0xe0f3ccf5
    sigInfo.setBuyFee, //0xd8fdbbd7
    sigInfo.setDefaultAdminRole, //0xc19010a7
    sigInfo.setDefaultRouter, //0x00539af0
    sigInfo.setImplementation, //0xd784d426
    sigInfo.setIsLpPool, //0xe55096b0
    sigInfo.setLiquidityWallet, //0x296f0a0c
    sigInfo.setManualClaim, //0xc01d0d05
    sigInfo.setMaxTokenPerWallet, //0xbd823943
    sigInfo.setMinBalanceForReward, //0x4e97a230
    sigInfo.setNumTokensToSwap, //0x0f569dad
    sigInfo.setProcessingGas, //0x09baae21

    sigInfo.setSellFee, //0xa46043f1
    sigInfo.setSwapRouter, //0x2171dcc9
    sigInfo.symbol, //0x95d89b41
    sigInfo.totalBuyFees, //0xb9e93700
    sigInfo.totalRewardSupply, //0x8a8a759e
    sigInfo.totalSellFees, //0xd0a39814
    sigInfo.totalSupply, //0x18160ddd
    sigInfo.transfer, //0xa9059cbb
    sigInfo.transferFrom, //0x23b872dd
    sigInfo.transferOwnership, //0xf2fde38b
    sigInfo.updateClaimTimeout, //0xe32fb4c0
    sigInfo.withdrawableDividendOf, //0xa8b9d240
    sigInfo.withdrawnDividendOf, //0xaafd847a
    sigInfo.isProcessingRewards, //0x4ce88b4b
    sigInfo.setProcessRewards, //0x8f899399
    sigInfo.hasProcessFeeRole, //0x17446133
    sigInfo.processFees, //0xba69ebed
    sigInfo.setProcessFeeRole, //0x9e998faa
    sigInfo.setVestingContract, //0x74991569
    sigInfo.updateRewardBalance, //0xa17826eb

    sigInfo.getRewardPerShare, //0x1bf494a7
    sigInfo.setRewardPerShare, //0xd684d656

    sigInfo.overrideWithdrawnRewards, //0x0ffa6d98
    sigInfo.withdraw, //0x2e1a7d4d
    sigInfo.claimRewards, //0x5ceb78ad
    sigInfo.setRewardToken //0x3de4c746
  ]

  const zeroAddress = '0x0000000000000000000000000000000000000000'

  web3.eth.defaultAccount = '0x93BBA8c55865466699Ed5233BeD51cf478d49850'
  let diamond = await Diamond.deployed()

  const diamondCutAndLoupeContract = new web3.eth.Contract( DiamondCutAndLoupeFacet.abi, diamond.address )

  try {
    const tx = await diamondCutAndLoupeContract.methods
      .diamondCut(
        [[hamachiFacetInfo.imple, 0, selectors]],
        hamachiContract.address,
        '0x8129fc1c'
      )
      .send({ from: web3.eth.defaultAccount })
  } catch (err) {
    console.log(err)
  }

  const hamachiFacetContract = await HamachiFacet.at(diamond.address)
  const rewardTokenContract = await Lotto.at(lottoContract.address)

  const hamachiPair = await factoryContract.getPair(diamond.address, wethAddr)
  await hamachiFacetContract.setBuyFee(100, 600)
  await hamachiFacetContract.setMaxTokenPerWallet(
    new BN('1000000000000000000000000000')
  )
  //await hamachiFacetContract.setNumTokensToSwap(new BN('250000000000000000000'))
  // await hamachiFacetContract.setNumTokensToSwap(new BN('2500000000000000000000000'))
  await hamachiFacetContract.setSellFee(100, 600)
  await hamachiFacetContract.setLiquidityWallet(accounts[0])
  // await hamachiFacetContract.setImplementation(methodsExposureFacetInfo.imple)
  await hamachiFacetContract.excludeFromFee(accounts[0])
  //await hamachiFacetContract.excludeFromFee(accounts[1])
  // await hamachiFacetContract.excludeFromFee(accounts[2])
  // await hamachiFacetContract.excludeFromMaxWallet(accounts[2])
  //await hamachiFacetContract.excludeFromMaxWallet(accounts[1])
  await hamachiFacetContract.excludeFromMaxWallet(accounts[0])

  await hamachiFacetContract.excludeFromReward(hamachiPair)
  await hamachiFacetContract.excludeFromMaxWallet(hamachiPair)

  await hamachiFacetContract.setProcessRewards(true)
  //await hamachiFacetContract.setProcessFeeRole(accounts[1])
  await hamachiFacetContract.setProcessFeeRole(accounts[0])
  await hamachiFacetContract.setDefaultRouter(routerContract.address)
  // await hamachiFacetContract.setMinBalanceForReward(new BN('10000000000000000000000'))
  // await hamachiFacetContract.setRewardPerShare(new BN('2213920943358040702428509521329'))

  await hamachiFacetContract.setIsLpPool(hamachiPair, true)
  await hamachiFacetContract.setRewardToken(
    lottoInfo.imple,
    routerInfo.imple,
    [wethAddr, lottoInfo.imple],
    false,
    '0x'
  )

  // Lotto contract
  await rewardTokenContract.initializePair()
  await rewardTokenContract.launch()
  console.log('Deploy finished')
}

module.exports = { deploy_zksync_mainnet }
