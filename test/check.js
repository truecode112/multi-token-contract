const assert = require("assert");
const { strictEqual, ok } = require("assert");
const BN = require('bignumber.js')
const fs = require('fs')

const Diamond = artifacts.require('Diamond')
const SafuDeployerTemplate1 = artifacts.require('SafuDeployerTemplate1')
const SafuDeployerTemplate2 = artifacts.require('SafuDeployerTemplate2')
const DividendTracker = artifacts.require('DividendTracker')
const KissLPLocker = artifacts.require('KissLPLocker')
const IERC20 = artifacts.require("IERC20")
const PancakePair = artifacts.require("PancakePair")

const { checkGetFail, checkTransactionFailed, checkTransactionPassed, advanceTime, advanceBlock, takeSnapshot, revertToSnapShot, advanceTimeAndBlock } = require("./lib/utils.js");
const { maxUint256, USDT, PancakeRouter, PancakeFactory } = require('../migrations/lib/const')
const { setWeb3, buildEncodedData } = require('../migrations/lib/deploy')
const deployParams = require('../migrations/deploy-localhost.json');
const pvKey = fs.readFileSync(".secret").toString().trim();

let errorMessages = {
    alreadySet: 'Already Set',
    insufficientAllowance: 'ERC20: insufficient allowance',
    notLocked: 'Not Locked',
    notExpired: 'Not Expired'
}

const BN2Decimal = (t, decimal) => {
    if (decimal === undefined) decimal = 18
    return BN(t).div(BN(`1e${decimal}`)).toString()
}

contract("Diamond", accounts => {
    let deployerContract
    let template1Contract
    let template2Contract
    let lpLockerContract
    let routerAddress
    let dividendDeployerAddress
    let dividendTrackerImpleAddress
    let usdtContract

    let oldHistoryArray = []

    let account1Balance = 0
    let account2Balance = 0

    let deployer = accounts[3]
    let wethAddress

    before (async () => {
        let deployerInfo = deployParams.find(t => t.name === "Diamond")
        let routerInfo = deployParams.find(t => t.name === "PancakeRouter")
        let dividendTrackerDeployerInfo = deployParams.find(t => t.name === "DividendTrackerDeployer")
        let dividendTrackerImpleInfo = deployParams.find(t => t.name === "DividendTracker")
        let lpLockerInfo = deployParams.find(t => t.name === 'KissLPLocker')
        let usdtInfo = deployParams.find(t => t.name === 'USDT')
        let wbnbInfo = deployParams.find(t => t.name === 'WBNB')

        deployerContract = await Diamond.at(deployerInfo.proxy)
        routerAddress = routerInfo.imple
        dividendDeployerAddress = dividendTrackerDeployerInfo.imple
        dividendTrackerImpleAddress = dividendTrackerImpleInfo.imple

        lpLockerContract = await KissLPLocker.at(lpLockerInfo.imple)
        usdtContract = await USDT.at(usdtInfo.imple)
        wethAddress = wbnbInfo.imple

        setWeb3(web3)
    })

    it ("Checking deployer contract parameters", async () => {
        console.log('********** Fee Info **********')

        let i
        for (i = 0; ; i ++) {
            try {
                let wallet = await deployerContract.feeWallets(i)
                let feeRate = await deployerContract.feeRates(i)

                console.log(i + 1, wallet, BN(feeRate).div(10000).times(100).toString(), "%")
            } catch (err) {
                break;
            }
        }

        console.log('********** Template Info **********')

        for (i = 0; ; i ++) {
            try {
                let deployer = await deployerContract.deployers(i)
                let feeTemlate = await deployerContract.feeTemplates(i)
                console.log(i + 1, deployer, BN2Decimal(feeTemlate), "ETH")
            } catch (err) {
                break;
            }
        }

        let owner = await deployerContract.owner()
        assert(owner.toLowerCase() === accounts[0].toLowerCase())
    })

    it ("Deploying Template 1", async () => {
        let callParam1 = buildEncodedData(
            ["uint256", "address", "uint256", "uint256"],
            [100, accounts[5], 100, 20]
        )
        let callParam2 = buildEncodedData(
            ["address", "uint256", "uint256", "uint256", "bytes"],
            [routerAddress, 0, 2500, 100, "0x" + callParam1]
        )
        let callParam = buildEncodedData(
            ["string", "string", "uint8", "uint256", "bytes"],
            ["SafuTokenTemplate1", "STT1", 9, 1000000000, "0x" + callParam2]
        )

        oldHistoryArray = await deployerContract.getDeployHistory()

        account1Balance = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[1])))
        account2Balance = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[2])))

        await checkTransactionPassed(deployerContract.deploy(1, "0x" + callParam, "0x", {value: "200000000000000000", from: deployer}))
    })

    it ("Deployed fee distribution", async () => {
        let a1 = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[1])))
        let a2 = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[2])))

        // 60% of fee 0.2ETH
        // 40% of fee 0.2ETH
        console.log(`fee rx 1: ${a1 - account1Balance} should be 0.12, fee rx 2: ${a2 - account2Balance} should be 0.08`)
    })

    it ("Analyzing Template 1", async () => {
        let h = await deployerContract.getDeployHistory()
        let historyArray = h.filter(t => oldHistoryArray.find(aa => aa.id === t.id) === undefined)

        console.log(historyArray.map(t => {
            return {
                ...t,
                a: {
                    id: t.id.toString(),
                    timestamp: t.timestamp.toString(),
                    template: t.template.toString(),
                    cost: BN2Decimal(t.cost)
                }
            }
        }))

        let newlyDeployed = historyArray.find(t => t.creator.toLowerCase() === deployer.toLowerCase())
        assert(newlyDeployed !== undefined)

        let contract1 = await SafuDeployerTemplate1.at(newlyDeployed.deployedAddress)
        let idString = await contract1.identifier()
        assert(idString === "Safu Smart Deployer Template 1")
        let name = await contract1.name()
        assert(name === "SafuTokenTemplate1")
        let symbol = await contract1.symbol()
        assert(symbol === "STT1")
        let decimals = await contract1.decimals()
        assert(parseInt(decimals.toString()) === 9)
        let totalSupply = await contract1.totalSupply()
        assert(parseFloat(BN2Decimal(totalSupply, 9)) === 1000000000)
        let r = await contract1.uniswapV2Router()
        assert(r.toLowerCase() === routerAddress.toLowerCase())
        let taxForLiquidity = await contract1.taxForLiquidity()
        assert(parseInt(taxForLiquidity.toString()) === 0)
        let taxForMarketing = await contract1.taxForMarketing()
        assert(parseInt(taxForMarketing.toString()) === 2500)
        let maxTxAmount = await contract1.maxTxAmount()
        assert(parseFloat(BN2Decimal(maxTxAmount, 9)) === 1000000000 * 100 / 10000)
        let maxWalletAmount = await contract1.maxWalletAmount()
        assert(parseFloat(BN2Decimal(maxWalletAmount, 9)) === 1000000000 * 100 / 10000)
        let marketingWallet = await contract1.marketingWallet()
        assert(marketingWallet.toLowerCase() === accounts[5].toLowerCase())
        let maxSellToAddToLP = await contract1.maxSellToAddToLP()
        assert(parseFloat(BN2Decimal(maxSellToAddToLP, 9)) === 1000000000 * 100 / 10000)
        let maxSellToAddToETH = await contract1.maxSellToAddToETH()
        assert(parseFloat(BN2Decimal(maxSellToAddToETH, 9)) === 1000000000 * 20 / 10000)
        let owner = await contract1.owner()
        assert(owner.toLowerCase() === deployer.toLowerCase())

        let myBalance = await contract1.balanceOf(deployer)
        assert(BN2Decimal(myBalance, 9) === BN2Decimal(totalSupply, 9))
    })

    it ("Deploying Template 2", async () => {
        let auxParam = buildEncodedData(
            ["string", "string", "uint256", "uint256"],
            ["SafuDeployerDividends", "SDD", 0, 3600]
        )

        let callParam3 = buildEncodedData(
            ["uint256", "uint256", "uint256", "uint256"],
            [0, 4000, 6000, 0]
        )
        let callParam4 = buildEncodedData(
            ["uint256", "uint256", "uint256", "bytes"],
            [1000, 2000, 2000, "0x" + callParam3]
        )
        let callParam5 = buildEncodedData(
            ["address", "address", "uint256", "bytes"],
            [accounts[4], accounts[5], 50000, "0x" + callParam4]
        )
        let callParam6 = buildEncodedData(
            ["uint256", "uint256", "uint256", "address", "bytes"],
            [200, "300000000000000000", "1000000000000000000", accounts[3], "0x" + callParam5]
        )
        let callParam7 = buildEncodedData(
            ["address", "bool", "bool", "uint256", "bytes"],
            [routerAddress, true, true, 200, "0x" + callParam6]
        )
        let callParam = buildEncodedData(
            ["string", "string", "uint8", "uint256", "bytes"],
            ["SafuTokenTemplate2", "STT2", 9, 1000000000, "0x" + callParam7]
        )

        oldHistoryArray = await deployerContract.getDeployHistory()

        account1Balance = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[1])))
        account2Balance = parseFloat(BN2Decimal(await web3.eth.getBalance(accounts[2])))

        await checkTransactionPassed(deployerContract.deploy(2, "0x" + callParam, "0x" + auxParam, {value: "240000000000000000", from: deployer}))
    })

    it ("Analyzing Template 2", async () => {
        let h = await deployerContract.getDeployHistory()
        let historyArray = h.filter(t => oldHistoryArray.find(aa => aa.id === t.id) === undefined)

        console.log(historyArray.map(t => {
            return {
                ...t,
                a: {
                    id: t.id.toString(),
                    timestamp: t.timestamp.toString(),
                    template: t.template.toString(),
                    cost: BN2Decimal(t.cost)
                }
            }
        }))

        let newlyDeployed = historyArray.find(t => t.creator.toLowerCase() === deployer.toLowerCase())
        assert(newlyDeployed !== undefined)

        let contract2 = await SafuDeployerTemplate2.at(newlyDeployed.deployedAddress)
        let idString = await contract2.identifier()
        assert(idString === "Safu Smart Deployer Template 2")
        let name = await contract2.name()
        assert(name === "SafuTokenTemplate2")
        let symbol = await contract2.symbol()
        assert(symbol === "STT2")
        let decimals = await contract2.decimals()
        assert(parseInt(decimals.toString()) === 9)
        let totalSupply = await contract2.totalSupply()
        assert(parseFloat(BN2Decimal(totalSupply, 9)) === 1000000000)
        let r = await contract2.uniswapV2Router()
        assert(r.toLowerCase() === routerAddress.toLowerCase())
        let swapAndLiquifyEnabled = await contract2.swapAndLiquifyEnabled()
        assert(swapAndLiquifyEnabled === true)
        let isTaxFreeTransfer = await contract2.isTaxFreeTransfer()
        assert(isTaxFreeTransfer === true)
        let maxBuyAmount = await contract2.maxBuyAmount()
        assert(parseFloat(BN2Decimal(maxBuyAmount, 9)) === 1000000000 * 200 / 10000)
        let ethPriceToSwap = await contract2.ethPriceToSwap()
        assert(parseFloat(BN2Decimal(ethPriceToSwap)) === 0.3)
        let ethSellAmount = await contract2.ethSellAmount()
        assert(parseFloat(BN2Decimal(ethSellAmount)) === 1)
        let maxWalletAmount = await contract2.maxWalletAmount()
        assert(parseFloat(BN2Decimal(maxWalletAmount, 9)) === 1000000000 * 200 / 10000)
        let buyBackAddress = await contract2.buyBackAddress()
        assert(buyBackAddress.toLowerCase() === accounts[3].toLowerCase())
        let marketingAddress = await contract2.marketingAddress()
        assert(marketingAddress.toLowerCase() === accounts[4].toLowerCase())
        let devAddress = await contract2.devAddress()
        assert(devAddress.toLowerCase() === accounts[5].toLowerCase())
        let gasForProcessing = await contract2.gasForProcessing()
        assert(parseInt(gasForProcessing.toString()) === 50000)
        let taxFees = await contract2.taxFees()
        assert(parseInt(taxFees.buyFee) === 1000)
        assert(parseInt(taxFees.sellFee) === 2000)
        assert(parseInt(taxFees.largeSellFee) === 2000)
        let distribution = await contract2.distribution()
        assert(parseInt(distribution.devTeam) === 0)
        assert(parseInt(distribution.marketing) === 4000)
        assert(parseInt(distribution.dividend) === 6000)
        assert(parseInt(distribution.buyBack) === 0)
        let contract2Owner = await contract2.owner()
        assert(contract2Owner.toLowerCase() === deployer.toLowerCase())

        let dividendTracker = await contract2.dividendTracker()
        let trackerContract = await DividendTracker.at(dividendTracker)
        let trackerOwner = await trackerContract.owner()
        assert(trackerOwner.toLowerCase() === deployer.toLowerCase())
        name = await trackerContract.name()
        assert(name === 'SafuDeployerDividends')
        symbol = await trackerContract.symbol()
        assert(symbol === 'SDD')
        let minimumTokenBalanceForDividends = await trackerContract.minimumTokenBalanceForDividends()
        assert(parseFloat(BN2Decimal(minimumTokenBalanceForDividends)) === 0)
        let impleToken = await trackerContract.impleToken()
        assert(impleToken === contract2.address)
        let claimWait = await trackerContract.claimWait()
        assert(parseInt(claimWait.toString()) == 3600)
    })

    it("Trying to add to the LP: Kiss Token - No Fee", async () => {
        let id = await takeSnapshot()

        let h = await deployerContract.getDeployHistory()

        // await checkTransactionFailed(lpLockerContract.addToLPAndLock(h[0].deployedAddress, accounts[7], '1000000000000', 86400 * 30 * 6, {from: accounts[0]}), errorMessages.insufficientAllowance)

        let adder = accounts[1]
        let getter = accounts[7]

        let tokenContract = await IERC20.at(h[0].deployedAddress)
        await checkTransactionPassed(tokenContract.approve(lpLockerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(tokenContract.transfer(adder, '1000000000000', {from: deployer}))

        tokenContract = await SafuDeployerTemplate1.at(tokenContract.address)
        let pair = await tokenContract.uniswapV2Pair()
        let pairContract = await PancakePair.at(pair)

        let oldP = await pairContract.balanceOf(lpLockerContract.address)

        let oldBal = await web3.eth.getBalance(adder)
        await checkTransactionPassed(lpLockerContract.addToLPAndLock(tokenContract.address, getter, '1000000000000', 86400 * 30 * 6, {from: adder, value: web3.utils.toWei('2')}))
        let newBal = await web3.eth.getBalance(adder)
        console.log("added 2 $ETH to LP:", BN2Decimal(oldBal), BN2Decimal(newBal)) // difference is around 2 ETH because addToLPAndLock function call does not cost any.

        let newP = await pairContract.balanceOf(lpLockerContract.address)
        console.log("LP token minted:", oldP.toString(), newP.toString()) // difference is the LP token minted.

        let reserves = await pairContract.getReserves()
        let t1 = await pairContract.token0()
        console.log("Pair Resource:", 
            t1 === wethAddress? web3.utils.fromWei(reserves[0].toString()): BN2Decimal(reserves[0], 9),
            t1 !== wethAddress? web3.utils.fromWei(reserves[1].toString()): BN2Decimal(reserves[1], 9)) // token: 1000 - 1000 * 0.25 (sell tax fo token for locker contract) = 750, ETH: 2ETH

        oldP = await pairContract.balanceOf(getter)
        await advanceTimeAndBlock(86400 * 30 * 5)
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: account[5]}), errorMessages.notLocked);
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: adder}), errorMessages.notExpired);
        await advanceTimeAndBlock(86400 * 30 * 1)
        await checkTransactionPassed(lpLockerContract.unlock(pair, 0, newP, {from: adder}))

        newP = await pairContract.balanceOf(getter)
        let np = await pairContract.balanceOf(lpLockerContract.address)
        console.log("Getter LP token:", oldP.toString(), newP.toString(), ", Locked LP token:", np.toString()) // difference is the LP token, last one is LP token locked.

        await revertToSnapShot(id.result)
    })

    it("Trying to add to the LP: Non-Kiss Token - No Fee", async () => {
        let id = await takeSnapshot()

        let adder = accounts[0]
        let getter = accounts[6]

        let tokenContract = await IERC20.at(usdtContract.address)
        await checkTransactionPassed(tokenContract.approve(lpLockerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(tokenContract.transfer(adder, '100000000000000000000000', {from: accounts[0]}))

        tokenContract = usdtContract

        let oldBal = await web3.eth.getBalance(adder)
        await checkTransactionPassed(lpLockerContract.addToLPAndLock(tokenContract.address, getter, '100000000000000000000000', 86400 * 30 * 6, {from: adder, value: web3.utils.toWei('5')}))
        let newBal = await web3.eth.getBalance(adder)
        console.log("added 5 $ETH to LP:", BN2Decimal(oldBal), BN2Decimal(newBal)) // difference is around 5 ETH because addToLPAndLock function call does not cost any for owner of locker contract.

        let routerContract = await PancakeRouter.at(routerAddress)
        let factoryContract = await PancakeFactory.at(await routerContract.factory())
        let pair = await factoryContract.getPair(usdtContract.address, await routerContract.WETH())
        let pairContract = await PancakePair.at(pair)

        let newP = await pairContract.balanceOf(lpLockerContract.address)
        console.log("LP token minted:", newP.toString()) // difference is the LP token minted.

        let reserves = await pairContract.getReserves()
        let t1 = await pairContract.token0()
        console.log("Pair Resource:", 
            t1 === wethAddress? web3.utils.fromWei(reserves[0].toString()): BN2Decimal(reserves[0], 18),
            t1 !== wethAddress? web3.utils.fromWei(reserves[1].toString()): BN2Decimal(reserves[1], 18)) // token: 1000, ETH: 5 $ETH

        oldP = await pairContract.balanceOf(getter)
        await advanceTimeAndBlock(86400 * 30 * 5)
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: account[5]}), errorMessages.notLocked);
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: adder}), errorMessages.notExpired);
        await advanceTimeAndBlock(86400 * 30 * 1)
        await checkTransactionPassed(lpLockerContract.unlock(pair, 0, newP, {from: adder}))

        newP = await pairContract.balanceOf(getter)
        let np = await pairContract.balanceOf(lpLockerContract.address)
        console.log("Getter LP token:", oldP.toString(), newP.toString(), ", Locked LP token:", np.toString()) // difference is the LP token, last one is LP token locked.

        await revertToSnapShot(id.result)
    })

    it("Trying to add to the LP: Non-Kiss Token - Fee", async () => {
        let id = await takeSnapshot()

        let adder = accounts[2]
        let getter = accounts[6]

        let tokenContract = await IERC20.at(usdtContract.address)
        await checkTransactionPassed(tokenContract.approve(lpLockerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(tokenContract.transfer(adder, '200000000000000000000000', {from: accounts[0]}))

        tokenContract = usdtContract

        let oldBal = await web3.eth.getBalance(adder)
        await checkTransactionPassed(lpLockerContract.addToLPAndLock(tokenContract.address, getter, '100000000000000000000000', 86400 * 30 * 6, {from: adder, value: web3.utils.toWei('10')}))
        let newBal = await web3.eth.getBalance(adder)
        console.log("added 10 $ETH to LP:", BN2Decimal(oldBal), BN2Decimal(newBal)) // difference is around 5 ETH because addToLPAndLock function call does not cost any for owner of locker contract.

        let routerContract = await PancakeRouter.at(routerAddress)
        let factoryContract = await PancakeFactory.at(await routerContract.factory())
        let pair = await factoryContract.getPair(usdtContract.address, await routerContract.WETH())
        let pairContract = await PancakePair.at(pair)

        let newP = await pairContract.balanceOf(lpLockerContract.address)
        console.log("LP token minted:", newP.toString()) // difference is the LP token minted.

        let reserves = await pairContract.getReserves()
        let t1 = await pairContract.token0()
        console.log("Pair Resource:", 
            t1 === wethAddress? web3.utils.fromWei(reserves[0].toString()): BN2Decimal(reserves[0], 18),
            t1 !== wethAddress? web3.utils.fromWei(reserves[1].toString()): BN2Decimal(reserves[1], 18)) // token: 1000, ETH: 5 $ETH

        oldP = await pairContract.balanceOf(getter)
        await advanceTimeAndBlock(86400 * 30 * 5)
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: account[5]}), errorMessages.notLocked);
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: adder}), errorMessages.notExpired);
        await advanceTimeAndBlock(86400 * 30 * 1)
        await checkTransactionPassed(lpLockerContract.unlock(pair, 0, newP, {from: adder}))

        newP = await pairContract.balanceOf(getter)
        let np = await pairContract.balanceOf(lpLockerContract.address)
        console.log("Getter LP token:", oldP.toString(), newP.toString(), ", Locked LP token:", np.toString()) // difference is the LP token, last one is LP token locked.

        await revertToSnapShot(id.result)
    })

    it("Trying to lock LP: Fee", async () => {
        let id = await takeSnapshot()

        let h = await deployerContract.getDeployHistory()

        let adder = accounts[1]
        let getter = accounts[7]

        let tokenContract = await IERC20.at(h[0].deployedAddress)
        await checkTransactionPassed(tokenContract.approve(lpLockerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(tokenContract.transfer(adder, '1000000000000', {from: deployer}))

        tokenContract = await SafuDeployerTemplate1.at(tokenContract.address)
        let pair = await tokenContract.uniswapV2Pair()
        let pairContract = await PancakePair.at(pair)

        let routerContract = await PancakeRouter.at(routerAddress)

        let oldBal = await web3.eth.getBalance(adder)
        await checkTransactionPassed(tokenContract.approve(routerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(routerContract.addLiquidityETH(tokenContract.address, '1000000000000', 0, 0, adder, '0xffffffff', {from: adder, value: web3.utils.toWei('10')}))
        let oldP = await pairContract.balanceOf(adder)
        await checkTransactionPassed(pairContract.approve(lpLockerContract.address, maxUint256, {from: adder}))
        await checkTransactionPassed(lpLockerContract.lock(pair, getter, oldP, 86400 * 30 * 12, {from: adder, value: web3.utils.toWei('10')}))
        let newBal = await web3.eth.getBalance(adder)
        console.log("added 10 $ETH to LP, 1 $ETH to lock:", BN2Decimal(oldBal), BN2Decimal(newBal))

        let newP = await pairContract.balanceOf(lpLockerContract.address)
        console.log("LP token minted:", oldP.toString(), ', LP token of locker contract:', newP.toString())

        let reserves = await pairContract.getReserves()
        let t1 = await pairContract.token0()
        console.log("Pair Resource:", 
            t1 === wethAddress? web3.utils.fromWei(reserves[0].toString()): BN2Decimal(reserves[0], 9),
            t1 !== wethAddress? web3.utils.fromWei(reserves[1].toString()): BN2Decimal(reserves[1], 9)) // token: 1000 - 1000 * 0.25 (sell tax fo token for locker contract) = 750, ETH: 2ETH

        oldP = await pairContract.balanceOf(getter)
        await advanceTimeAndBlock(86400 * 30 * 11)
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: account[5]}), errorMessages.notLocked);
        // await checkTransactionFailed(lpLockerContract.unlock(pair, 0, newP, {from: adder}), errorMessages.notExpired);
        await advanceTimeAndBlock(86400 * 30 * 1)
        await checkTransactionPassed(lpLockerContract.unlock(pair, 0, newP, {from: adder}))

        newP = await pairContract.balanceOf(getter)
        let np = await pairContract.balanceOf(lpLockerContract.address)
        console.log("Getter LP token:", oldP.toString(), newP.toString(), ", Locked LP token:", np.toString()) // difference is the LP token, last one is LP token locked.

        await revertToSnapShot(id.result)
    })
})
