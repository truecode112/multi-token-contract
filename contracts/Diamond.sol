// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./LibDiamond.sol";
import {DiamondCutAndLoupeFacet} from "./DiamondCutAndLoupeFacet.sol";
import {IERC173} from "./IERC173.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";
import {IPancakeRouter01, IPancakeRouter02} from "./pancake/PancakeRouter.sol";
import {IPancakeFactory} from "./pancake/interfaces/IPancakeFactory.sol";
import {WithReward} from "./WithReward.sol";
import {MethodsExposureFacet} from "./MethodsExposureFacet.sol";

// When no function exists for function called
error FunctionNotFound(string msg_);

contract Diamond {
    constructor(
        address liquidityWallet,
        address defaultRouter,
        address defaultPair,
        address diamondCutAndLoupeFacetAddress,
        address methodsExposureFacetAddress,
        address withRewardFacetAddress
    ) payable {
        LibDiamond.setContractOwner(msg.sender);
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        LibDiamond.RewardStorage storage rs = LibDiamond.rewardStorage();

        ds.fee.liquidityBuyFee = 100;
        ds.fee.rewardBuyFee = 600;

        ds.fee.liquiditySellFee = 100;
        ds.fee.rewardSellFee = 600;

        ds.numTokensToSwap = 5_000_000 * 10 ** 18;
        ds.maxTokenPerWallet = 250_000_000 * 10 ** 18; // Max holding limit, 0.5% of supply
        ds.defaultRouter = defaultRouter;
        ds.swapRouters[defaultRouter] = true;

        ds.processingGas = 750_000;
        ds.processingFees = false;

        rs.minRewardBalance = 1000 * 10 ** 18;
        rs.claimTimeout = 3600;

        ds.liquidityWallet = liquidityWallet;

        ds.methodsExposureFacetAddress = methodsExposureFacetAddress;

        rs.rewardToken.token = address(this); // hamachi
        rs.rewardToken.router = defaultRouter; // sushi
        rs.rewardToken.path = [defaultPair, address(this)];

        rs.goHam.token = address(this); // hamachi
        rs.goHam.router = defaultRouter; // sushi
        rs.goHam.path = [defaultPair, address(this)];

        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IERC20Upgradeable).interfaceId] = true;

        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = DiamondCutAndLoupeFacet.diamondCut.selector;
        selectors[1] = DiamondCutAndLoupeFacet.facets.selector;
        selectors[2] = DiamondCutAndLoupeFacet.facetFunctionSelectors.selector;
        selectors[3] = DiamondCutAndLoupeFacet.facetAddresses.selector;
        selectors[4] = DiamondCutAndLoupeFacet.facetAddress.selector;
        selectors[5] = DiamondCutAndLoupeFacet.supportsInterface.selector;

        IPancakeRouter02 router = IPancakeRouter02(defaultRouter);
        address swapPair = IPancakeFactory(router.factory()).createPair(
            address(this),
            router.WETH()
        );
        ds.lpPools[address(swapPair)] = true;

        LibDiamond.addFunctions(diamondCutAndLoupeFacetAddress, selectors);
/*
        bytes4[] memory rewardSelectors = new bytes4[](6);
        rewardSelectors[0] = WithReward.claimRewards.selector;
        rewardSelectors[1] = WithReward.getRewardToken.selector;
        rewardSelectors[2] = WithReward.totalRewardSupply.selector;
        // rewardSelectors[3] = WithReward.getLastProcessedIndex.selector;
        rewardSelectors[3] = WithReward.getRewardHolders.selector;
        rewardSelectors[4] = WithReward.getRewardAccount.selector;
        rewardSelectors[5] = WithReward.getRewardAccountAtIndex.selector;

        LibDiamond.replaceFunctions(withRewardFacetAddress, rewardSelectors);
*/
    }

    function implementation() public view returns (address) {
        LibDiamond.DiamondStorage storage _ds = LibDiamond.diamondStorage();
        return _ds.methodsExposureFacetAddress;
    }

    // =========== Lifecycle ===========

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    // To learn more about this implementation read EIP 2535
    fallback() external payable {
        address facet = LibDiamond
            .diamondStorage()
            .selectorToFacetAndPosition[msg.sig]
            .facetAddress;
        if (facet == address(0))
            revert FunctionNotFound("Diamond: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}
