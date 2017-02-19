export interface SearchItem {
	id: string | number;
	props: string[];
}

/** Initializing search data set from window thread */
export interface InitializeMessage {
	type: 'initialize';
	items: SearchItem[];
}

/** Search command from window thread */
export interface SearchMessage {
	type: 'search';
	text: string;
}

/** Results of a search to window thread */
export interface SearchResultMessage {
	type: 'search-result';
	ids: (string | number)[];
}


/** Create a blob from this to call the service worker */
export function createMainScript(id: string) {
	return `
	${removeAccents.toString()}
	${SearchWorker.toString()}\n` +
	Object.keys(SearchWorker.prototype)
	.map(key => `SearchWorker.prototype.${key} = ${SearchWorker.prototype[key].toString()};\n`)
	.join('') +
	`(${main.toString()})();
	`;
}

/** This is the main script of the service worker */
function main() {
	let searchWord: string;
	const worker = new SearchWorker();
	const scheduleSearch = () => setTimeout(() => {
		const search = searchWord;
		searchWord = undefined;
		worker.search(search);
	});
	onmessage = (event: MessageEvent) => {
		const msg = <InitializeMessage | SearchMessage>event.data;
		switch (msg.type) {
			case 'initialize':
				worker.initialize(msg.items);
				break;
			case 'search':
				searchWord = msg.text;
				scheduleSearch();
				break;
		}
	};
}

class SearchWorker {
	private items: SearchItem[];

	initialize(items: SearchItem[]) {
		this.items = items;
		for (let item of this.items) {
			item.props = item.props.map(prop => this.transformProperty(prop));
		}
	}

	search(text: string) {
		text = this.transformProperty(text);
		let resultIds = this.items.map(item => this.searchText(item.props, text) ? item.id : undefined)
		.filter(id => id !== undefined);
		(postMessage as any)(<SearchResultMessage>{
			type: 'search-result',
			ids: resultIds,
		});
	}

	private searchText(props: string[], text: string): boolean {
		for (let prop of props) {
			if (prop.indexOf(text) !== -1) {
				return true;
			}
		}
		return false;
	}

	private transformProperty(prop: string): string {
		return removeAccents(prop.toLocaleLowerCase());
	}

}

export function removeAccents(value: string) {
	return value
	.replace(/á/g, 'a')
	.replace(/â/g, 'a')
	.replace(/é/g, 'e')
	.replace(/è/g, 'e')
	.replace(/ê/g, 'e')
	.replace(/í/g, 'i')
	.replace(/ï/g, 'i')
	.replace(/ì/g, 'i')
	.replace(/ó/g, 'o')
	.replace(/ö/g, 'o')
	.replace(/ő/g, 'o')
	.replace(/ô/g, 'o')
	.replace(/ú/g, 'u')
	.replace(/ü/g, 'u')
	.replace(/ű/g, 'u')
	.replace(/ç/g, 'c')
	.replace(/ß/g, 's');
}
