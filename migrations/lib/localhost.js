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
  MethodsExposureFacet,
  HamachiFacet,
  Lotto,
  MyToken
} = require('./const')

const _liquidityIncentiveWallet = '0xE56F966cAa8ff51536Cdc07eb7a4AbEcCE816A58'
const _marketingWallet = '0x729C696D4Dfc41ebD6864E67A077Fa6C533EAa46'
const _jackpotWallet = '0x1AfC8372FD130E8E5c172A99a0e62Cd1327814a8'
const _devWalletOne = '0xA26c53bB94Ba63a5522A15055f7cA334FbE62e93'

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

const deploy_localhost = async (web3, deployer, accounts, specialAccounts) => {
  let network = 'localhost'
  const { owner, proxyAdmin, pancakeFeeSetter } = specialAccounts

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

  let hamachiFacetInfo = totalRet.find(t => t.name === 'HamachiFacet')
  // let withOwnershipInfo = totalRet.find(t => t.name === "WithOwnership")
  // let withRewardInfo = totalRet.find(t => t.name === "WithReward")
  let lottoInfo = totalRet.find(t => t.name === 'Lotto')
  let myTokenInfo = totalRet.find(t => t.name == "MyToken")

  wbnbInfo = await deployContract(deployer, 'WBNB', WBNB)
  totalRet = syncDeployInfo(network, 'WBNB', wbnbInfo, totalRet)

  factoryInfo = await deployContract(
    deployer,
    'PancakeFactory',
    PancakeFactory,
    pancakeFeeSetter
  )
  totalRet = syncDeployInfo(network, 'PancakeFactory', factoryInfo, totalRet)

  routerInfo = await deployContract(
    deployer,
    'PancakeRouter',
    PancakeRouter,
    factoryInfo.imple,
    wbnbInfo.imple
  )
  totalRet = syncDeployInfo(network, 'PancakeRouter', routerInfo, totalRet)

  let routerContract = await PancakeRouter.at(routerInfo.imple)
  let factoryContract = await PancakeFactory.at(factoryInfo.imple)

  let wethAddr = await routerContract.WETH()
  console.log('WETH:', wethAddr)

  console.log(
    'Pancake Factory Pair HASH:',
    await factoryContract.INIT_CODE_PAIR_HASH()
  )

  diamondCutAndLoupeFacetInfo = await deployContract(
    deployer,
    'DiamondCutAndLoupeFacet',
    DiamondCutAndLoupeFacet
  )
  totalRet = syncDeployInfo(
    network,
    'DiamondCutAndLoupeFacet',
    diamondCutAndLoupeFacetInfo,
    totalRet
  )

  // let diamondCutAndLoupeContract = await DiamondCutAndLoupeFacet.at(
  //   diamondCutAndLoupeFacetInfo.imple
  // )

  methodsExposureFacetInfo = await deployContract(
    deployer,
    'MethodsExposureFacet',
    MethodsExposureFacet
  )
  totalRet = syncDeployInfo(
    network,
    'MethodsExposureFacet',
    methodsExposureFacetInfo,
    totalRet
  )

  hamachiFacetInfo = await deployContract(
    deployer,
    'HamachiFacet',
    HamachiFacet
  )
  totalRet = syncDeployInfo(network, 'HamachiFacet', hamachiFacetInfo, totalRet)

  let hamachiContract = await HamachiFacet.at(hamachiFacetInfo.imple)

  // withOwnershipInfo = await deployContract(deployer, "WithOwnership", WithOwnership)
  // totalRet = syncDeployInfo(network, "WithOwnership", withOwnershipInfo, totalRet);

  // withRewardInfo = await deployContract(deployer, "WithReward", WithReward)
  // totalRet = syncDeployInfo(network, "WithReward", withRewardInfo, totalRet);

  console.log('before diamond deploy', methodsExposureFacetInfo.imple);

  diamondInfo = await deployContract(
    deployer,
    'Diamond',
    Diamond,
    accounts[0],
    routerInfo.imple,
    wethAddr,
    diamondCutAndLoupeFacetInfo.imple,
    methodsExposureFacetInfo.imple
  )
  totalRet = syncDeployInfo(network, 'Diamond', diamondInfo, totalRet)
  let diamondContract = await DiamondCutAndLoupeFacet.at(diamondInfo.imple)
  // console.log(' >>> diamondContract >>> ', diamondContract);

  lottoInfo = await deployContract(
    deployer,
    'Lotto',
    Lotto,
    _liquidityIncentiveWallet,
    _marketingWallet,
    _jackpotWallet,
    _devWalletOne,
    factoryInfo.imple,
    routerInfo.imple,
    wethAddr
  )

  totalRet = syncDeployInfo(network, 'Lotto', lottoInfo, totalRet)
  let lottoContract = await Lotto.at(lottoInfo.imple)

  myTokenInfo = await deployContract(deployer, 'MyToken', MyToken, '10000000000000000000000')
  totalRet = syncDeployInfo(network, 'MyToken', myTokenInfo, totalRet)

  //console.log(' >>> hamachiContract >>> ', hamachiContract.contract._jsonInterface);
  //console.log(diamondCutAndLoupeContract);

  let sigInfo = {}
  hamachiContract.contract._jsonInterface.map(t => {
    sigInfo[t.name] = t.signature
  })
  // console.log(sigInfo, sigInfo.accumulativeDividendOf)

  // console.log('>>>> selectors >>>', getSelectors(HamachiFacet))
  // console.log(' >>> deployer address >>> ', deployer.networks.development.from)

  // const selectors = [sigInfo.accumulativeDividendOf]
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

  // console.log(diamondContract);
  // console.log(selectors)
  // console.log(hamachiFacetInfo.imple, typeof hamachiFacetInfo.imple)

  // console.log('>>> diamondContract.diamondCut >>>', diamondContract.diamondCut)
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  web3.eth.defaultAccount = accounts[0]
  // console.log('>>> web3.eth.defaultAccount >>> ', web3.eth.defaultAccount)
  // console.log(' >>> hamachiFacetInfo.imple >>> ', hamachiFacetInfo.imple)
  let diamond = await Diamond.deployed()
  // console.log(' >>> diamond.address >>> ', diamond.address)

  const diamondCutAndLoupeContract = new web3.eth.Contract(
    DiamondCutAndLoupeFacet.abi,
    diamond.address
  )

  try {
    const tx = await diamondCutAndLoupeContract.methods
      .diamondCut([[hamachiFacetInfo.imple, 0, selectors]], hamachiContract.address, '0x8129fc1c')
      .send({ from: web3.eth.defaultAccount })

    // console.log(tx)
  } catch (err) {
    console.log(err)
  }

  const hamachiFacetContract = await HamachiFacet.at(diamond.address)
  const rewardTokenContract = await Lotto.at(lottoContract.address)

  const hamachiPair = await factoryContract.getPair(diamond.address, wethAddr)
  console.log('hamachi pair', hamachiPair)

    await hamachiFacetContract.setBuyFee(100, 600)
  await hamachiFacetContract.setMaxTokenPerWallet(new BN('1000000000000000000000000000'))
  await hamachiFacetContract.setNumTokensToSwap(new BN('250000000000000000000'))
  // await hamachiFacetContract.setNumTokensToSwap(new BN('2500000000000000000000000'))
  await hamachiFacetContract.setSellFee(100, 600)
  await hamachiFacetContract.setLiquidityWallet(accounts[0])
  // await hamachiFacetContract.setImplementation(methodsExposureFacetInfo.imple)
  await hamachiFacetContract.excludeFromFee(accounts[0])
  await hamachiFacetContract.excludeFromFee(accounts[1])
  // await hamachiFacetContract.excludeFromFee(accounts[2])
  // await hamachiFacetContract.excludeFromMaxWallet(accounts[2])
  await hamachiFacetContract.excludeFromMaxWallet(accounts[1])
  await hamachiFacetContract.excludeFromMaxWallet(accounts[0])
    
  await hamachiFacetContract.excludeFromReward(hamachiPair)
  await hamachiFacetContract.excludeFromMaxWallet(hamachiPair)

  await hamachiFacetContract.setProcessRewards(true)
  await hamachiFacetContract.setProcessFeeRole(accounts[1])
  await hamachiFacetContract.setProcessFeeRole(accounts[0])
  await hamachiFacetContract.setDefaultRouter(routerContract.address)
  // await hamachiFacetContract.setMinBalanceForReward(new BN('10000000000000000000000'))
  // await hamachiFacetContract.setRewardPerShare(new BN('2213920943358040702428509521329'))
    
  await hamachiFacetContract.setIsLpPool(hamachiPair, true)
  await hamachiFacetContract.setRewardToken(lottoInfo.imple, routerInfo.imple, [wethAddr, lottoInfo.imple], false, '0x');

  const rw = await hamachiFacetContract.getRewardToken()
  console.log('reward token context', rw)

    // Lotto contract
  await rewardTokenContract.initializePair()
  await rewardTokenContract.launch()

  const totalSellFee = await hamachiFacetContract.totalSellFees()
  console.log('hamachi sell fee', totalSellFee.toString())

  // console.log('>>> diamondContract address >>> ', diamondContract.address);
  // let diamondCutFacet = await DiamondCutAndLoupeFacet.at(diamondContract.address);
  //

  // let tx = await diamondCutFacet.diamondCut(
  //   // [[hamachiFacetInfo.imple, 0, selectors]],
  //   [],
  //   zeroAddress,
  //   '0x'
  // );
  // console.log(tx)

  //const diamondContract = await Diamond.at(diamondInfo.imple)

  // const selector0 = web3.utils.keccak256('setIsLpPool(address,bool)').slice(0, 10)

  // const hamachiFacetContract = await HamachiFacet.at(hamachiFacetInfo.imple)

  // // console.log(selector0, typeof selector0)

  // [
  //   {
  //     [
  //       hamachiFacetContract.contract._jsonInterface.accumulativeDividendOf.signature, //0xa217fddf
  //       hamachiFacetContract.contract._jsonInterface.transferFrom.signature, //0x27ce0147
  //       hamachiFacetContract.contract._jsonInterface.approve.signature
  //     ],
  //     0,
  //     hamachiFacetContract._address
  //   }
  // ]

  // selectors[0] = DiamondCutAndLoupeFacet.diamondCut.selector;
  // selectors[1] = DiamondCutAndLoupeFacet.facets.selector;
  // selectors[2] = DiamondCutAndLoupeFacet.facetFunctionSelectors.selector;
  // selectors[3] = DiamondCutAndLoupeFacet.facetAddresses.selector;
  // selectors[4] = DiamondCutAndLoupeFacet.facetAddress.selector;
  // selectors[5] = DiamondCutAndLoupeFacet.supportsInterface.selector;

  //await diamondContract.diamondCut([hamachiFacetInfo.imple, 0, []], 0x0, 0 );

  // const sig_array = ['0xa217fddf', '0x27ce0147', '0xdd62ed3e', '0x095ea7b3', '0x70a08231', '0xe4748b9e',
  // '0x0e6878a3', '0x313ce567', '0xa457c2d7', '0x52df107f', '0x91b89fba', '0x437823ec',
  // '0x5b700d91', '0x52390c02', '0xe7841ec0', '0xb759ad6b', '0x6e6db72d', '0x41b49365',
  // '0x69940d79', '0x248a9ca3', '0x2f2ff15d', '0x91d14854', '0x39509351', '0x8129fc1c',
  // '0x5342acb4', '0x0e832273', '0xe1ab04c9', '0x6f741f2a', '0xa1bc910f', '0xd4698016',
  // '0x7a8baf52', '0x06fdde03', '0x01a6c43b', '0x8da5cb5b', '0x36568abe', '0xd547741f',
  // '0xe964b644', '0xe0f3ccf5', '0xd8fdbbd7', '0xc19010a7', '0x00539af0', '0xd784d426',
  // '0xe55096b0', '0x296f0a0c', '0xc01d0d05', '0xbd823943', '0x4e97a230', '0x0f569dad',
  // '0x09baae21', '0xfd622c08', '0xa46043f1', '0x2171dcc9', '0x95d89b41', '0xb9e93700',
  // '0x8a8a759e', '0xd0a39814', '0x18160ddd', '0xa9059cbb', '0x23b872dd', '0xf2fde38b',
  // '0xe32fb4c0', '0xf3f18947', '0xa8b9d240', '0xaafd847a', '0x8129fc1c', '0x4ce88b4b',
  // '0x8f899399', '0x17446133', '0xba69ebed', '0x9e998faa', '0x74991569', '0xa17826eb',
  // '0x5183d6fd', '0x1bf494a7', '0xd684d656', '0x372500ab', '0x0ffa6d98', '0x2e1a7d4d',
  // '0x5ceb78ad', '0x3de4c746'];

  //   sig_array.forEach((sig) => {
  //     const jsonobj = hamachiFacetContract.contract._jsonInterface.find(c => c.signature === sig);
  //     if (jsonobj == undefined) {
  //       console.log(sig, 'no sig');
  //     } else {
  //       console.log(sig, jsonobj);
  //     }

  //   });

  // console.log(selector0, sig)
  //let tx = await diamondContract.diamondCut([hamachiFacetInfo.imple, 0, []], )
  console.log('Deploy finished')
}

module.exports = { deploy_localhost }
