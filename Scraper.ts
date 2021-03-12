import puppeteer, { Browser, Page } from 'puppeteer';

class Scraper {

    protected _browser?: Browser;
    protected _page?: Page;

    public static async init() {
        return (new this()).init();
    }
    
    public async init() {
        console.log('Starting..');
        
        this._browser = await puppeteer.launch();

        console.log('Started.');

        return this;
    }

    public async search(url: string, waitForSelector: string, selector: string, callback: (elements: Element[], ...args: unknown[]) => any): Promise<[Page|undefined, any]> {
        let page;

        try {
            console.log(`Loading ${url}`);
            
            page = await this.loadPage(url);
    
            console.log('Page loaded.');
    
            console.log(`Waiting for selector "${waitForSelector}"..`);
            await page.waitForSelector(waitForSelector);

            console.log('Done.');

            const response = await page.$$eval(selector, callback);

            return [page, response];
        } catch (e) {
            console.log('Failed.');

            return [page, []];
        }
    }

    public async navigate(url: string, options?: any): Promise<[Page]> {
        const page = await this.loadPage(url, options);
        
        return [page];
    }

    protected async loadPage(url: string, options?: any): Promise<Page> {
        const page: Page = await (this._browser as Browser).newPage();

        await page.goto(url, options);

        this._page = page;

        return page;
    }

}

export default Scraper;