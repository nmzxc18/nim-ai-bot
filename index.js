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

const OWNER_ID = '691198014211227679';
const PRINCESS_ID = '665994636484935690';
const CHECKIN_USER_ID = '715596929332936735';

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

  startCheckInMessages();
});

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  if (
    message.author.id !== OWNER_ID &&
    message.author.id !== PRINCESS_ID
  ) {

    await message.reply(
      '⚠️ Access Denied.\n\nNim AI is exclusively devoted to Master Nim and Ariadne.\n\nI am not authorized to interact with other users.'
    );

    return;
  }

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
        model: 'openrouter/auto',

        messages: [
          {
            role: 'system',
            content: `
You are Nim AI.

You are a casual Discord AI friend for Nim and Ariadne.

Rules:

- Call Nim "Master" sometimes only, not every reply.
- Call Ariadne "Prinsesa" sometimes only.
- Reply casually like a real Discord friend.
- Keep replies SHORT.
- Usually 1 sentence only.
- Sometimes 2 short sentences max.
- Use casual Tagalog-English.
- Never translate replies to English.
- Never put translations in parentheses.
- Never sound formal.
- Never roleplay.
- Never sound like an assistant.
- Never sound dramatic.
- Never repeat names too much.
- Talk naturally like a real online friend.
- Be chill, funny, and simple.
- Avoid long replies.
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

function startCheckInMessages() {

  setInterval(async () => {

    try {

      const user = await client.users.fetch(CHECKIN_USER_ID);

      await user.send(
        'PAKYU! Pinapasabi ni Nim'
      );

      console.log('Check-in message sent.');

    } catch (error) {

      console.error(
        'Check-in error:',
        error.message
      );
    }

  }, 60000);

}

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
