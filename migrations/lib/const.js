const BN = require('bignumber.js')

const addressZero = '0x0000000000000000000000000000000000000000'
const bytes32Zero = '0x0000000000000000000000000000000000000000000000000000000000000000'
const maxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

const WBNB = artifacts.require("WBNB")
const PancakeRouter = artifacts.require("PancakeRouter")
const PancakeFactory = artifacts.require("PancakeFactory")

const USDT = artifacts.require("USDT")
const Diamond = artifacts.require('Diamond')
const DiamondCutAndLoupeFacet = artifacts.require('DiamondCutAndLoupeFacet')
const LibDiamond = artifacts.require('LibDiamond')
const MethodsExposureFacet = artifacts.require('MethodsExposureFacet')
const HamachiFacet = artifacts.require('HamachiFacet')
const WithOwnership = artifacts.require('WithOwnership')
const WithReward = artifacts.require('WithReward')
const Lotto = artifacts.require('Lotto')
const MyToken = artifacts.require('MyToken')

module.exports = {
    addressZero, bytes32Zero, maxUint256,
    WBNB, PancakeRouter, PancakeFactory, USDT,
    Diamond, DiamondCutAndLoupeFacet, LibDiamond, MethodsExposureFacet, HamachiFacet, Lotto, MyToken
    
};
