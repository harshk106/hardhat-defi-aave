const { ethers, getNamedAccounts, network } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()
    const lendingPool = await getLendingPool(deployer)
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Deposited WETH..")
    //Getting your borrowing stats
    let { availableBorrowEth, totalDebtETH } = await getBorrowUseData(lendingPool, deployer)
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    await borrowDai(
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        amountDaiToBorrowWei,
        deployer,
    )
    await getBorrowUserData(lendingPool, deployer)
    await repay(
        amountDaiToBorrowWei,
        networkConfig[network.config.chainId].daiToken,
        lendingPool,
        deployer,
    )
    await getBorrowUserData(lendingPool, deployer)
}

/** Repay:
 * Handles the process of repaying the borrowed DAI to the lending pool.
 * It approves the spending of DAI, performs the repayment,
 * and prints a success message. */
async function repay(amount, daiAddress, lendingPool, account) {
    await approveerc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Repaid!")
}

/** borrowDai:
 * Handles borrowing DAI from the lending pool.
 * It triggers the borrowing transaction and prints a success message.*/
async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 1, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

/** DaiPrice
 *  Fetches the current price of DAI in terms of
 *  ETH from an external price feed.
 */
async function getDaiPrice() {
    const daiEthpriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed,
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
}

/**approveErc20
 * Approves a specified amount of an ERC20 token for spending by a contract or address.
 */
async function approveErc20(erc20Address, spenderAddress, amount, signer) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer)
    txResponse = await erc20Token.approve(spenderAddress, amount)
    await txResponse.wait(1)
    console.log("Approved!")
}

/** BorrowUserData
 * Fetches user-specific borrowing data from the lending pool.
 * It provides information about collateral, borrowed amount,
 * and available borrowing limit.
 */
async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

/** LendingPool:
 * Fetches the lending pool contract instance from the LendingPoolAddressesProvider using
 * the specific network's configuration.
 */
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account,
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .cathc((error) => {
        console.error(error)
        process.exit(1)
    })
