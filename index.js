const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// استدعاء نظام التفعيل والأنظمة الأخرى
require('./systems/auth')(client);

client.once('ready', () => {
    console.log(`✅ البوت شغال يا داهوم! تم تفعيل الأنظمة باسم: ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);
