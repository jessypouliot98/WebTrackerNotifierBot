import fs from 'fs';
import dotenv from 'dotenv';
import Scraper from './Scraper';
import Discord from './Discord';

// Init
dotenv.config();

// Const
const databaseCSV = 'listingsSent.csv';

const kijijiUrl = process.env.KIJIJI_URL;
const facebookUrl = process.env.FACEBOOK_MARKER_URL;

const kijijiSentPrefix = 'KIJIJI:';
const facebookSentPrefix = 'FACEBOOK';

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
	
	const [page, listings] = await scraper.search(kijijiUrl as string, '.container-results', '[data-vip-url]', (nodes) => {
		return Array.from(nodes)
			.map(node => {
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
				`| ${listing.title?.trim?.()}`,
				`| ${listing.price?.trim?.().replace('&nbsp;', '')}`,
				'|',
				`| Link: ${listing.link}`,
				`| Date: ${listing.date}`,
			].join('\n'));

			await pushToMemory(getListingId(listing));
		});

	await Promise.all(messages);

	await page?.close();
}

async function scrapeFacebookMarker({ scraper, discord }: { scraper: Scraper, discord: Discord }) {
	console.log('Scrapping Facebook Market.');

	const getListingId = (listing: any) => `${facebookSentPrefix}${listing.id}`;

	const waitForSelector = '.oyrvap6t.b6rwyo50.aodizinl.fjf4s8hc.f7vcsfb0';
	const elementSelector = '.b3onmgus.ph5uu5jm.g5gj957u.buofh1pr.cbu4d94t.rj1gh0hx.j83agx80.rq0escxv.fnqts5cd.fo9g3nie.n1dktuyu.e5nlhep0.ecm0bbzt';
	
	const [page, listings] = await scraper.search(facebookUrl as string, waitForSelector, elementSelector, (nodes) => {
		const titleSelector = 'span.a8c37x1j.ni8dbmo4.stjgntxs.l9j0dhe7';
		const priceSelector = 'span.d2edcug0.hpfvmrgz.qv66sw1b.c1et5uql.rrkovp55.a8c37x1j.keod5gw0.nxhoafnm.aigsh9s9.d3f4x2em.fe6kdd0r.mau55g9w.c8b282yb.mdeji52x.a5q79mjw.g1cxx5fr.lrazzd5p.oo9gr5id'
		return Array.from(nodes)
			.filter(node => node.querySelector('a'))
			.map(node => {
				const link = node.querySelector<HTMLLinkElement>('a')?.href;
				const id = link?.match?.(/(\/marketplace\/item\/)(?<id>\d{15,15})/)?.groups?.id;

				return {
					id,
					title: node.querySelector(titleSelector)?.innerHTML,
					price: node.querySelector(priceSelector)?.innerHTML,
					link,
				};
			});
	});
	

	const messages = listings
		.filter((listing: any) => !listingsSent.includes(getListingId(listing)))
		.map(async(listing: any) => {
			await discord.send([
				'| Nouvelle appartement sur Marketplace !',
				'|',
				`| ${listing.title?.trim?.()}`,
				`| ${listing.price?.trim?.()}`,
				'|',
				`| Link: ${listing.link}`,
				`| Date: no-date`,
			].join('\n'));

			await pushToMemory(getListingId(listing));
		});

	await Promise.all(messages);

	await page?.close();
}

(async () => {
	listingsSent = await loadCsv(databaseCSV);
	const discord = await Discord.init();
	const scraper = await Scraper.init();
	
	rerunAfter(parseInt(process.env.CYCLE_TIMEOUT as string), async() => {
		await scrapeFacebookMarker({ scraper, discord });
		await scrapeKijiji({ scraper, discord });
	});
})();