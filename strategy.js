const Bot = require('./bot')

const buyLowSellHigh = () => {
	const pairName = 'ETH:USDT'
	if (!Bot.hasPair(pairName)) {
		return false
	}
	
	const funds = Bot.State.pairs[pairName]
	
	let handle = setInterval(() => {
		let bestBid = Bot.State.bestBid
		let bestAsk = Bot.State.bestAsk
	
		if (bestBid <= 0 || bestAsk <= 0) {
			console.log('BuyLowSellHigh no data yet')
			return
		}

		if (Bot.State.pairs[1] > 8000 || Bot.State.pairs[0] > 20) {
			console.log('buyLowSellHigh finished')
			Bot.closeConnection()
			clearInterval(handle)
		}

		if (Bot.State.placedBids[pairName].length < 15) {
			Bot.placeOrder(pairName, funds[0] * 0.005, bestBid * 0.987)
			Bot.placeOrder(pairName, funds[0] * 0.01, bestBid * 0.98)
			Bot.placeOrder(pairName, funds[0] * 0.01, bestBid * 0.988)
			Bot.placeOrder(pairName, funds[0] * 0.008, bestBid * 0.990)
			Bot.placeOrder(pairName, funds[0] * 0.093, bestBid * 0.998)
		} else {
			console.log('buyLowSellHigh max bids of 15 placed')
		}
		//asking a bit over the best ask price within 5%
		if (Bot.State.placedAsks[pairName].length < 15) {
			Bot.placeOrder(pairName, -funds[0] * 0.005, bestAsk * 1.001)
			Bot.placeOrder(pairName, -funds[0] * 0.01, bestBid * 1.005)
			Bot.placeOrder(pairName, -funds[0] * 0.01, bestBid * 1.01)
			Bot.placeOrder(pairName, -funds[0] * 0.008, bestBid * 1.003)
			Bot.placeOrder(pairName, -funds[0] * 0.093, bestBid * 1.01)
		} else {
			console.log('buyLowSellHigh max asks of 15 placed')
		}
	}, Bot.State.refreshTime + 50)
}

module.exports = {
	buyLowSellHigh
}