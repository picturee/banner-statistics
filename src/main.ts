import { Client, GatewayIntentBits, Partials, ChannelType } from 'discord.js';
import type { GuildMember, GuildBasedChannel, TextChannel, Message, Collection, VoiceChannel, Activity } from 'discord.js';

import { DateTime } from 'luxon';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fetch from 'node-fetch';
import { Readable } from 'stream';

registerFont('./assest/fonts/status.ttf', { family: 'Status' });
registerFont('./assest/fonts/ofont.ru_Montserrat.ttf', { family: 'Montserrat' });
registerFont('./assest/fonts/name.ttf', { family: 'Name' });

const client: Client = new Client({
    intents: Object.keys(GatewayIntentBits) as [],
    partials: Object.keys(Partials) as []
});

client.on('ready', () => {
    console.log(`[INFORMATION] - Bot ${client.user?.username} Successfully launched`);
    bannerUpdate();
});

const bannerUpdate = async (): Promise<void> => {
    const two_hours_ago = DateTime.utc().minus({ hours: 2 });
    const guild = await client.guilds.fetch('GuildId');
    const message_count = new Map<GuildMember, number>();

    guild.channels.cache.forEach(async (channel: GuildBasedChannel) => {
        if (channel.isTextBased()) {
            const messages: Collection<string, Message<true>> = await (channel as TextChannel).messages.fetch({ after: two_hours_ago });
            await Promise.all(messages.map((message) => {
                if (message.author && !message.author.bot) {
                    const member = guild.members.cache.get(message.author.id);
                    if (member) {
                        const count: number = message_count.get(member) || 0;
                        message_count.set(member, count + 1);
                    };
                };
            }));
        };
    });
    const mostActiveMember: GuildMember = [...message_count.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const activity: Activity | undefined = mostActiveMember.presence?.activities[0];

    const voiceChannels: Collection<string, VoiceChannel> = guild.channels.cache.filter((channel: GuildBasedChannel) => channel.type === ChannelType.GuildVoice) as Collection<string, VoiceChannel>;
    const voiceUsers: number = voiceChannels.reduce((acc: number, vc: VoiceChannel) =>  acc + (vc.members? vc.members.size : 0), 0);

    const banner = createCanvas(3000, 4000);
    const ctx = banner.getContext('2d');

    loadImage('banner.png').then((image) => {
        ctx.drawImage(image, 0, 0);
        ctx.font = '64px Montserrat';
        ctx.fillStyle = 'grey';

        const text: string = activity ? activity.name.substring(0, 20) : 'Статус не задан'; // # Здесь мы используем тенарный оператор
        ctx.fillText(text, 615, 777);

        ctx.font = '107px Montserrat';
        ctx.fillStyle = 'white';
        ctx.font = voiceUsers < 10 ? '80px Montserrat' : '120px Montserrat';
        ctx.fillText(voiceUsers.toString(), voiceUsers < 10 ? 1608 : 2568, voiceUsers < 10 ? 807 : 2750);

        ctx.font = '65px Name';
        ctx.fillText(DateTime.now().setZone('Europe/Moscow').toFormat('HH:mm'), 1364, 150);

        fetch(mostActiveMember.user.displayAvatarURL({ extension: 'png', size: 128 }))
            .then((res) => res.buffer())
            .then(async (buffer) => {
            const avatar = await loadImage(buffer);
                ctx.save();
                ctx.beginPath();
                ctx.arc(227 + 160, 601 + 160, 160, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 227, 601, 320, 320);
                ctx.restore();

                const stream = banner.createPNGStream();
                const attachment = new Readable();
                attachment.push(stream.read());
                attachment.push(null);

            return guild.setIcon(attachment.read());
        });
    });
};
client.login('Your Token');