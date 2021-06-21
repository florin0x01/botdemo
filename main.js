const Strategy = require('./strategy')
const Bot = require('./bot')

Bot.State.update(
	{
		bestBid: -100,
		bestAsk: 100000000,
		refreshTime: 5000, //ms
		pairs: {
			'ETH:USDT': [10, 2000]
		},
		placedBids: {
			'ETH:USDT': []
		},
		placedAsks: {
			'ETH:USDT': []
		}
	}
)
Bot.setRefreshTime(5 * 1000)
Bot.subscribe('https://api.deversifi.com/market-data/ws', 'ETH:USDT')
Strategy.buyLowSellHigh()

setInterval(Bot.printState, 30 * 1000)
