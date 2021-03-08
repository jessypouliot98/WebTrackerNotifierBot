import DiscordJS, { Client } from 'discord.js';

class Discord {

    protected _client: Client;

    public constructor() {
        this._client = new DiscordJS.Client();
    }

    static init() {
        return (new this()).init();
    }

    async init(): Promise<this> {
        return new Promise(resolve => {
            const client = this._client;
    
            client.on('ready', () => {
                console.log(`Logged in as ${client.user?.tag}`);

                resolve(this);
            });
    
            client.login(process.env.DISCORD_TOKEN);
        });
    }

    async send(message: string, channelId: string = process.env.DISCORD_DEFAULT_CHANNEL as string) {
        const channel = await this._client.channels.fetch(channelId) as any;

        await channel.send(message);
    }

}

export default Discord;