const assert = require('assert');
const { expect } = require('chai');
const Bot = require('../bot');
describe('Bot settings tests', () => {
 it('should update state', () => {
       const state = {
		   bestBid: 100,
		   bestAsk: 50,
		   smth: 3
	   }
	   Bot.State.update(state)
	   expect(Bot.State.bestBid).to.equal(state.bestBid)
	   expect(Bot.State.bestAsk).to.equal(state.bestAsk)
	   expect(Bot.State.smth).to.equal(undefined)
	});

	it('should refresh time and clear refresh handler if any', () => {
		Bot.Internals.refreshTimeHandler = 5
		Bot.setRefreshTime(1000)
		expect(Bot.State.refreshTime).to.equal(1000)
		expect(Bot.Internals.refreshTimeHandler).to.equal(undefined)
	});

});

describe('Bot operations', () => {
	it ('bestBidAsk works OK', () => {
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
		const input = [
			[2184.8,2,-0.10855758],
			[2184.3,4,-15.86626],
			[2178.9,2,3.31164],
			[2184.9,2,-7.66074525],
			[2185.6,1,-0.91793],
			[2183.6,2,-7.93216],
			[2182.7,1,-0.92298],
			[2182.9,1,-3.27108132],
			[2185.5,3,-12.49200853],
			[2178.4,1,4.62671846],
			[2178.2,1,0.90648],
			[2181.4,2,0.35945389],
			[2181.3,2,1.94648084],
			[2180,1,2.04434136],
			[2182.3,3,-10.2254833],
			[2180.2,1,4.58519],
			[2182,1,-7.27192195],
			[2182.8,1,-0.04468054],
			[2179.3,1,1.8256],
			[2181.8,1,-4.586],
			[2181.6,4,-11.66721714],
			[2179.7,2,8.78933658],
			[2183.7,1,-3.66955],
			[2183.5,1,-15],
			[2182.2,1,-3.58296326],
			[2182.4,1,-7.16592653],
			[2185.9,1,-0.91829],
			[2179.2,1,3.58298919],
			[2179,2,15.15959511],
			[2180.7,1,1.2851],
			[2180.1,1,3.99680837],
			[2185,1,-1.2524],
			[2184.7,1,-5.3850922],
			[2181.5,1,0.13323649],
			[2181,1,0.79920904],
			[2180.8,1,1.33201506],
			[2179.9,1,5.32806024],
			[2182.1,1,-0.23934582],
			[2178.8,1,0.23934615],
			[2178.7,1,0.95738459],
			[2185.4,1,-12.33208302],
			[2186.6,1,-9.42394508],
			[2180.6,2,3.01203852],
			[2186.9,2,-23.07579108],
			[2178.1,1,0.133],
			[2179.8,1,6.8777],
			[2187.9,1,-23.48],
			[2179.5,2,17],
			[2178,1,11.64711629],
			[2180.4,1,2.66599392]
		]
		Bot.Internals.dataArray['ETH:USDT'] = input
		Bot.bestBidAsk('ETH:USDT')
		expect(Bot.State.bestBid).to.equal(2181.5)
		expect(Bot.State.bestAsk).to.equal(2181.6)
		expect(JSON.stringify(Bot.State.bestBidEntry['ETH:USDT'])).to.equal(JSON.stringify({price: 2181.5, count: 1, amount: 0.13323649}))
		expect(JSON.stringify(Bot.State.bestAskEntry['ETH:USDT'])).to.equal(JSON.stringify({price: 2181.6, count: 4, amount: 11.66721714}))
	})
})

describe('Bot check orders', () => {
	it ('inOrder should work properly', () => {
		Bot.State.update(
			{
				bestBid: 2000,
				bestAsk: 2003,
				pairs: {
					'ETH:USDT': [2, 2000]
				},
				placedBids: {
					'ETH:USDT': [{
						price: 2000,
						amount: 0.5
					}, {
						price: 2000,
						amount: 0.5
					}]
				},
				placedAsks: {
					'ETH:USDT': [{
						price: 2003,
						amount: 1
					}]
				}
			}
		)
		expect(Bot.inOrder('ETH:USDT', 0)).to.equal(2000);
		expect(Bot.inOrder('ETH:USDT', 1)).to.equal(1);
		expect(Bot.inOrder('ETH:USDT', 2)).to.equal(0);

	});
	it ('should properly place bid orders and cancel', () => {
		Bot.State.update(
			{
				bestBid: 2000,
				bestAsk: 2003,
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
		const pairName = 'ETH:USDT'

		expect(Bot.placeOrder(pairName, 0.5, Bot.State.bestBid)).to.be.true;
		expect(Bot.placeOrder(pairName, 0.5, Bot.State.bestBid)).to.be.true;
		expect(Bot.placeOrder(pairName, 0.00001, Bot.State.bestBid * 1)).to.be.false;
		expect(JSON.stringify(Bot.State.placedBids['ETH:USDT'][0])).to.equal(JSON.stringify({price: Bot.State.bestBid, amount: 0.5}));
		expect(JSON.stringify(Bot.State.placedBids['ETH:USDT'][1])).to.equal(JSON.stringify({price: Bot.State.bestBid, amount: 0.5}));
		expect(Bot.cancelOrder(pairName, 0.5, Bot.State.bestBid)).to.be.true;
		expect(Bot.cancelOrder(pairName, 0.5, Bot.State.bestBid)).to.be.true;
		expect(Bot.cancelOrder(pairName, 0.00001, Bot.State.bestBid * 1)).to.be.false;
		expect(Bot.State.placedBids[pairName].length).to.equal(0);
	})
	it ('should properly place ask orders and cancel', () => {
		Bot.State.update(
			{
				bestBid: 2000,
				bestAsk: 2003,
				pairs: {
					'ETH:USDT': [2, 2000]
				},
				placedBids: {
					'ETH:USDT': []
				},
				placedAsks: {
					'ETH:USDT': []
				}
			}
		)
		const pairName = 'ETH:USDT'

		expect(Bot.placeOrder(pairName, -0.5, Bot.State.bestAsk)).to.be.true;
		expect(Bot.placeOrder(pairName, -0.5, Bot.State.bestAsk)).to.be.true;
		expect(Bot.placeOrder(pairName, -1, Bot.State.bestAsk)).to.be.true;
		expect(Bot.placeOrder(pairName, -0.0001, Bot.State.bestAsk)).to.be.false;

		expect(Bot.cancelOrder(pairName, -0.5, Bot.State.bestAsk)).to.be.true;
		expect(Bot.cancelOrder(pairName, -0.5, Bot.State.bestAsk)).to.be.true;
		expect(Bot.cancelOrder(pairName, -1, Bot.State.bestAsk)).to.be.true;
		expect(Bot.cancelOrder(pairName, -0.0001, Bot.State.bestAsk)).to.be.false;
		expect(Bot.State.placedAsks[pairName].length).to.equal(0);
	})
});

describe('Bot balances', () => {
	it ('Should properly refresh bid orders', () => {
		const pairName = 'ETH:USDT'
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
		const input = [
			[2184.8,2,-0.10855758],
			[2184.3,4,-15.86626],
			[2178.9,2,3.31164],
			[2184.9,2,-7.66074525],
			[2185.6,1,-0.91793],
			[2183.6,2,-7.93216],
			[2182.7,1,-0.92298],
			[2182.9,1,-3.27108132],
			[2185.5,3,-12.49200853],
			[2178.4,1,4.62671846],
			[2178.2,1,0.90648],
			[2181.4,2,0.35945389],
			[2181.3,2,1.94648084],
			[2180,1,2.04434136],
			[2182.3,3,-10.2254833],
			[2180.2,1,4.58519],
			[2182,1,-7.27192195],
			[2182.8,1,-0.04468054],
			[2179.3,1,1.8256],
			[2181.8,1,-4.586],
			[2181.6,4,-11.66721714],
			[2179.7,2,8.78933658],
			[2183.7,1,-3.66955],
			[2183.5,1,-15],
			[2182.2,1,-3.58296326],
			[2182.4,1,-7.16592653],
			[2185.9,1,-0.91829],
			[2179.2,1,3.58298919],
			[2179,2,15.15959511],
			[2180.7,1,1.2851],
			[2180.1,1,3.99680837],
			[2185,1,-1.2524],
			[2184.7,1,-5.3850922],
			[2181.5,1,0.13323649],
			[2181,1,0.79920904],
			[2180.8,1,1.33201506],
			[2179.9,1,5.32806024],
			[2182.1,1,-0.23934582],
			[2178.8,1,0.23934615],
			[2178.7,1,0.95738459],
			[2185.4,1,-12.33208302],
			[2186.6,1,-9.42394508],
			[2180.6,2,3.01203852],
			[2186.9,2,-23.07579108],
			[2178.1,1,0.133],
			[2179.8,1,6.8777],
			[2187.9,1,-23.48],
			[2179.5,2,17],
			[2178,1,11.64711629],
			[2180.4,1,2.66599392]
		]
		Bot.Internals.dataArray[pairName] = input
		Bot.bestBidAsk(pairName)
		expect(Bot.State.bestBid).to.equal(2181.5)
		expect(Bot.State.bestAsk).to.equal(2181.6)

		expect(Bot.placeOrder(pairName, 0.02, Bot.State.bestBid * 1.001)).to.be.true;
		expect(Bot.placeOrder(pairName, 0.03, Bot.State.bestBid)).to.be.true;
		Bot.refreshOrders(pairName, Bot.State.placedBids, Bot.State.bestBid, Bot.State.bestBidEntry[pairName], 'BID', (price, bestPrice) => (price >= bestPrice) )
		expect(Bot.State.placedBids[pairName].length).to.equal(0);
		expect(Bot.State.pairs[pairName][0]).to.equal(10.049999999999999)
		expect(Bot.State.pairs[pairName][1]).to.equal(1890.88137)

		expect(Bot.placeOrder(pairName, -0.05, Bot.State.bestAsk)).to.be.true;
		expect(Bot.placeOrder(pairName, -0.045, Bot.State.bestAsk * 0.99)).to.be.true;
		Bot.refreshOrders(pairName, Bot.State.placedAsks, Bot.State.bestAsk, Bot.State.bestAskEntry[pairName], 'ASK', (price, bestPrice) => (price <= bestPrice) )
		expect(Bot.State.placedAsks[pairName].length).to.equal(0);
		expect(Bot.State.pairs[pairName][0]).to.equal(9.954999999999998)
		expect(Bot.State.pairs[pairName][1]).to.equal(2097.15165)
	})
})