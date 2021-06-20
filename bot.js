const WebSocket = require('ws')
const Strategy = require('./strategy')

/*[[2184.8,2,-0.10855758],[2184.3,4,-15.86626],[2178.9,2,3.31164],[2184.9,2,-7.66074525],[2185.6,1,-0.91793],[2183.6,2,-7.93216],[2182.7,1,-0.92298],[2182.9,1,-3.27108132],[2185.5,3,-12.49200853],[2178.4,1,4.62671846],[2178.2,1,0.90648],[2181.4,2,0.35945389],[2181.3,2,1.94648084],[2180,1,2.04434136],[2182.3,3,-10.2254833],[2180.2,1,4.58519],[2182,1,-7.27192195],[2182.8,1,-0.04468054],[2179.3,1,1.8256],[2181.8,1,-4.586],[2181.6,4,-11.66721714],[2179.7,2,8.78933658],[2183.7,1,-3.66955],[2183.5,1,-15],[2182.2,1,-3.58296326],[2182.4,1,-7.16592653],[2185.9,1,-0.91829],[2179.2,1,3.58298919],[2179,2,15.15959511],[2180.7,1,1.2851],[2180.1,1,3.99680837],[2185,1,-1.2524],[2184.7,1,-5.3850922],[2181.5,1,0.13323649],[2181,1,0.79920904],[2180.8,1,1.33201506],[2179.9,1,5.32806024],[2182.1,1,-0.23934582],[2178.8,1,0.23934615],[2178.7,1,0.95738459],[2185.4,1,-12.33208302],[2186.6,1,-9.42394508],[2180.6,2,3.01203852],[2186.9,2,-23.07579108],[2178.1,1,0.133],[2179.8,1,6.8777],[2187.9,1,-23.48],[2179.5,2,17],[2178,1,11.64711629],[2180.4,1,2.66599392]]*/
/*[5646, [[2181.5,2,-0.92059437],[2180.7,5,-12.04744738],[2176.3,2,22.5420409],[2177.2,3,8.25096211],[2176.9,2,7.61673075],[2181.6,1,-0.91502],[2181.4,2,-13.89216],[2176.6,1,1.0259],[2182.2,2,-3.58694457],[2182.9,2,-12.62942],[2183.2,1,-14.55],[2176.5,2,7.93625],[2178.5,1,1.3028],[2177.6,4,15.9914703],[2181.9,1,-1.4],[2176.8,1,7.17164016],[2178.2,3,16.72906409],[2177.1,1,3.58582008],[2184,1,-2.4],[2177.9,1,1.9045],[2181,3,-11.99178375],[2181.2,1,-0.39979719],[2178,1,1.34034015],[2177.5,1,4.62369486],[2177,1,10.60768895],[2177.8,1,1.87647621],[2184.2,1,-20.07549729],[2178.8,1,0.13403402],[2178.7,1,0.26806803],[2178.6,1,0.40210205],[2177.4,1,4.02102045],[2181.1,1,-0.26653146],[2181.8,2,-15.25166503],[2182.4,1,-3.99797186],[2182.6,1,-5.33062914],[2182.8,1,-6.66328643],[2183.5,1,-7.99594372],[2178.9,3,9.78531],[2182,1,-1.8638048],[2179.7,2,2.37989],[2179.3,1,4.58756],[2181.7,1,-1.33110681],[2184.6,1,-9.328601],[2184.8,1,-0.1],[2182.7,1,-1.8598],[2179,1,6.25],[2184.1,1,-10.58746339],[2178.1,2,2.67585379],[2176.1,2,17.4],[2183.9,1,-0.00714016]]]*/

let State = {
	bestBid: -100,
	bestAsk: 100000000,
	bestBidEntry : {},
	bestAskEntry: {},
	placedBids: {},
	placedAsks: {},
	pairs: {},
	refreshTime: 5000, //ms
	update: (state) => {
		for (const key in state) {
			if (State.hasOwnProperty(key) && typeof(State[key]) !== 'function') 
				State[key] = state[key]
		}
	}
}

let orderSide = {
	'BID': 0,
	'ASK': 1
}

let stringOrderSide = {
	0 : 'BID',
	1 : 'ASK'
}

let Internals = {
	refreshTimeHandler: undefined,
	ws: undefined,
	dataArray: {}
}

let printState = () => {
	console.log('BOT DUMP STATE')
	console.log(JSON.stringify(State, null, 3))
}

const inOrder = (pairName, side) => {
	let ret = 0
	if (!hasPair(pairName)) {
		console.error(`No such pair ${pairName}`)
		return -1
	}
	if ( (side === orderSide['BID']) && pairName in State.placedBids) {
		for (const entry of State.placedBids[pairName]) {
			//price, amount
			const { amount, price } = entry
			ret += amount * price
		}
	}
	if ( (side === orderSide['ASK']) && pairName in State.placedAsks) {
		for (const entry of State.placedAsks[pairName]) {
			const { amount } = entry
			ret += amount
		}
	}
	return ret
}

const canPlaceOrder = (pairName, amount, price) => {
	let side = orderSide['BID']  // side = 0 => BID ; side = 1 => ASK
	if (!amount) {
		return false
	}
	if (amount < 0) {
		amount = -1 * amount
		side = orderSide['ASK']
	}

	let pendingAmount = inOrder(pairName, side)
	if (pendingAmount == -1) {
		return false
	}
	let funds = State.pairs[pairName]
	let finalAmount

	if (side == orderSide['BID']) {
		// must have USDT
		finalAmount = funds[orderSide['ASK']] - pendingAmount - (amount * price)
	} else {
		// must have ETH
		finalAmount = funds[orderSide['BID']] - pendingAmount - amount
	}


	// final amount in ETH or USDT available to place an order
//	console.log(`canPlaceOrder, final amount ${finalAmount}, side: ${stringOrderSide[side]}`)

	if (finalAmount < 0) {
		console.error(`placeOrder Insufficient assets to ${stringOrderSide[side]} at this price for pair ${pairName}, amount ${amount}, price ${price}`)
		return false
	}
	console.log(`placeOrder FOR ${stringOrderSide[side]} , amount ${amount}, price ${price}, in order amt: ${pendingAmount}, left amount: ${finalAmount}`)

	
	return true
}


let placeOrder = (pairName, amount, price) => {
	if (!canPlaceOrder(pairName, amount, price)) {
		console.error('BOT CANNOT placeOrder. Other pending orders. Pair ', pairName, ' Amount ', amount, ' => ', amount, ' @ price ', price)
		return false
	}
	if (amount < 0) {
		if (!(pairName in State.placedAsks)) {
			State.placedAsks[pairName] = []
		}
		amount = -1 * amount
		State.placedAsks[pairName].push({price, amount})
		console.log('PLACE ASK @ ' , price, ' amount ', amount)
	} else {
		if (!(pairName in State.placedBids)) {
			State.placedBids[pairName] = []
		}
		State.placedBids[pairName].push({price, amount})
		console.log('PLACE BID @ ' , price, ' amount ', amount)
	}
	return true
}

let bestBidAsk = (pairName) => {
	//arrays of price, count, amount
	let i_bid = -1, i_ask = -1
	const input = Internals.dataArray[pairName]
//	console.log('BestBidAsk input: ', input)
	for (let idx=0; idx < input.length; idx++) {
		const arr = input[idx]
		const price = arr[0]
		const count = arr[1]
		const amount = arr[2]
		if (amount < 0) {
			// lowest price sellers want
			if (price < State.bestAsk) {
				State.bestAsk = price
				i_ask = idx
			}
		} else {
			//highest price buyers would pay
			if (price > State.bestBid) {
				State.bestBid = price
				i_bid = idx
			}
		}
	}
	if (i_bid != -1 && i_ask != -1) {
		if (!(pairName in State.bestBidEntry)) {
			State.bestBidEntry[pairName] = {}
		}
		if (!(pairName in State.bestAskEntry)) {
			State.bestAskEntry[pairName] = {}
		}
		State.bestBidEntry[pairName].price = input[i_bid][0]
		State.bestBidEntry[pairName].count = input[i_bid][1]
		State.bestBidEntry[pairName].amount = input[i_bid][2]

		State.bestAskEntry[pairName].price = input[i_ask][0]
		State.bestAskEntry[pairName].count = input[i_ask][1]
		State.bestAskEntry[pairName].amount = -1 * input[i_ask][2]
	}
	console.log(`bestBidAsk for ${pairName}: BID ${State.bestBid}, ASK ${State.bestAsk}`)
}


let cancelOrder = (pairName, amount, price) => {
	if (!hasPair(pairName)) {
		return false
	}
	let found_idx = -1
	if (amount < 0) {
		for (let idx = 0; idx < State.placedAsks[pairName].length; idx++) {
			if (State.placedAsks[pairName][idx].price == price && State.placedAsks[pairName][idx].amount == -1 * amount) {
				found_idx = idx
				break
			}
		}
	} else if (amount > 0) {
		for (let idx = 0; idx < State.placedBids[pairName].length; idx++) {
			if (State.placedBids[pairName][idx].price == price && State.placedBids[pairName][idx].amount == amount) {
				found_idx = idx
				break
			}
		}
	}

	if (found_idx < 0) {
		return false
	}
	if (amount < 0) {
		State.placedAsks[pairName].splice(found_idx, 1)
	} else {
		State.placedBids[pairName].splice(found_idx, 1)
	}
	return true
}

let refreshOrders = (pairName, orders, bestPrice, bestPriceEntry, side, priceChecker) => {
	let del_index = []
	
	for (let idx=0; idx < orders[pairName].length; idx++) {
		if (priceChecker(orders[pairName][idx].price, bestPrice)) { 
		
			if (side == 'BID') {
				State.pairs[pairName][orderSide['BID']] += orders[pairName][idx].amount
				State.pairs[pairName][orderSide['ASK']] -= orders[pairName][idx].amount * orders[pairName][idx].price
			} else if (side == 'ASK') {
				State.pairs[pairName][orderSide['BID']] -= orders[pairName][idx].amount
				State.pairs[pairName][orderSide['ASK']] += orders[pairName][idx].amount * orders[pairName][idx].price
			}
			if (bestPriceEntry.amount >= orders[pairName][idx].amount) {
				//OK to delete
				console.log(`FILLED ${side} @ PRICE ${orders[pairName][idx].price}, AMOUNT ${orders[pairName][idx].amount}`)
				del_index.push(idx)				
			} else {
				console.log(`PARTIALLY FILLED ${side} @ PRICE ${orders[pairName][idx].price}, AMOUNT ${orders[pairName][idx].amount}`)
				orders[pairName][idx].amount -= bestPriceEntry.amount
			}
		}
	}
	for (let idx=del_index.length-1; idx >=0; idx--) {
		orders[pairName].splice(del_index[idx],1)
	}
}

let refreshBalances = (pairName) => {
	if (!hasPair(pairName)) {
		return false
	}
	console.log(`refreshBalances for pair ${pairName}`)

	//BID
	refreshOrders(pairName, State.placedBids, State.bestBid, State.bestBidEntry[pairName], 'BID', (price, bestPrice) => (price >= bestPrice) )
	//ASK
	refreshOrders(pairName, State.placedAsks, State.bestAsk, State.bestAskEntry[pairName], 'ASK', (price, bestPrice) => (price <= bestPrice) )
	
	return true
}	

let hasPair = (pairName)=> pairName in State.pairs && State.pairs[pairName]

let setRefreshTime = (ms) => {
	if (ms < 0) {
		ms = 1000
	}
	if (Internals.refreshTimeHandler) {
		console.log('Clearing previous refresh time handler')
		clearInterval(Internals.refreshTimeHandler)
		Internals.refreshTimeHandler = undefined
	}
	console.log('Bot updating every ', ms)
	State.update({
		refreshTime: ms
	})
}

let subscribe = (url, pairName) => {
	console.log('Subscribe to URL ', url)
	Internals.ws = new WebSocket(url)
  	let lastReceived = 0

	Internals.ws.on('message', (msg) => {
		//console.log('Received dif: ', (Date.now() - lastReceived), ' ', msg)
		let data = JSON.parse(msg)
		if (!Array.isArray(data)) {
			return;
		}
		lastReceived = Date.now()
		data = data[1]
		Internals.dataArray[pairName] = data
		if (State.bestBid < 0 || State.bestAsk < 0) {
			bestBidAsk(pairName)
		}

		if (!Internals.refreshTimeHandler) {
			if (State.refreshTime > 0) {
				Internals.refreshTimeHandler = setInterval(
					() => {
						console.log('BOT refreshtimeHandler')
						bestBidAsk(pairName)
						refreshBalances(pairName)
					}, 
					State.refreshTime
				)
			}  else {
				bestBidAsk(pairName)
			}
		}
	})

  const subscribeBookMsg = JSON.stringify({
    "event": "subscribe",
    "channel": "book",
	"frequency": "F0",
    "symbol": pairName
  }) 

  Internals.ws.on('open', () => {
	  console.log('Opening websocket')
	  Internals.ws.send(subscribeBookMsg)
  })

}

let closeConnection = () => Internals.ws && Internals.ws.close()

module.exports = {
	State,
	printState,
	bestBidAsk,
	printState,
	placeOrder,
	refreshOrders,
	refreshBalances,
	cancelOrder,
	inOrder,
	canPlaceOrder,
	hasPair,
	Internals,
	setRefreshTime,
	closeConnection,
	subscribe
}