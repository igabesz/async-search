import { SearchMaster, SearchItem } from '../lib/index';
var assert = chai.assert;

let master: SearchMaster;
let results: string[];
let waitCallback: Function;

function receiveResults(res: string[]) {
	results = res;
	if (waitCallback) {
		waitCallback(res);
	}
}

function createItems(cnt: number) {
	let items: SearchItem[] = [];
	for (let i=0; i<cnt; i++) {
		items.push({
			id: i,
			props: [
				`row-1.item-${i}.${Math.random()}`,
				`row-2.item-${i}.${Math.random()}`,
			],
		});
	}
	return items;
}

describe('Search', () => {
	let errFunc: Function;
	let errorCalled = false;

	before(() => {
		errFunc = console.error;
		console.error = (...params) => { errorCalled = true; errFunc.call(console, params); };
	});

	it('can be instantiated', () => {
		master = new SearchMaster('test', receiveResults);
	});

	it('can be initialized', () => {
		let items = createItems(100);
		master.initialize(items);
	});

	it('can search', async () => {
		master.search('row-1.item-10.');
		await new Promise(res => waitCallback = res);
		assert.isArray(results);
		assert.equal(results.length, 1);
	});

	it('skips unnecessary searches', async () => {
		let firstDone = false;
		let secondDone = false;
		let thirdDone = false;
		waitCallback = (res) => {
			if (res.length === 1) firstDone = true;
			if (res.length === 100) secondDone = true;
			if (res.length === 11) thirdDone = true;
		};
		master.search('row-2.item-1.'); // 1 hit
		master.search('row-2'); // 100 hits
		master.search('row-2.item-1'); // 1, 10..19 --> 11 hits
		await new Promise(res => setTimeout(res, 100));
		assert.ok(firstDone, 'The 1st search must be started independenty from any other searches');
		assert.notOk(secondDone, 'The 2nd search shouldn\'t start immediately; it should be overwritten by the 3rd search');
		assert.ok(thirdDone, 'The 3rd searh must be completed as it is the last one');
	});

	it('can be cancelled', async () => {
		let done = false;
		waitCallback = () => done = true;
		master.search('row-2.item-1.'); // 1 hit
		master.cancel();
		await new Promise(res => setTimeout(res, 100));
		assert.notOk(done, 'Cancelled search should not return');
	});

	it('is case insensitive', async () => {
		master.search('RoW-1.ItEm-1.'); // 1 hit
		await new Promise(res => waitCallback = (searchResults: any[]) => {
			if (searchResults.length === 1) return res();
			else assert.fail('This should have 1 results, now it has ' + searchResults.length);
		});
	});

	it('is accent insensitive', async () => {
		master.search('rŐw-1.Ítém-1.'); // 1 hit
		await new Promise(res => waitCallback = (searchResults: any[]) => {
			if (searchResults.length === 1) return res();
			else assert.fail('This should have 1 results, now it has ' + searchResults.length);
		});
	});

	afterEach(done => {
		results = undefined;
		waitCallback = undefined;
		setTimeout(() => {
			if (errorCalled) {
				assert.fail('There was an unexpected error, see console log');
			}
			else done();
		}, 100);
	});
});
