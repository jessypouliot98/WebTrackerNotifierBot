import fs from 'fs';
import dotenv from 'dotenv';
import Scraper from './Scraper';
import Discord from './Discord';

// Init
dotenv.config();

// Const
const databaseCSV = 'listingsSent.csv';
const kijijiUrl = process.env.KIJIJI_URL;
const kijijiSentPrefix = 'KIJIJI:';

// Vars
let listingsSent: string[] = [];

async function pushToMemory(listingId: string) {
	return new Promise<void>(resolve => {
		listingsSent.push(listingId);

		fs.appendFile(databaseCSV, `${listingId},`, (err) => {
			if (err) {
				throw err;
			}

			resolve();
		});
	});
}

async function loadCsv(file: string) {
	return new Promise<string[]>(resolve => {
		fs.readFile(file, 'utf8' , (err, data) => {
			if (err) {
				throw err;
			}
			
			resolve(data.split(','));
		});
	});
}

async function rerunAfter(seconds: number, callback: () => Promise<void>) {
	const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
	
	await callback();
	await wait(seconds * 1000);

	rerunAfter(seconds, callback);
}

async function scrapeKijiji({ scraper, discord }: { scraper: Scraper, discord: Discord }) {
	console.log('Scrapping Kijiji.');

	const getListingId = (listing: any) => `${kijijiSentPrefix}${listing.id}`;
	
	const listings = await scraper.search(kijijiUrl as string, 'body', '[data-vip-url]', (nodes, abc) => {
		return Array.from(nodes).map(node => {
			return {
				id: node.getAttribute('data-listing-id'),
				title: node.querySelector('a.title')?.innerHTML,
				price: node.querySelector('.price')?.innerHTML,
				link: `https://www.kijiji.ca${node.getAttribute('data-vip-url')}`,
				date: node.querySelector('.date-posted')?.innerHTML,
			};
		});
	});

	const messages = listings
		.filter((listing: any) => !listingsSent.includes(getListingId(listing)))
		.map(async(listing: any) => {
			await discord.send([
				'| Nouvelle appartement sur Kijiji !',
				'|',
				`| ${listing.title?.trim()}`,
				`| ${listing.price?.trim().replace('&nbsp;', '')}`,
				'|',
				`| Link: ${listing.link}`,
				`| Date: ${listing.date}`,
			].join('\n'));

			await pushToMemory(getListingId(listing));
		});

	await Promise.all(messages);
}

(async () => {
	listingsSent = await loadCsv(databaseCSV);
	const discord = await Discord.init();
	const scraper = await Scraper.init();
	
	rerunAfter(parseInt(process.env.CYCLE_TIMEOUT as string), async() => {
		await scrapeKijiji({ scraper, discord });
	});
})();