const { setWeb3 } = require('./lib/deploy')
const { deploy_localhost } = require('./lib/localhost')
const { deploy_bsctestnet } = require('./lib/bsctestnet')
const { deploy_goerli } = require('./lib/goerli')

module.exports = function (deployer, network, accounts) {

  let owner = accounts[0]
  let admin = accounts[9]
  let pancakeFeeSetter = accounts[8]

  deployer.then(async () => {
    setWeb3(web3)
    
    if (network === 'development') {
      await deploy_localhost(web3, deployer, accounts, {
        owner: owner,
        proxyAdmin: admin,
        pancakeFeeSetter: pancakeFeeSetter
      })
    } else if (network === 'bsctestnet') {
      await deploy_bsctestnet(web3, deployer, [accounts[0]], {
        owner: owner, // my wallet
        proxyAdmin: '0x3FFBbbebD7bC7B440f95BaA23D74a80ECeB3cf1A', // my wallet
        fee1: owner, //"0x2C0D829bf475FE455944Dd60c8F4CE369d56d665", // my wallet
        fee2: owner, //"0xCeF9663A7Ce9a1fcc4a473aef24a8B73B386F86b" // mason provided
      })
    } else if (network === 'goerli') {
      await deploy_goerli(web3, deployer, [accounts[0]], {
        owner: owner,
        proxyAdmin: '0x3FFBbbebD7bC7B440f95BaA23D74a80ECeB3cf1A',
        fee1: "0x2C0D829bf475FE455944Dd60c8F4CE369d56d665",
        fee2: "0xCeF9663A7Ce9a1fcc4a473aef24a8B73B386F86b"
      })
    } else if (network === 'mainnet') {
      // 0x4acD701dC3f57601Edc09991D8a03063A3910dE4 - 25%
      // 0x17C94CBb1B48d931FB921bf657F85582Eb9B746E - 50%
      // 0x2C0D829bf475FE455944Dd60c8F4CE369d56d665 - 25%
      // fee 30000000000000000
      // router 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    } else if (network === 'arbitrum') {
      // 0x4acD701dC3f57601Edc09991D8a03063A3910dE4 - 25%
      // 0x17C94CBb1B48d931FB921bf657F85582Eb9B746E - 50%
      // 0x2C0D829bf475FE455944Dd60c8F4CE369d56d665 - 25%
      // fee 30000000000000000
      // router 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506
    }
  })
};
