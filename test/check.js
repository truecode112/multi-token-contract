const assert = require('assert')
const BN = require('bignumber.js')

const {
  maxUint256,
  WBNB,
  PancakeRouter,
  PancakeFactory,
  USDT,
  Diamond,
  DiamondCutAndLoupeFacet,
  LibDiamond,
  MethodsExposureFacet,
  HamachiFacet,
  Lotto,
  MyToken
} = require('../migrations/lib/const')

const { setWeb3 } = require('../migrations/lib/deploy')
const deployParams = require('../migrations/deploy-localhost.json')

const BN2Decimal = (t, decimal) => {
  if (decimal === undefined) decimal = 18
  return BN(t)
    .div(BN(`1e${decimal}`))
    .toString()
}

contract('Diamond', function (accounts) {
  let user0 = accounts[0]
  let user1 = accounts[1]
  let user2 = accounts[2]
  let user3 = accounts[3]

  let tokenDecimals
  let hamachiTokenContract
  let rewardTokenContract
  let factoryContract
  let myTokenContract

  let oneTimeBuy = new BN('50000000000000000000')

  before(async () => {
    let routerInfo = deployParams.find(t => t.name === 'PancakeRouter')
    let factoryInfo = deployParams.find(t => t.name === 'PancakeFactory')
    let wbnbInfo = deployParams.find(t => t.name === 'WBNB')
    let diamondInfo = deployParams.find(t => t.name === 'Diamond')
    let rewardTokenContractInfo = deployParams.find(t => t.name === 'Lotto')
    let myTokenInfo = deployParams.find(t => t.name === 'MyToken')

    hamachiTokenContract = await HamachiFacet.at(diamondInfo.imple)
    myTokenContract = await MyToken.at(myTokenInfo.imple)
    rewardTokenContract = await Lotto.at(rewardTokenContractInfo.imple)
    console.log('rewardTokenContract address', rewardTokenContract.address)

    wethAddress = wbnbInfo.imple
    routerContract = await PancakeRouter.at(routerInfo.imple)
    factoryContract = await PancakeFactory.at(factoryInfo.imple)

    let newPerShare = await hamachiTokenContract.getRewardPerShare()
    console.log('newPerShare', BN2Decimal(newPerShare))

    setWeb3(web3)
  })

  const tokenBalance = async w => {
    let bal = await hamachiTokenContract.balanceOf(w)
    return BN2Decimal(bal.toString(), tokenDecimals)
  }

  const rewardTokenBalance = async w => {
    let bal = await rewardTokenContract.balanceOf(w)
    return BN2Decimal(bal.toString(), tokenDecimals)
  }

  const ethBalance = async w => {
    let bal = await web3.eth.getBalance(w)
    return web3.utils.fromWei(bal)
  }

  it('Checking the HAMI Token', async function () {
    console.log('*** Checking Configuration ***')

    let buyFees = await hamachiTokenContract.buyFees()
    const { 0: liquidityBuyFee, 1: rewardBuyFee } = buyFees
    // const { liquidityBuyFee, rewardBuyFee } = hamachiTokenContract.buyFees();
    assert(liquidityBuyFee.toNumber() == 100)
    assert(rewardBuyFee.toNumber() == 600)
    let sellFees = await hamachiTokenContract.sellFees()
    const { 0: liquiditySellFee, 1: rewardSellFee } = sellFees
    assert(liquiditySellFee.toNumber() == 100)
    assert(rewardSellFee.toNumber() == 600)
  })

  // it('Adding to the liquidity', async () => {
  //   await myTokenContract.approve(routerContract.address, maxUint256, {
  //     from: accounts[0]
  //   })

  //   const pair = await factoryContract.getPair(
  //     myTokenContract.address,
  //     wethAddress
  //   )
  //   console.log(pair)

  //   let tx = await routerContract.addLiquidityETH(
  //     myTokenContract.address,
  //     '20000000000000000000',
  //     0,
  //     0,
  //     accounts[0],
  //     '0xffffffff',
  //     { from: accounts[0], value: web3.utils.toWei('10') }
  //   )
  //   console.log('>>> addLiquidityETH >>>', tx)
  // })

  it('Adding to the liquidity', async () => {
    await hamachiTokenContract.approve(routerContract.address, maxUint256, {
      from: accounts[0]
    })

    let tx = await routerContract.addLiquidityETH(
      hamachiTokenContract.address,
      web3.utils.toWei('20000000'),
      0,
      0,
      accounts[0],
      '0xffffffff',
      { from: accounts[0], value: web3.utils.toWei('20') }
    )

    await rewardTokenContract.approve(routerContract.address, maxUint256, {
      from: accounts[0]
    })

    await routerContract.addLiquidityETH(
      rewardTokenContract.address,
      web3.utils.toWei('200000000'),
      0,
      0,
      accounts[0],
      '0xffffffff',
      { from: accounts[0], value: web3.utils.toWei('10') }
    )
  })

  /*it('user2 and user3 buy Reward token', async function () {
    let ta = await routerContract.getAmountsOut(web3.utils.toWei('5000'), [
      rewardTokenContract.address,
      wethAddress
    ])
    await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [wethAddress, rewardTokenContract.address],
      user2,
      '0xffffffff',
      { from: user2, value: ta[ta.length - 1].toString() }
    )

    ta = await routerContract.getAmountsOut(web3.utils.toWei('3000'), [
      rewardTokenContract.address,
      wethAddress
    ])
    await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [wethAddress, rewardTokenContract.address],
      user3,
      '0xffffffff',
      { from: user3, value: ta[ta.length - 1].toString() }
    )
    console.log('user2 reward token balance', await rewardTokenBalance(user2));
    console.log('user3 reward token balance', await rewardTokenBalance(user3));
  })*/

  it('user2 buy HAMI token', async function () {

    console.log('contract token balance before user2 buy token', await tokenBalance(hamachiTokenContract.address));
    // console.log('user2 eth balance before buy hami token', await ethBalance(user2));

    let ta = await routerContract.getAmountsOut(web3.utils.toWei('20000'), [
      hamachiTokenContract.address,
      wethAddress
    ])
    await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [wethAddress, hamachiTokenContract.address],
      user2,
      '0xffffffff',
      { from: user2, value: ta[ta.length - 1].toString() }
    )

    console.log('contract token balance after user2 buy token', await tokenBalance(hamachiTokenContract.address));
    // console.log('user2 token balance after buy', await tokenBalance(user2));
    // console.log('user2 eth balance after buy hami token', await ethBalance(user2));
    // console.log('user2 reward token balance', await rewardTokenBalance(user2));
    // console.log('user3 reward token balance', await rewardTokenBalance(user3));
  })

  it('user3 buy HAMI token', async function () {

    let ta = await routerContract.getAmountsOut(web3.utils.toWei('20000'), [
      hamachiTokenContract.address,
      wethAddress
    ])
    await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [wethAddress, hamachiTokenContract.address],
      user3,
      '0xffffffff',
      { from: user3, value: ta[ta.length - 1].toString() }
    )
  })

  it('user2 send user3 HAMI token', async function () {

    console.log('token balance of user2 before send', await tokenBalance(user2));
    console.log('token balance of user3 before send', await tokenBalance(user3));

    let tx = await hamachiTokenContract.transfer(user3, web3.utils.toWei('1500'), {from: user2});
    // console.log('>>> send token tx >>> ', tx);
    console.log('token balance of user2 after send', await tokenBalance(user2));
    console.log('token balance of user3 after send', await tokenBalance(user3));
  })

  it('user2 and user3 sell HAMI token', async function () {
    // console.log('contract eth balance before process fee', await ethBalance(hamachiTokenContract.address));
    // console.log('contract token balance before process fee', await tokenBalance(hamachiTokenContract.address));
    // await hamachiTokenContract.processFees({from: user1});
    // console.log('contract eth balance after process fee', await ethBalance(hamachiTokenContract.address));
    // console.log('contract token balance after process fee', await tokenBalance(hamachiTokenContract.address));

    console.log('user2 reward token balance before sell', await rewardTokenBalance(user2));

    console.log('contract eth balance before user2 sell token', await ethBalance(hamachiTokenContract.address));
    await hamachiTokenContract.approve(routerContract.address, maxUint256, {
      from: user2
    });

    // let ta = await routerContract.getAmountsIn(web3.utils.toWei('100'), [
    //   hamachiTokenContract.address, wethAddress
    // ])
    const rewardHolders = await hamachiTokenContract.getRewardHolders()
    let i
    for (i = 0; i < parseInt(rewardHolders.toString()); i ++) {
      const c = await hamachiTokenContract.getRewardAccountAtIndex(i)
      console.log(i + 1, c.account, c.index.toString(), c.numInQueue.toString(), web3.utils.fromWei(c.rewardBalance.toString()), web3.utils.fromWei(c.withdrawableRewards.toString()), web3.utils.fromWei(c.totalRewards.toString()))
    }

    const reward = await hamachiTokenContract.dividendOf(user2)
    // console.log('user2 dividend', web3.utils.fromWei(reward))

    // await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
    //   0,
    //   [wethAddress, rewardTokenContract.address],
    //   user2,
    //   '0xffffffff',
    //   { from: user2, value: web3.utils.toWei('0.001') }
    // )

    // console.log('user2 bought some reward token')

    // const rw = await hamachiTokenContract.getRewardToken()
    // console.log('reward token context', rw)

    await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(
      web3.utils.toWei('100'),
      0,
      [hamachiTokenContract.address, wethAddress],
      user2,
      '0xffffffff',
      { from: user2 }
    )

    console.log('contract token balance after user2 sell token', await tokenBalance(hamachiTokenContract.address));
    console.log('contract eth balance after user2 sell token', await ethBalance(hamachiTokenContract.address));
    // console.log('user2 token balance after sell', await tokenBalance(user2));
    // console.log('user2 eth balance after sell hami token', await ethBalance(user2));
    console.log('user2 reward token balance after sell', await rewardTokenBalance(user2));
    console.log('user3 reward token balance after sell', await rewardTokenBalance(user3));
  })

  // it('user3 send 10 HAMI token to user2', async function () {
  //   console.log('user3 balance', await tokenBalance(user3));
  //   console.log('user2 balance', await tokenBalance(user2));
  //   await hamachiTokenContract.transfer(user3, web3.utils.toWei('10'), {from: user2});
  //   console.log('user3 balance after transfer', await tokenBalance(user3));
  //   console.log('user2 balance after transfer', await tokenBalance(user2));
  // })
})
