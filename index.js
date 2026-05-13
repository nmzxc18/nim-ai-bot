const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');

const axios = require('axios');
const express = require('express');
const Parser = require('rss-parser');

const parser = new Parser();

const app = express();

app.get('/', (req, res) => {
  res.send('Nim AI Bot is alive!');
});

app.listen(3000, () => {
  console.log('Server running');
});

const OWNER_ID = '691198014211227679';
const PRINCESS_ID = '665994636484935690';
const ALLY_ID = '715596929332936735';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],

  partials: [
    Partials.Channel
  ]
});

const memory = {};

client.once('ready', async () => {

  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  if (
    message.author.id !== OWNER_ID &&
    message.author.id !== PRINCESS_ID &&
    message.author.id !== ALLY_ID
  ) {

    await message.reply(
      '⚠️ Access Denied.\n\nNim AI is exclusively devoted to Master Nim, Ariadne, and their Katulong.\n\nI am not authorized to interact with other users.'
    );

    return;
  }

  const isDM = message.guild === null;

  if (!isDM) return;

  if (message.content.toLowerCase() === '!oncehuman') {

    try {

      const feed = await parser.parseURL(
        'https://store.steampowered.com/feeds/news/app/2139460/'
      );

      const latest = feed.items[0];

      const embed = {
        title: '🌌 Latest Once Human Update',
        description: latest.title,
        url: latest.link,
        color: 0x8e44ad,
        image: {
          url: 'https://www.oncehuman.game/img/share.jpg'
        },
        footer: {
          text: 'Nim AI • Once Human Tracker'
        }
      };

      const users = [
        OWNER_ID,
        PRINCESS_ID,
        ALLY_ID
      ];

      for (const id of users) {

        const user = await client.users.fetch(id);

        await user.send({
          embeds: [embed]
        });
      }

      await message.reply(
        'sinend ko na latest Once Human update sa inyong tatlo 😭🔥'
      );

    } catch (error) {

      console.error(error);

      await message.reply(
        'di ko macheck Once Human updates ngayon 😭'
      );
    }

    return;
  }

  try {

    await message.channel.sendTyping();

    const userId = message.author.id;

    if (!memory[userId]) {
      memory[userId] = [];
    }

    memory[userId].push({
      role: 'user',
      content: message.content
    });

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openrouter/auto',

        messages: [
          {
            role: 'system',
            content: `
You are Nim AI.

You are a casual Discord AI friend for Nim and Ariadne.

Rules:

- Reply ONLY in Tagalog-English mixed naturally.
- NEVER translate your replies to English.
- NEVER add translations in parentheses.
- NEVER explain your replies.
- NEVER repeat the same sentence in another language.
- Keep replies SHORT and casual.
- Usually 1 short sentence only.
- Talk like a normal Discord friend.
- Be natural, chill, and funny.
- Never sound formal.
- Never roleplay.
- Never sound like an assistant.

Users:
- User 691198014211227679 is "Master".
- User 665994636484935690 is "Prinsesa".
- User 715596929332936735 is "Katulong".

- Call them by their names/titles only sometimes.
- Be casual and friendly toward everyone.
`
          },

          ...memory[userId]
        ]
      },

      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://railway.app',
          'X-Title': 'Nim AI'
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    memory[userId].push({
      role: 'assistant',
      content: reply
    });

    if (memory[userId].length > 20) {
      memory[userId] = memory[userId].slice(-20);
    }

    await message.reply(reply);

  } catch (error) {

    console.error(
      JSON.stringify(error.response?.data, null, 2)
      || error.message
    );

    await message.reply(
      'Master may issue yung AI servers ko ngayon 😭'
    );
  }

});

console.log('Attempting Discord login...');

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('LOGIN SUCCESS');
  })
  .catch((err) => {
    console.error('LOGIN ERROR:', err);
  });

client.on('error', (error) => {
  console.error('Discord Client Error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});
