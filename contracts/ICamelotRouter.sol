// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

interface ICamelotRouter {
  function swapExactETHForTokensSupportingFeeOnTransferTokens(
    uint amountOutMin,
    address[] calldata path,
    address to,
    address referrer,
    uint deadline
  ) external payable;
}