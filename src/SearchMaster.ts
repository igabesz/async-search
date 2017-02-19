import {
	InitializeMessage,
	SearchMessage,
	SearchResultMessage,
	SearchItem,
	createMainScript,
} from './SearchWorker';
export {
	SearchItem,
} from './SearchWorker';


export class SearchMaster {
	private worker: Worker;
	private isSearching = false;
	private cancelled = false;
	private nextSearch: string;
	private searchResultsCb: (results: (number | string)[]) => any;

	/** Subscribe for this to receive search results */
	constructor(id: string, searchResultsCb: (results: (number | string)[]) => any) {
		let mainScript = createMainScript(id);
		console.log(mainScript);
		let blob = new Blob([mainScript], { type: 'application/javascript' });
		let url = URL.createObjectURL(blob);
		this.worker = new Worker(url);
		this.worker.onmessage = (event) => this.onSearchResults(event.data);
		this.searchResultsCb = searchResultsCb;
	}

	initialize(items: SearchItem[]) {
		this.worker.postMessage(<InitializeMessage>{ type: 'initialize', items });
	}

	search(text: string) {
		this.cancelled = false;
		if (this.isSearching) {
			this.nextSearch = text;
		}
		else {
			this.sendSearch(text);
		}
	}

	cancel() {
		this.cancelled = true;
		this.nextSearch = undefined;
	}

	private sendSearch(text: string) {
		this.isSearching = true;
		this.worker.postMessage(<SearchMessage>{ type: 'search', text });
	}

	private onSearchResults(result: SearchResultMessage) {
		this.isSearching = false;
		if (this.cancelled) return;
		// Now the results are important
		this.searchResultsCb(result.ids);
		if (this.nextSearch) {
			this.sendSearch(this.nextSearch);
			this.nextSearch = undefined;
		}
	}

}
