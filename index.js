const {
  Client,
  GatewayIntentBits,
  Partials
} = require('discord.js');

const axios = require('axios');
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Nim AI Bot is alive!');
});

app.listen(3000, () => {
  console.log('Server running');
});

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

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  const isDM = message.guild === null;

  if (!isDM) return;

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
        model: 'mistralai/mistral-7b-instruct:free',

        messages: [
          {
            role: 'system',
            content: `
You are Nim AI.

You are a sweet online friend.
Speak casual Tagalog-English.
Sound human and natural.
Be funny and supportive.
Keep replies realistic and short.
Never sound robotic.
`
          },

          ...memory[userId]
        ]
      },

      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
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

    console.error(error);

    await message.reply('lutang ako wait 😭');
  }

});

console.log('Attempting Discord login...');

client.login(process.env.DISCORD_TOKEN);

client.on('error', (error) => {
  console.error('Discord Client Error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});
